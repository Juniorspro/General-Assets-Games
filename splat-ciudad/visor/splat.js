/* Rasterizador de gaussianas 3D en WebGL2, sin librerías.
 *
 * Cada gaussiana es un elipsoide con centro, covarianza y color. Para
 * dibujarla se proyecta la covarianza 3D a una elipse en pantalla, se emite un
 * cuadrado que la cubre y el fragmento evalúa la campana. Como son
 * translúcidas y no hay test de profundidad, el orden importa: hay que
 * pintarlas de la más lejana a la más cercana, y ese orden cambia con la
 * cámara. Ordenar 160.000 números con sort() son ~20 ms por cuadro, así que se
 * ordena por conteo sobre la profundidad cuantizada a 16 bits —lineal en vez
 * de n log n— y en un worker, para no frenar el dibujo.
 */

export const CUANTOS = (bytes) => Math.floor(bytes / 32);

/* --- el formato .splat: 32 bytes por gaussiana ---
   3 float32 posición · 3 float32 escala lineal · 4 bytes RGBA ·
   4 bytes cuaternión (w,x,y,z) mapeado de [-1,1] a [0,255]           */
export function empaquetar(buf, maxTex = 16384){
  const n = CUANTOS(buf.byteLength);
  const f = new Float32Array(buf), b = new Uint8Array(buf);

  // Dos texeles RGBA32UI por gaussiana. El ancho se elige tan chico como se
  // pueda y se duplica hasta que la nube entre en el alto que admite la placa:
  // con 2.048 de ancho el techo eran 16,7 millones de gaussianas y una nube de
  // treinta y pico no entraba. El shader recibe la máscara y el corrimiento,
  // así que no hay nada cableado.
  let ancho = 2048;
  while (Math.ceil((2 * n) / ancho) > maxTex && ancho < maxTex) ancho *= 2;
  const alto = Math.ceil((2 * n) / ancho);
  const porFila = ancho >> 1;
  const mascara = porFila - 1, corr = Math.round(Math.log2(porFila));
  const datos = new Uint32Array(ancho * alto * 4);
  const datosF = new Float32Array(datos.buffer);
  const datosB = new Uint8Array(datos.buffer);

  const centro = [0, 0, 0];
  const caja = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  // el worker sólo necesita las posiciones: mandarle los 32 bytes de cada
  // gaussiana son 234 MB a siete millones, y la clave de orden usa 12
  const pos = new Float32Array(3 * n);

  for (let i = 0; i < n; i++) {
    const x = f[8*i+0], y = f[8*i+1], z = f[8*i+2];
    datosF[8*i+0] = x; datosF[8*i+1] = y; datosF[8*i+2] = z;
    pos[3*i] = x; pos[3*i+1] = y; pos[3*i+2] = z;
    centro[0] += x; centro[1] += y; centro[2] += z;
    if (x < caja[0]) caja[0] = x; if (y < caja[1]) caja[1] = y; if (z < caja[2]) caja[2] = z;
    if (x > caja[3]) caja[3] = x; if (y > caja[4]) caja[4] = y; if (z > caja[5]) caja[5] = z;

    datosB[4*(8*i+7)+0] = b[32*i+24];
    datosB[4*(8*i+7)+1] = b[32*i+25];
    datosB[4*(8*i+7)+2] = b[32*i+26];
    datosB[4*(8*i+7)+3] = b[32*i+27];

    // cuaternión -> matriz de rotación
    const qw = (b[32*i+28] - 128) / 128, qx = (b[32*i+29] - 128) / 128;
    const qy = (b[32*i+30] - 128) / 128, qz = (b[32*i+31] - 128) / 128;
    const R = [
      1 - 2*(qy*qy + qz*qz), 2*(qx*qy - qw*qz),     2*(qx*qz + qw*qy),
      2*(qx*qy + qw*qz),     1 - 2*(qx*qx + qz*qz), 2*(qy*qz - qw*qx),
      2*(qx*qz - qw*qy),     2*(qy*qz + qw*qx),     1 - 2*(qx*qx + qy*qy),
    ];
    const S = [f[8*i+3], f[8*i+4], f[8*i+5]];
    // M = S · Rᵗ  →  Σ = Mᵗ M, que es R S² Rᵗ
    const M = [
      R[0]*S[0], R[1]*S[0], R[2]*S[0],
      R[3]*S[1], R[4]*S[1], R[5]*S[1],
      R[6]*S[2], R[7]*S[2], R[8]*S[2],
    ];
    // sólo hacen falta las 6 componentes distintas, en medio float
    const s = [
      M[0]*M[0] + M[3]*M[3] + M[6]*M[6],
      M[0]*M[1] + M[3]*M[4] + M[6]*M[7],
      M[0]*M[2] + M[3]*M[5] + M[6]*M[8],
      M[1]*M[1] + M[4]*M[4] + M[7]*M[7],
      M[1]*M[2] + M[4]*M[5] + M[7]*M[8],
      M[2]*M[2] + M[5]*M[5] + M[8]*M[8],
    ];
    datos[8*i+4] = medio2(4*s[0], 4*s[1]);
    datos[8*i+5] = medio2(4*s[2], 4*s[3]);
    datos[8*i+6] = medio2(4*s[4], 4*s[5]);
  }
  return { n, datos, pos, ancho, alto, mascara, corr,
           centro: centro.map((v) => v / n), caja };
}

/* dos float a medio precisión metidos en un uint32, como packHalf2x16 */
const _vf = new Float32Array(1), _vi = new Int32Array(_vf.buffer);
function medio(v){
  _vf[0] = v;
  const x = _vi[0];
  let bits = (x >> 16) & 0x8000;
  let m = (x >> 12) & 0x07ff;
  const e = (x >> 23) & 0xff;
  if (e < 103) return bits;
  if (e > 142) { bits |= 0x7c00; bits |= (e === 255 ? 0 : 1) && (x & 0x007fffff); return bits; }
  if (e < 113) { m |= 0x0800; bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1); return bits; }
  bits |= ((e - 112) << 10) | (m >> 1);
  bits += m & 1;
  return bits;
}
const medio2 = (a, b) => (medio(b) << 16) | medio(a);


/* ------------------------------------------------------------------ .splz
   El mismo contenido que un .splat pero cuantizado y en columnas: posiciones
   en 16 bits dentro de la caja de su bloque y guardadas como diferencia con la
   anterior, escalas en logaritmo de 8 bits, y todo separado por columna en vez
   de intercalado. Pesa un 40 % menos comprimido. Acá se vuelve a armar el
   .splat de 32 bytes, así que de la textura para adentro no cambia nada.
   El formato lo escribe splz.py. */
export function esSplz(buf){
  if (buf.byteLength < 24) return false;
  const u = new Uint8Array(buf, 0, 5);
  return u[0] === 83 && u[1] === 80 && u[2] === 76 && u[3] === 90 && u[4] === 50;
}

export function desplz(buf){
  const dv = new DataView(buf);
  const n = dv.getUint32(8, true), blo = dv.getUint32(12, true);
  const l0 = dv.getFloat32(16, true), l1 = dv.getFloat32(20, true);
  const nb = Math.ceil(n/blo), N = nb*blo;
  let o = 24;
  const lo = new Float32Array(buf.slice(o, o + nb*12)); o += nb*12;
  const ext = new Float32Array(buf.slice(o, o + nb*12)); o += nb*12;
  const u8 = new Uint8Array(buf);
  const alto = [o, o + N, o + 2*N], bajo = [o + 3*N, o + 4*N, o + 5*N];
  o += 6*N;
  const esc = [o, o + N, o + 2*N]; o += 3*N;
  const res = [o, o + N, o + 2*N, o + 3*N, o + 4*N, o + 5*N, o + 6*N, o + 7*N];

  // la escala son 256 valores posibles: se calculan una vez y no 3n veces
  const tabla = new Float32Array(256);
  for (let i = 0; i < 256; i++) tabla[i] = Math.pow(2, l0 + i*(l1 - l0)/255);

  const out = new ArrayBuffer(n*32);
  const f = new Float32Array(out), b = new Uint8Array(out);
  for (let blk = 0; blk < nb; blk++){
    const base = blk*blo, tope = Math.min(blo, n - base);
    for (let k = 0; k < 3; k++){
      const l = lo[blk*3 + k], s = ext[blk*3 + k]/65535;
      const ha = alto[k], ba = bajo[k];
      let acc = 0;
      for (let j = 0; j < blo; j++){
        const i = base + j;
        acc = (acc + ((u8[ha + i] << 8) | u8[ba + i])) & 0xffff;
        if (j < tope) f[i*8 + k] = l + acc*s;
      }
    }
  }
  for (let i = 0; i < n; i++){
    f[i*8 + 3] = tabla[u8[esc[0] + i]];
    f[i*8 + 4] = tabla[u8[esc[1] + i]];
    f[i*8 + 5] = tabla[u8[esc[2] + i]];
    const d = i*32 + 24;
    b[d]     = u8[res[0] + i]; b[d + 1] = u8[res[1] + i];
    b[d + 2] = u8[res[2] + i]; b[d + 3] = u8[res[3] + i];
    b[d + 4] = u8[res[4] + i]; b[d + 5] = u8[res[5] + i];
    b[d + 6] = u8[res[6] + i]; b[d + 7] = u8[res[7] + i];
  }
  return out;
}

/* --------------------------------------------------------------- shaders */
export const VERT = `#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D u_textura;
uniform mat4 proyeccion, vista;
uniform vec2 focal, pantalla;
uniform float tam;
uniform int modo;
uniform uint mascara, corr;   // cómo entra el índice en la textura
in vec2 posicion;      // esquina del cuadrado, en [-2,2]
in uint indice;
out vec4 vColor;
out vec2 vPos;
out float vNiebla;

void main(){
  uvec4 cen = texelFetch(u_textura, ivec2((uint(indice) & mascara) << 1, uint(indice) >> corr), 0);
  vec4 camara = vista * vec4(uintBitsToFloat(cen.xyz), 1.0);
  vec4 p = proyeccion * camara;
  // El descarte temprano se hace por el CENTRO, así que el margen tiene que
  // aguantar el radio de la gaussiana más grande que puede asomar desde
  // afuera. Con 1,2 alcanzaba para la ciudad, donde ninguna pasa del metro;
  // con las lonjas de agua de un panorama —cinco metros de largo a tres del
  // ojo— quedaba una FRANJA RAYADA en el borde del cuadro: se caían las
  // grandes y sobrevivían las chicas. Al lado no le cuesta casi nada: el
  // cuadrado que emiten estas cae fuera del recorte igual.
  float corte = 1.2 * p.w, lado = 2.8 * p.w;
  if (p.z < -corte || p.x < -lado || p.x > lado || p.y < -lado || p.y > lado) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return;
  }

  uvec4 cov = texelFetch(u_textura, ivec2(((uint(indice) & mascara) << 1) | 1u, uint(indice) >> corr), 0);
  vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
  mat3 Sigma = mat3(u1.x, u1.y, u2.x,
                    u1.y, u2.y, u3.x,
                    u2.x, u3.x, u3.y);

  // jacobiano de la proyección en perspectiva, evaluado en el centro
  mat3 J = mat3(
    focal.x / camara.z, 0.0, -(focal.x * camara.x) / (camara.z * camara.z),
    0.0, -focal.y / camara.z, (focal.y * camara.y) / (camara.z * camara.z),
    0.0, 0.0, 0.0);
  mat3 T = transpose(mat3(vista)) * J;
  mat3 cov2d = transpose(T) * Sigma * T;

  // DILATACIÓN DE UN TERCIO DE PÍXEL. Sin esto, una gaussiana muy chata —un
  // disco apoyado, una carta del cielo— proyecta una elipse cuyo eje menor da
  // menos de un píxel, y ahí pasan dos cosas malas: el error de coma flotante
  // puede dar un autovalor NEGATIVO y la gaussiana se descarta entera, y las
  // que sobreviven salen como astillas con hueco entre una y otra. Se veía
  // como una rejilla en el cielo por donde pasaba el fondo. Sumarle un tercio
  // de píxel a la diagonal es lo que hace todo rasterizador de gaussianas: le
  // pone un piso al tamaño en pantalla y de paso hace de antialias.
  cov2d[0][0] += 0.33;
  cov2d[1][1] += 0.33;

  // ejes de la elipse: autovectores de la 2x2 de arriba a la izquierda
  float medio = (cov2d[0][0] + cov2d[1][1]) / 2.0;
  float radio = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
  float l1 = medio + radio, l2 = medio - radio;
  if (l2 < 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  /* EL CUADRADO LLEGA A TRES SIGMAS, no a uno y medio. Con el factor raiz de
     dos que trae el rasterizador clásico, el cuadrado tapa hasta 1,41 sigma y
     la campana del fragmento cae cuatro veces más rápido de lo que debería:
     cada gaussiana se dibuja de la mitad del tamaño que dice el archivo. No se
     nota en una nube densa —se tapa sola— pero en una superficie muestreada
     justo se abre una rejilla por la que pasa el fondo. Acá el eje mide 3
     sigma y el fragmento usa el exponente que corresponde. */
  vec2 dir = normalize(vec2(cov2d[0][1], l1 - cov2d[0][0]));
  vec2 mayor = min(3.0 * sqrt(l1), 2048.0) * dir * tam;
  vec2 menor = min(3.0 * sqrt(l2), 2048.0) * vec2(dir.y, -dir.x) * tam;

  // el color y la opacidad viven empaquetados en el cuarto uint32 del texel
  vColor = clamp(p.z / p.w + 1.0, 0.0, 1.0) *
           vec4(uvec4(cov.w & 0xffu, (cov.w >> 8) & 0xffu,
                      (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu)) / 255.0;
  // perspectiva aérea: Cycles no tiene bruma acá, así que la distancia se
  // paga en el shader. Sin esto la torre del fondo está tan nítida como la de
  // adelante, y eso es lo que hace que una nube no parezca una foto.
  vNiebla = 1.0 - exp(-length(camara.xyz) * 0.00050);
  vPos = posicion;
  vec2 centro = vec2(p) / p.w;
  if (modo == 1) {
    gl_Position = vec4(centro + posicion * 3.0 / pantalla, 0.0, 1.0);
    return;
  }
  gl_Position = vec4(centro + posicion.x * mayor / pantalla + posicion.y * menor / pantalla, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform float brillo;
uniform int modo;
uniform float niebla;
in vec4 vColor;
in vec2 vPos;
in float vNiebla;
out vec4 salida;
const vec3 NIEBLA = vec3(0.585, 0.652, 0.719);
void main(){
  /* El cuadrado va de -2 a 2 y su borde está a 3 sigma, así que el radio en
     sigmas es 1,5·|vPos| y la campana es exp(-0,5·(1,5·|vPos|)²). */
  float A = -1.125 * dot(vPos, vPos);
  vec3 c = mix(vColor.rgb, NIEBLA * vColor.a, clamp(vNiebla * niebla, 0.0, 0.75));
  if (modo == 1) { salida = vec4(c * brillo, 1.0); return; }
  if (A < -4.5) discard;             // más allá de 3σ no aporta nada
  float B = exp(A) * vColor.a;
  salida = vec4(B * c * brillo, B);  // alfa premultiplicado
}`;

/* --------------------------------------------------------------- cielo */
/* El fondo negro es lo que más delata que la nube es una maqueta. Esto no es
   una textura: para cada píxel se reconstruye la dirección del rayo, y de ahí
   sale el degradé de cenit a horizonte, la bruma de abajo y el sol. La
   dirección del sol es la misma que tenía la escena en Blender —(52°, 2°, 34°)
   de rotación— pasada a los ejes del visor. */
export const VERT_CIELO = `#version 300 es
precision highp float;
in vec2 posicion;
out vec2 uv;
void main(){ uv = posicion; gl_Position = vec4(posicion, 0.999, 1.0); }`;

export const FRAG_CIELO = `#version 300 es
precision highp float;
uniform mat4 vista;
uniform vec2 escala;
uniform float brillo;
in vec2 uv;
out vec4 salida;
const vec3 SOL = vec3(0.4584, 0.6153, 0.6414);
void main(){
  vec3 dc = normalize(vec3(uv.x * escala.x, uv.y * escala.y, -1.0));
  vec3 d = transpose(mat3(vista)) * dc;
  float t = clamp(d.y, -1.0, 1.0);
  vec3 cenit    = vec3(0.098, 0.196, 0.365);
  vec3 horizonte= vec3(0.616, 0.686, 0.757);
  vec3 bruma    = vec3(0.255, 0.271, 0.294);
  vec3 c = mix(horizonte, cenit, pow(clamp(t, 0.0, 1.0), 0.62));
  c = mix(c, bruma, smoothstep(0.005, -0.26, t));   // bruma, no vacío
  float s = max(0.0, dot(d, SOL));
  c += vec3(1.0, 0.88, 0.70) * pow(s, 900.0) * 2.6;      // el disco
  c += vec3(1.0, 0.90, 0.76) * pow(s, 9.0) * 0.13;       // el halo
  salida = vec4(c * brillo, 1.0);
}`;

/* --------------------------------------------------- orden por conteo */
export const WORKER = `
let pos = null, n = 0, prof = null;
const cubos = new Uint32Array(65537);
onmessage = (e) => {
  if (e.data.pos) {
    pos = new Float32Array(e.data.pos); n = e.data.n;
    prof = new Int32Array(n);           // se reusa: a siete millones son 28 MB
    return;
  }
  if (!pos) return;
  const v = e.data.vista;               // fila 3 de la matriz de vista
  /* La clave es +z·p, SIN negar. z apunta del blanco al ojo, así que z·p baja
     cuando la gaussiana se aleja: en orden ascendente salen primero las
     lejanas, que es lo que hace falta para componer alfa "sobre". Con el signo
     al revés se dibuja de cerca a lejos y el piso del fondo termina pintado
     encima de la ciudad. */
  let lo = 2147483647, hi = -2147483648;
  for (let i = 0; i < n; i++) {
    const d = (v[0]*pos[3*i] + v[1]*pos[3*i+1] + v[2]*pos[3*i+2]) * 4096 | 0;
    prof[i] = d;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  cubos.fill(0);
  const k = hi === lo ? 0 : 65535 / (hi - lo);
  for (let i = 0; i < n; i++) {
    const b = ((prof[i] - lo) * k) | 0;
    prof[i] = b;
    cubos[b]++;
  }
  // acumulado: así cada gaussiana sabe su casillero final
  for (let i = 1; i < 65536; i++) cubos[i] += cubos[i-1];
  const orden = new Uint32Array(n);
  for (let i = n - 1; i >= 0; i--) orden[--cubos[prof[i]]] = i;
  postMessage({ orden }, [orden.buffer]);
};
`;

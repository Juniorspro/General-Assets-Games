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
export function empaquetar(buf){
  const n = CUANTOS(buf.byteLength);
  const f = new Float32Array(buf), b = new Uint8Array(buf);

  // 2 texeles RGBA32UI por gaussiana; 2048 de ancho para no pasarse del máximo
  const ancho = 2048, alto = Math.ceil((2 * n) / ancho);
  const datos = new Uint32Array(ancho * alto * 4);
  const datosF = new Float32Array(datos.buffer);
  const datosB = new Uint8Array(datos.buffer);

  const centro = [0, 0, 0];
  const caja = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];

  for (let i = 0; i < n; i++) {
    const x = f[8*i+0], y = f[8*i+1], z = f[8*i+2];
    datosF[8*i+0] = x; datosF[8*i+1] = y; datosF[8*i+2] = z;
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
  return { n, datos, ancho, alto,
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

/* --------------------------------------------------------------- shaders */
export const VERT = `#version 300 es
precision highp float;
precision highp int;
uniform highp usampler2D u_textura;
uniform mat4 proyeccion, vista;
uniform vec2 focal, pantalla;
uniform float tam;
uniform int modo;
in vec2 posicion;      // esquina del cuadrado, en [-2,2]
in uint indice;
out vec4 vColor;
out vec2 vPos;

void main(){
  uvec4 cen = texelFetch(u_textura, ivec2((uint(indice) & 0x3ffu) << 1, uint(indice) >> 10), 0);
  vec4 camara = vista * vec4(uintBitsToFloat(cen.xyz), 1.0);
  vec4 p = proyeccion * camara;
  float corte = 1.2 * p.w;
  if (p.z < -corte || p.x < -corte || p.x > corte || p.y < -corte || p.y > corte) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return;
  }

  uvec4 cov = texelFetch(u_textura, ivec2(((uint(indice) & 0x3ffu) << 1) | 1u, uint(indice) >> 10), 0);
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

  // ejes de la elipse: autovectores de la 2x2 de arriba a la izquierda
  float medio = (cov2d[0][0] + cov2d[1][1]) / 2.0;
  float radio = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
  float l1 = medio + radio, l2 = medio - radio;
  if (l2 < 0.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
  vec2 dir = normalize(vec2(cov2d[0][1], l1 - cov2d[0][0]));
  vec2 mayor = min(sqrt(2.0 * l1), 1024.0) * dir * tam;
  vec2 menor = min(sqrt(2.0 * l2), 1024.0) * vec2(dir.y, -dir.x) * tam;

  // el color y la opacidad viven empaquetados en el cuarto uint32 del texel
  vColor = clamp(p.z / p.w + 1.0, 0.0, 1.0) *
           vec4(uvec4(cov.w & 0xffu, (cov.w >> 8) & 0xffu,
                      (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu)) / 255.0;
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
in vec4 vColor;
in vec2 vPos;
out vec4 salida;
void main(){
  float A = -dot(vPos, vPos);
  if (modo == 1) { salida = vec4(vColor.rgb * brillo, 1.0); return; }
  if (A < -4.0) discard;             // más allá de 2σ no aporta nada
  float B = exp(A) * vColor.a;
  salida = vec4(B * vColor.rgb * brillo, B);  // alfa premultiplicado
}`;

/* --------------------------------------------------- orden por conteo */
export const WORKER = `
let datos = null, n = 0, ultimo = null;
onmessage = (e) => {
  if (e.data.datos) { datos = new Float32Array(e.data.datos); n = e.data.n; return; }
  if (!datos) return;
  const v = e.data.vista;               // fila 3 de la matriz de vista
  // profundidad de cada gaussiana, cuantizada a 16 bits
  const prof = new Int32Array(n);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) {
    const d = -(v[0]*datos[8*i] + v[1]*datos[8*i+1] + v[2]*datos[8*i+2]);
    prof[i] = d * 4096 | 0;
    if (prof[i] < lo) lo = prof[i];
    if (prof[i] > hi) hi = prof[i];
  }
  const cubos = new Uint32Array(65536 + 1);
  const k = hi === lo ? 0 : 65535 / (hi - lo);
  for (let i = 0; i < n; i++) {
    prof[i] = ((prof[i] - lo) * k) | 0;
    cubos[prof[i]]++;
  }
  // acumulado: así cada gaussiana sabe su casillero final
  for (let i = 1; i < 65536; i++) cubos[i] += cubos[i-1];
  const orden = new Uint32Array(n);
  // de la más lejana a la más cercana: la profundidad va negada arriba,
  // así que el conteo ascendente ya deja los lejanos primero
  for (let i = n - 1; i >= 0; i--) orden[--cubos[prof[i]]] = i;
  postMessage({ orden }, [orden.buffer]);
};
`;

/* ══════════════════════ EL MUÑECO 3D ══════════════════════
   Un renderizador de malla con esqueleto, escrito a mano sobre WebGL.

   POR QUÉ NO three.js: el launcher es la PANTALLA DE INICIO. Se abre cada vez
   que se aprieta HOME, no tiene red, y meterle three.js adentro son 630 KB que
   el WebView parsea en cada arranque para usar UNA sola cosa: `SkinnedMesh`.
   Esto son doce.

   Y POR QUÉ NO ES UN GLB: todo lo feo —el paso de los `bufferView`, la
   jerarquía, los accesores, las matrices de bind— lo resuelve `hornear_3d.py`
   una vez, así que acá los arrays se suben a la GPU tal cual.

   ── EL PIXELADO NO ES UN FILTRO ENCIMA: ES EL LIENZO ──
   Se dibuja a 64 px de ancho y CSS lo estira con NEAREST. O sea que el efecto
   que se pidió y la optimización son la MISMA cosa: rellenar 64×83 en vez de
   139×180 es cinco veces menos píxeles, y encima el escalón pega con un muñeco
   que ya es de vóxeles. */

const L3_ANCHO = 64;      // píxeles de verdad; CSS los estira
/* La caja en píxeles de CSS. El alto es del muñeco de pie; el ancho da lugar a
   los brazos abiertos del baile, que es la pose más ancha. */
const MASC_W = 132, MASC_H = 180;

/* ── LOS EJES SALEN DE UNA MEDICIÓN, NO DE SUPONERLOS ──
   Medido sobre el rig: la mano izquierda está en z −0,245 y la derecha en
   +0,227, o sea que el eje IZQUIERDA-DERECHA es Z. Y fotografiando el modelo
   desde +X y desde −X, la cara está en +X. Con eso: adelante +X, arriba +Y,
   derecha del muñeco +Z. Un eje adivinado deja un brazo girando de canto y no
   se ve hasta que se lo mira. */
const EJE_AD = [1, 0, 0], EJE_AR = [0, 1, 0], EJE_DE = [0, 0, 1];

/* ── Y QUÉ HACE CADA EJE EN CADA HUESO TAMBIÉN SE MIDE (`__A.mascEje`) ──
   Girando un hueso ±1 rad y viendo dónde quedó la mano o el pie:

     R_Upperarm sobre AD:  +1 → mano [ 0, −0,037, −0,251]   o sea BAJA
                           −1 → mano [ 0, +0,231, +0,104]   o sea SUBE
     L_Upperarm sobre AD:  +1 → mano [ 0, +0,236, −0,114]   o sea SUBE

   Es aritmética y no capricho: el brazo cuelga, así que la mano está por
   DEBAJO del hombro y a un lado (izquierda z −0,25, derecha z +0,23). Girando
   sobre el eje de adelante, la derivada de la altura vale −z: para el brazo
   que está en +z el signo se da vuelta. **Levantar es POSITIVO a la izquierda
   y NEGATIVO a la derecha**, y las cinco poses lo tenían al revés — los dos
   brazos bajaban y se cruzaban en la panza en vez de subir.

     R_Forearm  sobre DE:  +1 → mano [+0,088, +0,038, 0]    codo que flexiona
     L_Thigh    sobre DE:  +1 → pie  [+0,219, +0,226, 0]    cadera adelante
     L_Thigh    sobre AD:  +1 → pie  [ 0, +0,14, −0,266]    abre hacia afuera

   Y OJO CON EL ORDEN: `l3Gira` premultiplica, así que el último giro se aplica
   por FUERA. Con el muslo ya flexionado hacia adelante, girarlo sobre AD es
   girarlo sobre su PROPIO eje —torsión, no apertura—; lo que abre una pierna
   que ya apunta al frente es el eje vertical. */

/* ══════════ MATRICES Y CUATERNIONES ══════════ */
function m4(){ return new Float32Array(16); }
function m4Id(o){ o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; }
function m4Mul(a, b, o){
  for (let c = 0; c < 4; c++){
    const b0 = b[c*4], b1 = b[c*4+1], b2 = b[c*4+2], b3 = b[c*4+3];
    o[c*4]   = a[0]*b0 + a[4]*b1 + a[8]*b2  + a[12]*b3;
    o[c*4+1] = a[1]*b0 + a[5]*b1 + a[9]*b2  + a[13]*b3;
    o[c*4+2] = a[2]*b0 + a[6]*b1 + a[10]*b2 + a[14]*b3;
    o[c*4+3] = a[3]*b0 + a[7]*b1 + a[11]*b2 + a[15]*b3;
  }
  return o;
}
function m4TR(t, q, o){
  const x = q[0], y = q[1], z = q[2], w = q[3];
  o[0] = 1-2*(y*y+z*z); o[1] = 2*(x*y+z*w);   o[2] = 2*(x*z-y*w);   o[3] = 0;
  o[4] = 2*(x*y-z*w);   o[5] = 1-2*(x*x+z*z); o[6] = 2*(y*z+x*w);   o[7] = 0;
  o[8] = 2*(x*z+y*w);   o[9] = 2*(y*z-x*w);   o[10] = 1-2*(x*x+y*y); o[11] = 0;
  o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1;
  return o;
}
function m4Persp(fov, asp, n, f, o){
  const t = 1/Math.tan(fov/2);
  o.fill(0);
  o[0] = t/asp; o[5] = t; o[11] = -1;
  o[10] = (f+n)/(n-f); o[14] = 2*f*n/(n-f);
  return o;
}
/* la vista: cámara en `oj` mirando a `bl`, sin `lookAt` de biblioteca — es la
   inversa de una matriz rígida, o sea la transpuesta de la rotación */
function m4Vista(oj, bl, o){
  let zx = oj[0]-bl[0], zy = oj[1]-bl[1], zz = oj[2]-bl[2];
  let d = Math.hypot(zx, zy, zz) || 1; zx /= d; zy /= d; zz /= d;
  // x = arriba × z, con arriba = (0,1,0)
  let xx = zz, xy = 0, xz = -zx;
  d = Math.hypot(xx, xy, xz) || 1; xx /= d; xy /= d; xz /= d;
  const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
  o[0] = xx; o[4] = xy; o[8]  = xz; o[12] = -(xx*oj[0] + xy*oj[1] + xz*oj[2]);
  o[1] = yx; o[5] = yy; o[9]  = yz; o[13] = -(yx*oj[0] + yy*oj[1] + yz*oj[2]);
  o[2] = zx; o[6] = zy; o[10] = zz; o[14] = -(zx*oj[0] + zy*oj[1] + zz*oj[2]);
  o[3] = 0;  o[7] = 0;  o[11] = 0;  o[15] = 1;
  return o;
}
function qMul(a, b, o){
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  o[0] = aw*bx + ax*bw + ay*bz - az*by;
  o[1] = aw*by - ax*bz + ay*bw + az*bx;
  o[2] = aw*bz + ax*by - ay*bx + az*bw;
  o[3] = aw*bw - ax*bx - ay*by - az*bz;
  return o;
}
function qEje(e, a, o){
  const s = Math.sin(a/2);
  o[0] = e[0]*s; o[1] = e[1]*s; o[2] = e[2]*s; o[3] = Math.cos(a/2);
  return o;
}
/* rotar un vector por el CONJUGADO de un cuaternión: llevar un eje de mundo al
   marco del padre, que es todo lo que hace falta para girar un hueso */
function qRotInv(q, v, o){
  const x = -q[0], y = -q[1], z = -q[2], w = q[3];
  const tx = 2*(y*v[2] - z*v[1]), ty = 2*(z*v[0] - x*v[2]), tz = 2*(x*v[1] - y*v[0]);
  o[0] = v[0] + w*tx + y*tz - z*ty;
  o[1] = v[1] + w*ty + z*tx - x*tz;
  o[2] = v[2] + w*tz + x*ty - y*tx;
  return o;
}

/* ══════════ EL ESQUELETO ══════════ */
const L3 = {
  gl: null, prog: null, tex: null, listo: false, on: false,
  nH: 0, hueso: {}, padre: null, bindT: null, bindQ: null, qPadre: null,
  poseQ: null, local: null, mundo: null, piel: null, anim: 'quieto', t: 0
};

function l3B64(s, T){
  const b = atob(s), n = b.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = b.charCodeAt(i);
  return new T(u.buffer, 0, n/T.BYTES_PER_ELEMENT);
}

function l3Esqueleto(){
  const H = LEMI.huesos, n = H.length;
  L3.nH = n;
  L3.padre = new Int8Array(n);
  L3.bindT = new Float32Array(n*3);
  L3.bindQ = new Float32Array(n*4);
  L3.qPadre = new Float32Array(n*4);   // cuaternión de MUNDO del padre, en bind
  L3.poseQ = new Float32Array(n*4);
  L3.local = new Float32Array(n*16);
  L3.mundo = new Float32Array(n*16);
  L3.piel = new Float32Array(n*16);
  const qm = new Float32Array(n*4);    // cuaternión de mundo de cada hueso
  for (let i = 0; i < n; i++){
    const h = H[i];
    L3.padre[i] = h.p;
    L3.hueso[h.n] = i;
    L3.bindT.set(h.t, i*3);
    L3.bindQ.set(h.r, i*4);
    const p = h.p;
    const qp = p < 0 ? [0,0,0,1] : qm.subarray(p*4, p*4+4);
    L3.qPadre.set(qp, i*4);
    qMul(qp, h.r, qm.subarray(i*4, i*4+4));
  }
  L3.ibm = l3B64(LEMI.ibm, Float32Array);
}

/* ── GIRAR UN HUESO SE PIDE EN EJES DE MUNDO ──
   Los ejes locales de un hueso son los que dejó el bind y no significan nada:
   en este rig el hombro viene con el brazo colgando y con su propia torsión, así
   que escribir `rotation.z` no es «levantar el brazo», es cualquier cosa. Lo
   único que se puede nombrar es un eje del mundo —adelante, arriba, la derecha
   del muñeco— y llevarlo al marco del PADRE, que es una conjugación. */
const _ej = new Float32Array(3), _q = new Float32Array(4), _q2 = new Float32Array(4);
function l3Gira(nom, eje, ang){
  const i = L3.hueso[nom];
  if (i === undefined || !ang) return;
  qRotInv(L3.qPadre.subarray(i*4, i*4+4), eje, _ej);
  qEje(_ej, ang, _q);
  qMul(_q, L3.poseQ.subarray(i*4, i*4+4), _q2);
  L3.poseQ.set(_q2, i*4);
}
function l3Reposo(){ L3.poseQ.set(L3.bindQ); }

function l3Componer(){
  const n = L3.nH, t = [0,0,0];
  for (let i = 0; i < n; i++){
    t[0] = L3.bindT[i*3]; t[1] = L3.bindT[i*3+1]; t[2] = L3.bindT[i*3+2];
    m4TR(t, L3.poseQ.subarray(i*4, i*4+4), L3.local.subarray(i*16, i*16+16));
    const p = L3.padre[i];
    if (p < 0) L3.mundo.set(L3.local.subarray(i*16, i*16+16), i*16);
    else m4Mul(L3.mundo.subarray(p*16, p*16+16),
               L3.local.subarray(i*16, i*16+16),
               L3.mundo.subarray(i*16, i*16+16));
    m4Mul(L3.mundo.subarray(i*16, i*16+16),
          L3.ibm.subarray(i*16, i*16+16),
          L3.piel.subarray(i*16, i*16+16));
  }
}

/* ══════════ LAS ANIMACIONES ══════════
   Escritas como FUNCIONES DEL TIEMPO sobre los huesos, no traídas como clips.
   Con un clip enlatado no hay forma de mezclar el cabeceo de la respiración con
   un saludo, ni de componer una pose sentada que la biblioteca del proveedor no
   tiene: su vocabulario es `preset:idle`, `walk`, `run`, `jump`… y ninguno es
   «bailar» ni «dormir», que es justo lo que se pidió. Y encima cada clip se
   cobra aparte. */
const L3_ANIM = {

  /* respira, cambia el peso de pie y mira alrededor cada tanto */
  quieto(t){
    const r = Math.sin(t*1.9);
    l3Gira('Spine01', EJE_DE, r*0.030);
    l3Gira('Spine02', EJE_DE, r*0.022);
    l3Gira('Head',    EJE_DE, -r*0.030 + Math.sin(t*0.7)*0.05);
    l3Gira('Head',    EJE_AR, Math.sin(t*0.31)*0.34);
    const p = Math.sin(t*0.43);
    l3Gira('Hip', EJE_AD, p*0.045);
    l3Gira('L_Upperarm', EJE_AD,  0.11 + r*0.035);
    l3Gira('R_Upperarm', EJE_AD, -0.11 - r*0.035);
    l3Gira('L_Forearm',  EJE_DE,  0.20);
    l3Gira('R_Forearm',  EJE_DE,  0.20);
  },

  /* ── BAILAR ES LA CADERA, NO LOS BRAZOS ──
     Con los brazos solos se lee a alguien saludando con las dos manos. Lo que
     hace que se lea a baile es que el peso se vaya de un pie al otro y que el
     tronco vaya CONTRA la cadera, que es lo que hace un cuerpo. */
  baila(t){
    const w = t*6.6, s = Math.sin(w), c = Math.cos(w*2);
    l3Gira('Hip',     EJE_AD, s*0.20);
    l3Gira('Hip',     EJE_AR, s*0.22);
    l3Gira('Waist',   EJE_AD, -s*0.10);
    l3Gira('Spine01', EJE_AD, -s*0.13);
    l3Gira('Spine02', EJE_AR, -s*0.16);
    l3Gira('Head',    EJE_DE, -0.10 + c*0.14);
    l3Gira('Head',    EJE_AD, s*0.20);
    l3Gira('L_Upperarm', EJE_AD,  1.72 + s*0.42);
    l3Gira('R_Upperarm', EJE_AD, -1.72 + s*0.42);
    l3Gira('L_Forearm',  EJE_DE,  0.62 + c*0.28);
    l3Gira('R_Forearm',  EJE_DE,  0.62 + c*0.28);
    l3Gira('L_Thigh', EJE_DE, s > 0 ?  s*0.22 : 0);
    l3Gira('R_Thigh', EJE_DE, s < 0 ? -s*0.22 : 0);
    l3Gira('L_Calf',  EJE_DE, s > 0 ? -s*0.30 : 0);
    l3Gira('R_Calf',  EJE_DE, s < 0 ?  s*0.30 : 0);
  },

  /* saluda con la derecha y el cuerpo acompaña: un brazo que se mueve solo
     sobre un cuerpo clavado se lee a maniquí con una bisagra */
  saluda(t){
    const w = Math.sin(t*7.4);
    l3Gira('R_Upperarm', EJE_AD, -2.30);
    l3Gira('R_Upperarm', EJE_DE,  0.26);
    l3Gira('R_Forearm',  EJE_AD, -0.30 + w*0.55);
    l3Gira('L_Upperarm', EJE_AD, -0.12);
    l3Gira('L_Forearm',  EJE_DE,  0.28);
    l3Gira('Spine02', EJE_AD, -0.08);
    l3Gira('Head',    EJE_AD,  0.10 + w*0.06);
    l3Gira('Head',    EJE_DE, -0.06);
    l3Gira('Hip',     EJE_AD, -0.05);
  },

  /* con el joystick: los dos brazos adelante, las manos juntas, la cabeza
     apenas baja — y los pulgares no existen en este rig, así que lo que dice
     «está jugando» es el pequeño tirón de los antebrazos */
  mando(t){
    const w = Math.sin(t*5.2);
    l3Gira('L_Upperarm', EJE_AD, -0.26);
    l3Gira('R_Upperarm', EJE_AD,  0.26);
    l3Gira('L_Upperarm', EJE_DE,  0.20);
    l3Gira('R_Upperarm', EJE_DE,  0.20);
    l3Gira('L_Forearm',  EJE_DE,  1.15);
    l3Gira('R_Forearm',  EJE_DE,  1.15);
    l3Gira('L_Forearm',  EJE_AD, -0.30 + w*0.05);
    l3Gira('R_Forearm',  EJE_AD,  0.30 - w*0.05);
    l3Gira('Spine02', EJE_DE,  0.10);
    l3Gira('Head',    EJE_DE,  0.24 + Math.sin(t*1.7)*0.04);
  },

  /* ── DORMIR ES UNA POSE SENTADA, Y ESO SÓLO SE PUEDE CON UN RIG ──
     Con láminas había que pedirle al generador una hoja entera y volvió DE PIE.
     Con huesos es una cuenta: los muslos noventa grados adelante, las canillas
     dobladas hacia atrás, la raíz bajada hasta que las nalgas queden en el piso
     y el mentón contra el pecho. */
  duerme(t){
    const r = Math.sin(t*1.05);
    l3Gira('L_Thigh', EJE_AD,  0.34); l3Gira('R_Thigh', EJE_AD, -0.34);
    l3Gira('L_Thigh', EJE_DE, 1.58);  l3Gira('R_Thigh', EJE_DE,  1.58);
    l3Gira('L_Calf',  EJE_DE, -2.30); l3Gira('R_Calf',  EJE_DE, -2.30);
    l3Gira('L_Foot',  EJE_DE, 0.40);  l3Gira('R_Foot',  EJE_DE, 0.40);
    /* el tronco sumaba 1,10 rad —63 grados— y la cabeza terminaba metida entre
       las rodillas: no se leía a dormido sino a desmayado. Con 0,82 la cara se
       sigue viendo, que es lo único que hace que las zetas signifiquen algo. */
    l3Gira('Hip',     EJE_DE, 0.10 + r*0.03);
    l3Gira('Spine01', EJE_DE, 0.14 + r*0.04);
    l3Gira('Spine02', EJE_DE, 0.16 + r*0.04);
    l3Gira('Head',    EJE_DE, 0.32 + r*0.07);
    l3Gira('Head',    EJE_AD, 0.22);
    /* PROBADO Y DESCARTADO: sentarlo de tres cuartos girando la raíz. La idea
       era que los muslos dejaran de apuntar al lente; lo que salió fue un
       codo saliéndose por el costado y un cuerpo que no se lee. De frente, la
       silueta cerrada —cabeza, rodillas, pies— es lo que dice «dormido». */
    l3Gira('L_Upperarm', EJE_AD, -0.30); l3Gira('R_Upperarm', EJE_AD, 0.30);
    l3Gira('L_Upperarm', EJE_DE,  0.55); l3Gira('R_Upperarm', EJE_DE, 0.55);
    l3Gira('L_Forearm',  EJE_DE,  0.95); l3Gira('R_Forearm',  EJE_DE, 0.95);
  }
};
/* cuánto baja la raíz en cada pose: sentado, el muñeco tiene que apoyar el culo
   en el piso y no quedar flotando a la altura de sus caderas de pie */
const L3_BAJA = { duerme: -0.18 };

/* ══════════ WEBGL ══════════ */
const L3_VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aCol;
attribute vec4 aJnt; attribute vec4 aWgt;
uniform mat4 uPV; uniform mat4 uH[NH];
uniform vec3 uMin, uEsc; uniform float uBaja;
varying vec3 vCol; varying vec3 vNor;
void main(){
  vec3 p = uMin + (aPos*0.5+0.5)*uEsc;
  mat4 M = uH[int(aJnt.x)]*aWgt.x + uH[int(aJnt.y)]*aWgt.y
         + uH[int(aJnt.z)]*aWgt.z + uH[int(aJnt.w)]*aWgt.w;
  vec4 sp = M*vec4(p,1.0);
  sp.y += uBaja;
  vNor = normalize((M*vec4(aNor,0.0)).xyz);
  vCol = aCol;
  gl_Position = uPV*sp;
}`;
const L3_FS = `
precision mediump float;
varying vec3 vCol; varying vec3 vNor;
void main(){
  vec3 n = normalize(vNor);
  /* la textura viene horneada con luz de estudio, así que acá la luz sólo tiene
     que dar VOLUMEN: un hemisférico que nunca llega a negro, una clave suave y
     un contra frío que despega la silueta del vidrio del cajón */
  float k = max(dot(n, normalize(vec3(0.55,0.75,0.45))), 0.0);
  float c = max(dot(n, normalize(vec3(-0.5,0.15,-0.8))), 0.0);
  vec3 luz = vec3(0.62) + vec3(0.46)*k + vec3(0.10,0.20,0.30)*c;
  vec3 col = vCol * luz;
  gl_FragColor = vec4(col, 1.0);
}`;

function l3Shader(gl, tipo, src){
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function l3Init(){
  const cv = $('#mLien');
  if (!cv || typeof LEMI === 'undefined') return false;
  const gl = cv.getContext('webgl', { alpha: true, antialias: false, depth: true,
                                      premultipliedAlpha: false });
  if (!gl) return false;
  L3.gl = gl;
  l3Esqueleto();

  const p = gl.createProgram();
  gl.attachShader(p, l3Shader(gl, gl.VERTEX_SHADER, L3_VS.replace('NH', L3.nH)));
  gl.attachShader(p, l3Shader(gl, gl.FRAGMENT_SHADER, L3_FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  gl.useProgram(p); L3.prog = p;

  const buf = (dat, n, tipo, norm, nom) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, dat, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(p, nom);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, n, tipo, norm, 0, 0);
  };
  buf(l3B64(LEMI.pos, Int16Array),  3, gl.SHORT,          true,  'aPos');
  buf(l3B64(LEMI.nor, Int8Array),   3, gl.BYTE,           true,  'aNor');
  buf(l3B64(LEMI.col, Uint8Array),  3, gl.UNSIGNED_BYTE,  true,  'aCol');
  buf(l3B64(LEMI.jnt, Uint8Array),  4, gl.UNSIGNED_BYTE,  false, 'aJnt');
  buf(l3B64(LEMI.wgt, Uint8Array),  4, gl.UNSIGNED_BYTE,  true,  'aWgt');
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                l3B64(LEMI.idx, LEMI.i16 ? Uint32Array : Uint16Array), gl.STATIC_DRAW);
  L3.tipoIdx = LEMI.i16 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

  L3.uPV = gl.getUniformLocation(p, 'uPV');
  L3.uH  = gl.getUniformLocation(p, 'uH[0]');
  L3.uBaja = gl.getUniformLocation(p, 'uBaja');
  gl.uniform3fv(gl.getUniformLocation(p, 'uMin'), LEMI.pmin);
  gl.uniform3fv(gl.getUniformLocation(p, 'uEsc'), LEMI.pesc);

  /* no hay textura que esperar: el color viaja en los vértices, así que el
     primer cuadro ya sale del color de verdad */
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  L3.pv = m4(); L3.proj = m4(); L3.vista = m4();
  L3.listo = true;
  return true;
}

/* ── EL ENCUADRE ──
   El muñeco mide 1 y se para en el origen. La cámara va sobre +X, que es donde
   está la cara, un poco por encima de la cintura y mirando al pecho: apuntando
   al centro de la caja la cabeza queda en el borde de arriba del cuadro. */
function l3Cam(){
  const A = L3.gl.canvas.width, B = L3.gl.canvas.height;
  m4Persp(0.48, A/B, 0.05, 12, L3.proj);
  m4Vista([2.42, 0.60, 0.10], [0, 0.44, 0], L3.vista);
  m4Mul(L3.proj, L3.vista, L3.pv);
}

function l3Pinta(dt){
  if (!L3.listo) return;
  const gl = L3.gl;
  L3.t += dt;
  l3Reposo();
  (L3_ANIM[L3.anim] || L3_ANIM.quieto)(L3.t);
  l3Componer();
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(L3.uPV, false, L3.pv);
  gl.uniformMatrix4fv(L3.uH, false, L3.piel);
  gl.uniform1f(L3.uBaja, L3_BAJA[L3.anim] || 0);
  gl.drawElements(gl.TRIANGLES, LEMI.nt*3, L3.tipoIdx, 0);
}

/* ── SE DIBUJA SÓLO CUANDO SE VE ──
   Un bucle de render corriendo con el cajón cerrado es batería regalada en la
   pantalla de inicio de un teléfono. */
let L3_ULT = 0, L3_RAF = 0;
function l3Corre(v){
  if (v === L3.on) return;
  L3.on = v;
  if (!v){ cancelAnimationFrame(L3_RAF); L3_RAF = 0; return; }
  L3_ULT = performance.now();
  const paso = ahora => {
    L3_RAF = requestAnimationFrame(paso);
    const dt = Math.min(0.05, (ahora - L3_ULT)/1000);
    L3_ULT = ahora;
    l3Pinta(dt);
  };
  L3_RAF = requestAnimationFrame(paso);
}

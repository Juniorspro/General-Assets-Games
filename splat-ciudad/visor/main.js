import { empaquetar, VERT, FRAG, VERT_CIELO, FRAG_CIELO, WORKER, CUANTOS } from "./splat.js";

const $ = (s) => document.querySelector(s);
const TOMAS = 184;      // cuántas fotos de Cycles le dieron color
const coma = (v, d = 2) => v.toFixed(d).replace(".", ",");

function morir(t){ $("#fallaTexto").textContent = t; $("#falla").style.display = "grid"; $("#carga").classList.add("ido"); }

const lienzo = document.createElement("canvas");
document.body.appendChild(lienzo);
const gl = lienzo.getContext("webgl2", { antialias:false, alpha:false, premultipliedAlpha:false });
if (!gl) { morir("Este navegador no tiene WebGL 2, que es lo que hace falta para dibujar las gaussianas."); throw new Error("sin webgl2"); }

/* ------------------------------------------------------------ programa */
function compilar(tipo, fuente){
  const s = gl.createShader(tipo);
  gl.shaderSource(s, fuente); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function armar(v, f){
  const p = gl.createProgram();
  gl.attachShader(p, compilar(gl.VERTEX_SHADER, v));
  gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, f));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { morir("Shader: " + gl.getProgramInfoLog(p)); throw new Error("link"); }
  return p;
}
const prog = armar(VERT, FRAG);
const progCielo = armar(VERT_CIELO, FRAG_CIELO);
gl.useProgram(prog);

gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
/* de lejos a cerca, con alfa premultiplicado: es el operador "sobre" común */
gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

const U = (n) => gl.getUniformLocation(prog, n);
const uProy = U("proyeccion"), uVista = U("vista"), uFocal = U("focal"),
      uPant = U("pantalla"), uTam = U("tam"), uTex = U("u_textura"),
      uBrillo = U("brillo"), uModo = U("modo"), uNiebla = U("niebla"),
      uMasc = U("mascara"), uCorr = U("corr");

const vaoSplat = gl.createVertexArray();
gl.bindVertexArray(vaoSplat);
// el cuadrado que cubre la elipse, en [-2,2]
const vboQuad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vboQuad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-2,-2, 2,-2, 2,2, -2,2]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, "posicion");
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const vboIdx = gl.createBuffer();
const aIdx = gl.getAttribLocation(prog, "indice");
gl.enableVertexAttribArray(aIdx);
gl.bindBuffer(gl.ARRAY_BUFFER, vboIdx);
gl.vertexAttribIPointer(aIdx, 1, gl.UNSIGNED_INT, 0, 0);
gl.vertexAttribDivisor(aIdx, 1);

const vaoCielo = gl.createVertexArray();
gl.bindVertexArray(vaoCielo);
const vboCielo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vboCielo);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
const aPosC = gl.getAttribLocation(progCielo, "posicion");
gl.enableVertexAttribArray(aPosC);
gl.vertexAttribPointer(aPosC, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

const uCVista = gl.getUniformLocation(progCielo, "vista");
const uCEsc = gl.getUniformLocation(progCielo, "escala");
const uCBrillo = gl.getUniformLocation(progCielo, "brillo");

/* --------------------------------------------------------------- cámara */
const cam = { blanco:[0,26,0], dist:420, yaw:0.7, pit:0.13, fov:52 };
/* Cuatro encuadres, porque la nube se lee distinto en cada escala: de lejos es
   una maqueta, a la altura del cordón se nota que el color es radiancia. */
const ENCUADRES = [
  { blanco:[0, 48, 0],    dist:365, yaw:0.92,  pit:0.32,  fov:51 },   // aérea
  { blanco:[0, 62, 0],    dist:300, yaw:2.34,  pit:0.05,  fov:54 },   // perfil
  { blanco:[-120, 22, -52], dist:210, yaw:1.571, pit:0.09, fov:54 }, // avenida
  { blanco:[0, 26, -52],  dist:130, yaw:1.571, pit:0.13,  fov:52 },  // manzana
];
/* La caja de lo CONSTRUIDO, que no es la de la nube: el piso llega bastante más
   lejos que la ciudad —si el plano termina donde termina la ciudad, la nube
   flota como una maqueta— y encuadrando por la caja entera los edificios
   quedaban en una franja del medio. Se mira una de cada tres gaussianas y sólo
   las de más de 8 m de altura. */
/* grano: la mediana del lado mayor de la gaussiana, sobre una muestra */
function lado3d(buf, n){
  const fs = new Float32Array(buf), m = Math.min(n, 24000), lados = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const j = ((i * 7919) % n) | 0;
    lados[i] = 2 * Math.max(fs[8*j+3], fs[8*j+4]);
  }
  lados.sort();
  return lados[m >> 1];
}

function cajaConstruida(buf, n){
  const f = new Float32Array(buf);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y1 = -Infinity, k = 0;
  for (let i = 0; i < n; i += 3) {
    const y = f[8*i+1];
    if (y < 8) continue;
    const x = f[8*i], z = f[8*i+2];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
    if (y > y1) y1 = y;
    k++;
  }
  return k > 500 ? [x0, 0, z0, x1, y1, z1] : null;
}

/* Los dos encuadres de lejos se calculan de la caja de la nube: el mismo
   visor sirve para el distrito entero y para el recorte de una esquina, y a
   ojo no hay un número que sirva para los dos. Los dos de cerca van en metros
   porque las calles están donde están. */
function ajustarEncuadres(caja){
  if (Array.isArray(window.__ENCUADRES) && window.__ENCUADRES.length) return;
  const lado = Math.max(caja[3]-caja[0], caja[5]-caja[2]);
  const cx = (caja[0]+caja[3])/2, cz = (caja[2]+caja[5])/2;
  // Todo sale del lado de la huella, no del alto. Encuadrar por el alto para
  // que entren las torres enteras deja la nube como una maqueta flotando en
  // una losa; que las torres se vayan de cuadro es lo que hace una foto.
  ENCUADRES[0].blanco = [cx, lado*0.085, cz];  ENCUADRES[0].dist = lado*0.62;
  ENCUADRES[1].blanco = [cx, lado*0.110, cz];  ENCUADRES[1].dist = lado*0.52;
}
/* Una nube sacada de un panorama no tiene "afuera": está toda alrededor de un
   punto, y los encuadres de maqueta no significan nada. El archivo puede traer
   los suyos. */
if (Array.isArray(window.__ENCUADRES) && window.__ENCUADRES.length) {
  ENCUADRES.length = 0;
  for (const e of window.__ENCUADRES) ENCUADRES.push(e);
  Object.assign(cam, { blanco:ENCUADRES[0].blanco.slice(), dist:ENCUADRES[0].dist,
                       yaw:ENCUADRES[0].yaw, pit:ENCUADRES[0].pit, fov:ENCUADRES[0].fov });
}
/* La correa: hasta dónde se puede caminar desde el origen. En una nube de
   panorama el paralaje es honesto sólo cerca del punto de vista —el color de
   cada gaussiana se midió UNA vez, desde ahí—, así que alejarse mucho no
   muestra más mundo, muestra el truco. */
const CORREA = +window.__CORREA || 0;
const NIEBLA_K = window.__NIEBLA === undefined ? 1.0 : +window.__NIEBLA;
// caminando por la calle se mira mucho a la sombra entre edificios, así que
// el archivo puede pedir un brillo de arranque más alto
let girando = true, nube = false, brillo = +window.__BRILLO || 1.0, modo = 0;

/* ------------------------------------------------------ primera persona
   Caminar por adentro de la nube. El choque no necesita saber nada de la
   escena: se arma una rejilla de ocupación con las propias gaussianas, contando
   las que caen entre 0,7 y 3,2 m de altura. Una pared llena la celda, la
   vereda no aporta ninguna porque queda abajo de la franja, y así el mismo
   visor camina cualquier .splat que le tiren. */
const fp = { on:false, pos:[0, 1.68, 0], yaw:0.9, pit:0.02, choque:true, t:0 };
const tecla = Object.create(null);
let rej = null;                       // {c, nx, nz, x0, z0, paso, umbral}

function armarRejilla(buf, n, caja, paso3d){
  const f = new Float32Array(buf), paso = 1.5;
  const x0 = caja[0] - 2, z0 = caja[2] - 2;
  const nx = Math.ceil((caja[3] - x0 + 2)/paso), nz = Math.ceil((caja[5] - z0 + 2)/paso);
  if (nx*nz > 6e6 || nx <= 0 || nz <= 0) return null;

  /* Dos pasadas. La primera saca la ALTURA DEL PISO de cada celda: la
     gaussiana más baja por encima de -1, que en el agua es la superficie (no
     la arena del fondo) y en una loma es el pasto. Sin esto el modo a pie
     asume piso plano, que servía para una ciudad y no para un mundo con
     lomas: se camina por adentro del cerro. La segunda cuenta lo que hay
     entre 0,7 y 3,2 m POR ENCIMA de ese piso, que es lo que choca. */
  const suelo = new Float32Array(nx*nz).fill(NaN);
  for (let i = 0; i < n; i++) {
    const y = f[8*i+1];
    if (y < -1.0) continue;
    const ix = ((f[8*i] - x0)/paso) | 0, iz = ((f[8*i+2] - z0)/paso) | 0;
    if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) continue;
    const k = iz*nx + ix;
    if (!(suelo[k] <= y)) suelo[k] = y;      // NaN <= y es false: primera gana
  }
  const c = new Uint16Array(nx*nz);
  for (let i = 0; i < n; i++) {
    const ix = ((f[8*i] - x0)/paso) | 0, iz = ((f[8*i+2] - z0)/paso) | 0;
    if (ix < 0 || ix >= nx || iz < 0 || iz >= nz) continue;
    const k = iz*nx + ix, s = suelo[k];
    if (!(s === s)) continue;
    const d = f[8*i+1] - s;
    if (d < 0.7 || d > 3.2) continue;
    if (c[k] < 65535) c[k]++;
  }
  const esper = (paso * 2.5) / Math.max(0.04, paso3d*paso3d);
  const umbral = Math.max(4, Math.round(esper * 0.33));
  return { c, suelo, nx, nz, x0, z0, paso, umbral };
}

function sueloEn(x, z){
  if (!rej) return 0;
  const ix = ((x - rej.x0)/rej.paso) | 0, iz = ((z - rej.z0)/rej.paso) | 0;
  if (ix < 0 || ix >= rej.nx || iz < 0 || iz >= rej.nz) return 0;
  const s = rej.suelo[iz*rej.nx + ix];
  return s === s ? s : 0;
}

function solido(x, z){
  if (!rej) return false;
  const ix = ((x - rej.x0)/rej.paso) | 0, iz = ((z - rej.z0)/rej.paso) | 0;
  if (ix < 0 || ix >= rej.nx || iz < 0 || iz >= rej.nz) return false;
  return rej.c[iz*rej.nx + ix] >= rej.umbral;
}
const RADIO = 0.45;
function chocaEn(x, z){
  return solido(x, z) || solido(x+RADIO, z) || solido(x-RADIO, z)
                      || solido(x, z+RADIO) || solido(x, z-RADIO);
}

function buscarHueco(x, z){
  for (let r = 0; r < 90; r++) {
    for (let a = 0; a < 16; a++) {
      const t = a/16*Math.PI*2;
      const px = x + Math.cos(t)*r*1.5, pz = z + Math.sin(t)*r*1.5;
      if (!chocaEn(px, pz)) return [px, pz];
    }
    if (r === 0 && !chocaEn(x, z)) return [x, z];
  }
  return [x, z];
}

function entrarFP(){
  if (fp.on) return;
  fp.on = true; girando = false; viaje = null;
  $("#btGira").setAttribute("aria-pressed", "false");
  $("#btPie").setAttribute("aria-pressed", "true");
  $("#mira").hidden = false;
  $("#pista").textContent = "WASD para caminar · mouse para mirar · Shift corre · V atraviesa · Esc sale";
  $("#pista").style.opacity = 1;
  if (!document.pointerLockElement)
    $("#pista").textContent = "Hacé clic para tomar el mouse · WASD para caminar · Shift corre · V atraviesa · Esc sale";
  if (CORREA) { fp.pos[0] = 0; fp.pos[2] = 0; }
  const h = CORREA ? [fp.pos[0], fp.pos[2]] : buscarHueco(fp.pos[0], fp.pos[2]);
  fp.pos[0] = h[0]; fp.pos[2] = h[1];
  fp.pos[1] = sueloEn(h[0], h[1]) + 1.68;
  if (lienzo.requestPointerLock) lienzo.requestPointerLock();
}
function salirFP(){
  if (!fp.on) return;
  fp.on = false;
  $("#btPie").setAttribute("aria-pressed", "false");
  $("#mira").hidden = true;
  $("#pista").textContent = "Arrastrá para girar · rueda para acercar · botón derecho para desplazar";
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  ir(0);
}
document.addEventListener("pointerlockchange", () => {
  if (fp.on && !document.pointerLockElement) salirFP();
});

function caminar(dt){
  const v = tecla.shift ? 9.0 : 3.3;
  let ax = 0, az = 0;
  if (tecla.w || tecla.arrowup) az += 1;
  if (tecla.s || tecla.arrowdown) az -= 1;
  if (tecla.d || tecla.arrowright) ax += 1;
  if (tecla.a || tecla.arrowleft) ax -= 1;
  if (palanca.act) { ax += palanca.x; az += palanca.z; }
  const m = Math.hypot(ax, az);
  if (m < 0.01) return;
  const sy = Math.sin(fp.yaw), cy = Math.cos(fp.yaw);
  const dx = ((-sy)*az/m + cy*ax/m) * v * dt;
  const dz = ((-cy)*az/m + (-sy)*ax/m) * v * dt;
  // de a un eje, para deslizar contra la pared en vez de frenar en seco
  if (!fp.choque || !chocaEn(fp.pos[0] + dx, fp.pos[2])) fp.pos[0] += dx;
  if (!fp.choque || !chocaEn(fp.pos[0], fp.pos[2] + dz)) fp.pos[2] += dz;
  if (CORREA) {
    const r = Math.hypot(fp.pos[0], fp.pos[2]);
    if (r > CORREA) { fp.pos[0] *= CORREA/r; fp.pos[2] *= CORREA/r; }
  }
  seguirSuelo(dt);
}

/* la vista sigue el terreno, con un poco de inercia para que la rejilla de
   1,5 m no se note como escalones */
function seguirSuelo(dt){
  const meta = sueloEn(fp.pos[0], fp.pos[2]) + 1.68;
  const k = 1 - Math.exp(-dt*7.0);
  fp.pos[1] += (meta - fp.pos[1]) * k;
}

function ir(i, animar = true){
  const e = ENCUADRES[i];
  if (!e) return;
  girando = false; $("#btGira").setAttribute("aria-pressed", "false");
  for (const b of document.querySelectorAll("#encuadres button"))
    b.setAttribute("aria-pressed", String(+b.dataset.v === i));
  if (!animar || matchMedia("(prefers-reduced-motion:reduce)").matches) {
    Object.assign(cam, { blanco:e.blanco.slice(), dist:e.dist, yaw:e.yaw, pit:e.pit, fov:e.fov });
    return;
  }
  viaje = { desde:{ blanco:cam.blanco.slice(), dist:cam.dist, yaw:cam.yaw, pit:cam.pit, fov:cam.fov },
            hasta:e, t0:performance.now(), ms:900 };
}
let viaje = null;
function avanzarViaje(){
  if (!viaje) return;
  const u = Math.min(1, (performance.now() - viaje.t0) / viaje.ms);
  const k = u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3)/2;   // suave a los dos lados
  const a = viaje.desde, b = viaje.hasta;
  for (let i = 0; i < 3; i++) cam.blanco[i] = a.blanco[i] + (b.blanco[i]-a.blanco[i])*k;
  cam.dist = a.dist + (b.dist-a.dist)*k;
  cam.yaw  = a.yaw  + (b.yaw -a.yaw )*k;
  cam.pit  = a.pit  + (b.pit -a.pit )*k;
  cam.fov  = a.fov  + (b.fov -a.fov )*k;
  if (u >= 1) viaje = null;
}

function matVista(){
  // órbita y primera persona comparten todo menos de dónde salen el ojo y el
  // eje z; el yaw y el pitch significan lo mismo en las dos
  const yaw = fp.on ? fp.yaw : cam.yaw, pit = fp.on ? fp.pit : cam.pit;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pit), sp = Math.sin(pit);
  let z = [cp*sy, sp, cp*cy];
  const ojo = fp.on ? fp.pos : [
    cam.blanco[0] + cam.dist * z[0],
    cam.blanco[1] + cam.dist * z[1],
    cam.blanco[2] + cam.dist * z[2],
  ];
  let l = Math.hypot(...z) || 1; z = z.map((v) => v/l);
  // derecha = cruz(arriba, z) con arriba = +Y, que se simplifica a esto
  let x = [z[2], 0, -z[0]]; l = Math.hypot(...x) || 1; x = x.map((v) => v/l);
  const y = [ z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0] ];
  // fila 3 = z, y la traslación es -R·ojo
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0]*ojo[0]+x[1]*ojo[1]+x[2]*ojo[2]),
    -(y[0]*ojo[0]+y[1]*ojo[1]+y[2]*ojo[2]),
    -(z[0]*ojo[0]+z[1]*ojo[1]+z[2]*ojo[2]), 1,
  ];
}
function matProy(){
  const f = 1 / Math.tan((fp.on ? 72 : cam.fov) * Math.PI / 360);
  const a = lienzo.width / lienzo.height;
  const near = fp.on ? 0.22 : 1.0, far = 4000;   // caminando se pasa cerca de todo
  return [ f/a,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0 ];
}

/* --------------------------------------------------- de dónde sale la nube
   Tres orígenes, y el mismo visor sirve para los tres: el .splat al lado del
   html, el .splat metido adentro del html en base64, o uno que se arrastre a
   la ventana. El tercero es el que importa cuando la nube pesa 234 MB y no hay
   forma de meterla en una página. */
const ARCHIVO = "./ciudad.splat";

function progreso(v){
  $("#riel i").style.width = (v*100).toFixed(0) + "%";
  $("#pct").textContent = Math.round(v*100) + " %";
}

async function delServidor(){
  const r = await fetch(ARCHIVO);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const total = +r.headers.get("content-length") || 0;
  const trozos = []; let leido = 0;
  const lector = r.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value); leido += value.length;
    if (total) progreso(0.06 + 0.84 * leido / total);
  }
  const buf = new Uint8Array(leido); let o = 0;
  for (const t of trozos) { buf.set(t, o); o += t.length; }
  return buf.buffer;
}

/* Adentro de la página va en base64 y con gzip, porque base64 infla un tercio.
   Lo descomprime DecompressionStream, que no es una API de red y por eso anda
   igual en file:// y en el sandbox de un artifact. */
async function deLaPagina(){
  const b64 = window.__SPLAT;
  const c = atob(b64), u = new Uint8Array(c.length);
  for (let i = 0; i < c.length; i++) u[i] = c.charCodeAt(i);
  window.__SPLAT = null;
  progreso(0.55);
  if (!window.__GZ) return u.buffer;
  if (!self.DecompressionStream) throw new Error("este navegador no trae DecompressionStream");
  return await new Response(new Blob([u]).stream()
             .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}

function pedirArchivo(aviso){
  $("#riel").hidden = $("#pct").hidden = true;
  $("#suelta").hidden = false;
  $("#avisoSuelta").textContent = aviso || "";
  $("#carga").classList.remove("ido");
}

async function abrir(fuente, nombre){
  try {
    $("#suelta").hidden = true;
    $("#riel").hidden = $("#pct").hidden = false;
    $("#carga").classList.remove("ido");
    progreso(0.06);
    arrancar(await fuente, nombre);
  } catch (e) {
    morir("No se pudieron leer las gaussianas: " + (e.message || e));
  }
}

for (const ev of ["dragover", "dragenter"]) addEventListener(ev, (e) => e.preventDefault());
addEventListener("drop", (e) => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) abrir(f.arrayBuffer(), f.name);
});
$("#elegir").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) abrir(f.arrayBuffer(), f.name);
});

if (window.__SPLAT) abrir(deLaPagina(), ARCHIVO);
else if (window.__SIN_ARCHIVO) pedirArchivo();
else delServidor().then((b) => arrancar(b, ARCHIVO))
      .catch(() => pedirArchivo("No se encontró ciudad.splat al lado de esta página."));

let N = 0, orden = null, worker = null, msOrden = 0, pesoArchivo = 0;
let tex = null, lazoVivo = false;

function arrancar(buf, nombre){
  // se puede llamar más de una vez: al soltar otro .splat hay que soltar el
  // worker y la textura de la nube anterior, que a siete millones son 234 MB
  if (worker) { worker.terminate(); worker = null; }
  if (tex) { gl.deleteTexture(tex); tex = null; }
  orden = null; esperando = false; ultimaVista = null;

  pesoArchivo = buf.byteLength;
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const p = empaquetar(buf, maxTex);
  N = p.n;

  if (p.alto > maxTex) {
    morir("La nube no entra en una textura: hacen falta " + p.alto +
          " filas de " + p.ancho + " y esta placa admite " + maxTex +
          ". El techo son " + ((maxTex >> 1) * maxTex).toLocaleString("es-AR") +
          " gaussianas.");
    return;
  }
  tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, p.ancho, p.alto, 0,
                gl.RGBA_INTEGER, gl.UNSIGNED_INT, p.datos);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.uniform1i(uTex, 0);
  gl.uniform1ui(uMasc, p.mascara);
  gl.uniform1ui(uCorr, p.corr);
  // a siete millones de gaussianas la textura son 234 MB de video: en una
  // placa integrada puede no haber, y conviene decirlo en vez de dibujar negro
  const err = gl.getError();
  if (err === gl.OUT_OF_MEMORY) {
    morir("No entró en memoria de video: son " + N.toLocaleString("es-AR") +
          " gaussianas, " + Math.round(p.ancho*p.alto*16/1048576) +
          " MB de textura. Probá una nube más chica.");
    return;
  }

  const cc = cajaConstruida(buf, N) || p.caja;
  ajustarEncuadres(cc);
  rej = armarRejilla(buf, N, p.caja, lado3d(buf, N));
  fp.pos = [(p.caja[0]+p.caja[3])/2, 1.68, (p.caja[2]+p.caja[5])/2];
  ir(0, false);
  girando = true; $("#btGira").setAttribute("aria-pressed", "true");

  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type:"text/javascript" })));
  worker.postMessage({ pos: p.pos.buffer, n: N }, [p.pos.buffer]);
  worker.onmessage = (e) => {
    orden = e.data.orden;
    gl.bindBuffer(gl.ARRAY_BUFFER, vboIdx);
    gl.bufferData(gl.ARRAY_BUFFER, orden, gl.DYNAMIC_DRAW);
    esperando = false;
    msOrden = performance.now() - t0Orden;
  };

  $("#dN").textContent = N.toLocaleString("es-AR");
  $("#dCaja").textContent = Math.round(p.caja[3]-p.caja[0]) + " × " + Math.round(p.caja[5]-p.caja[2]) + " m";
  $("#dPeso").textContent = coma(pesoArchivo/1048576, 1) + " MB";
  $("#dSep").textContent = coma(lado3d(buf, N), 2) + " m";
  $("#dTomas").textContent = nombre === ARCHIVO ? TOMAS : "—";
  $("#panel header p").textContent = nombre === ARCHIVO
    ? "Un distrito en gaussianas 3D · color trazado con Cycles" : nombre;
  $("#panel").hidden = $("#datos").hidden = false;
  $("#carga").classList.add("ido");
  setTimeout(() => { $("#pista").style.opacity = 0; }, 6500);
  redimensionar();
  if (!lazoVivo) { lazoVivo = true; lazo(); }
  // el archivo puede pedir que arranque caminando; el pointer lock necesita un
  // gesto, así que se toma el mouse con el primer clic
  if (window.__PIE) setTimeout(entrarFP, 60);
}

/* --------------------------------------------------------------- mandos */
lienzo.addEventListener("contextmenu", (e) => e.preventDefault());
let arrastra = 0, ux = 0, uy = 0;
lienzo.addEventListener("pointerdown", (e) => {
  if (fp.on) { if (!document.pointerLockElement && lienzo.requestPointerLock) lienzo.requestPointerLock(); return; }
  arrastra = e.button === 2 ? 2 : 1; ux = e.clientX; uy = e.clientY;
  girando = false; viaje = null; $("#btGira").setAttribute("aria-pressed", "false");
  lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener("pointerup", () => { arrastra = 0; });
addEventListener("mousemove", (e) => {
  if (!fp.on || !document.pointerLockElement) return;
  fp.yaw -= e.movementX * 0.0022;
  fp.pit = Math.max(-1.35, Math.min(1.35, fp.pit - e.movementY * 0.0022));
});
lienzo.addEventListener("pointermove", (e) => {
  if (fp.on) return;
  if (!arrastra) return;
  const dx = e.clientX - ux, dy = e.clientY - uy; ux = e.clientX; uy = e.clientY;
  if (arrastra === 1) {
    cam.yaw -= dx * 0.005;
    cam.pit = Math.max(-0.15, Math.min(1.4, cam.pit + dy * 0.004));
  } else {
    const k = cam.dist * 0.0016;
    cam.blanco[0] -= (dx * Math.cos(cam.yaw) - 0) * k;
    cam.blanco[2] += (dx * Math.sin(cam.yaw)) * k;
    cam.blanco[1] = Math.max(0, cam.blanco[1] + dy * k);
  }
});
lienzo.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (fp.on) return;
  cam.dist = Math.max(CORREA ? 1.5 : 18, Math.min(CORREA ? 240 : 2200, cam.dist * Math.exp(e.deltaY * 0.0011)));
}, { passive:false });

$("#tam").addEventListener("input", (e) => $("#tamV").textContent = coma(+e.target.value));
if (window.__BRILLO) { $("#exp").value = brillo; $("#expV").textContent = coma(brillo); }
$("#exp").addEventListener("input", (e) => { brillo = +e.target.value; $("#expV").textContent = coma(brillo); });
$("#btGira").addEventListener("click", (e) => {
  girando = !girando; e.currentTarget.setAttribute("aria-pressed", String(girando));
  if (girando) viaje = null;
});
for (const b of document.querySelectorAll("#encuadres button"))
  b.addEventListener("click", () => ir(+b.dataset.v));
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (fp.on) {
    tecla[k] = true; tecla.shift = e.shiftKey;
    if (k === "v") fp.choque = !fp.choque;
    if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].indexOf(k) >= 0) e.preventDefault();
    return;
  }
  if (e.key >= "1" && e.key <= "4") ir(+e.key - 1);
  if (k === "f") entrarFP();
  if (e.key === " ") { e.preventDefault(); $("#btGira").click(); }
});
addEventListener("keyup", (e) => { tecla[e.key.toLowerCase()] = false; tecla.shift = e.shiftKey; });
addEventListener("blur", () => { for (const k in tecla) tecla[k] = false; });
$("#btPie").addEventListener("click", () => { fp.on ? salirFP() : entrarFP(); });

/* palanca táctil: la mitad izquierda mueve, la derecha mira */
const palanca = { act:false, x:0, z:0, id:-1, ox:0, oy:0 };
const mirada = { id:-1, x:0, y:0 };
lienzo.addEventListener("touchstart", (e) => {
  if (!fp.on) return;
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth*0.45 && !palanca.act) {
      palanca.act = true; palanca.id = t.identifier; palanca.ox = t.clientX; palanca.oy = t.clientY;
    } else if (mirada.id < 0) {
      mirada.id = t.identifier; mirada.x = t.clientX; mirada.y = t.clientY;
    }
  }
  e.preventDefault();
}, { passive:false });
lienzo.addEventListener("touchmove", (e) => {
  if (!fp.on) return;
  for (const t of e.changedTouches) {
    if (t.identifier === palanca.id) {
      palanca.x = Math.max(-1, Math.min(1, (t.clientX - palanca.ox)/70));
      palanca.z = Math.max(-1, Math.min(1, (palanca.oy - t.clientY)/70));
    } else if (t.identifier === mirada.id) {
      fp.yaw -= (t.clientX - mirada.x) * 0.005;
      fp.pit = Math.max(-1.35, Math.min(1.35, fp.pit - (t.clientY - mirada.y) * 0.005));
      mirada.x = t.clientX; mirada.y = t.clientY;
    }
  }
  e.preventDefault();
}, { passive:false });
function soltarTacto(e){
  for (const t of e.changedTouches) {
    if (t.identifier === palanca.id) { palanca.act = false; palanca.id = -1; palanca.x = palanca.z = 0; }
    if (t.identifier === mirada.id) mirada.id = -1;
  }
}
lienzo.addEventListener("touchend", soltarTacto);
lienzo.addEventListener("touchcancel", soltarTacto);
$("#btCaja").addEventListener("click", (e) => {
  /* "Nube": achica las gaussianas hasta que se ven como puntos sueltos, que es
     lo que hay abajo de la superficie continua */
  nube = !nube; e.currentTarget.setAttribute("aria-pressed", String(nube));
  $("#tam").value = nube ? 0.5 : 1;
  $("#tamV").textContent = coma(+$("#tam").value);
});

function redimensionar(){
  const r = Math.min(devicePixelRatio, 1.75);
  lienzo.width = Math.floor(innerWidth * r);
  lienzo.height = Math.floor(innerHeight * r);
  lienzo.style.width = innerWidth + "px";
  lienzo.style.height = innerHeight + "px";
  gl.viewport(0, 0, lienzo.width, lienzo.height);
}
addEventListener("resize", redimensionar);

/* ---------------------------------------------------------------- lazo */
let esperando = false, t0Orden = 0, ultimaVista = null, cuadros = 0, desde = performance.now();
function lazo(){
  requestAnimationFrame(lazo);
  const ahora = performance.now();
  const dt = Math.min(0.1, (ahora - (fp.t || ahora))/1000); fp.t = ahora;
  avanzarViaje();
  if (fp.on) caminar(dt);
  else if (girando) cam.yaw += 0.0016;

  const V = matVista(), P = matProy();

  // re-ordenar sólo cuando la cámara se movió de verdad
  if (worker && !esperando) {
    const fila = [V[2], V[6], V[10]];
    if (!ultimaVista || Math.abs(fila[0]-ultimaVista[0]) + Math.abs(fila[1]-ultimaVista[1])
                      + Math.abs(fila[2]-ultimaVista[2]) > 0.0008) {
      ultimaVista = fila; esperando = true; t0Orden = performance.now();
      worker.postMessage({ vista: fila });
    }
  }

  gl.clearColor(0.043, 0.047, 0.063, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // el cielo primero y opaco, que las gaussianas se compongan encima
  gl.disable(gl.BLEND);
  gl.useProgram(progCielo);
  gl.bindVertexArray(vaoCielo);
  const tf = Math.tan(cam.fov * Math.PI / 360);
  gl.uniformMatrix4fv(uCVista, false, V);
  gl.uniform2fv(uCEsc, [tf * lienzo.width / lienzo.height, tf]);
  gl.uniform1f(uCBrillo, Math.min(1.35, 0.55 + 0.45 * brillo));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.enable(gl.BLEND);
  gl.useProgram(prog);
  gl.bindVertexArray(vaoSplat);

  if (orden) {
    gl.uniformMatrix4fv(uProy, false, P);
    gl.uniformMatrix4fv(uVista, false, V);
    gl.uniform2fv(uFocal, [P[0] * lienzo.width * 0.5, P[5] * lienzo.height * 0.5]);
    gl.uniform2fv(uPant, [lienzo.width, lienzo.height]);
      gl.uniform1f(uTam, +$("#tam").value);
    gl.uniform1f(uBrillo, brillo);
    gl.uniform1i(uModo, modo);
    gl.uniform1f(uNiebla, NIEBLA_K);
    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, N);
  }

  cuadros++;
  const t = performance.now();
  if (t - desde >= 500) {
    $("#fps").textContent = Math.round(cuadros * 1000 / (t - desde));
    $("#dibu").textContent = N.toLocaleString("es-AR");
    $("#ord").textContent = msOrden.toFixed(1).replace(".", ",");
    cuadros = 0; desde = t;
  }
}

window.visor = { cam, gl, fp, tecla, entrarFP, salirFP,
  get rejilla(){ return rej && { nx:rej.nx, nz:rej.nz, umbral:rej.umbral,
    llenas: rej.c.reduce((a, v) => a + (v >= rej.umbral ? 1 : 0), 0) }; },
  set modo(v){ modo = v|0; },
  get modo(){ return modo; },
  info: () => ({ N, dist: Math.round(cam.dist), msOrden: +msOrden.toFixed(1),
                 error: gl.getError(), tam: +$("#tam").value,
                 blanco: cam.blanco.map((v) => Math.round(v)) }) };

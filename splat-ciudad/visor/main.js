import { empaquetar, VERT, FRAG, VERT_CIELO, FRAG_CIELO, WORKER, CUANTOS } from "./splat.js";

const $ = (s) => document.querySelector(s);
const ARCHIVO = "./ciudad.splat";
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
      uBrillo = U("brillo"), uModo = U("modo"), uNiebla = U("niebla");

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
  { blanco:[0, 48, 0],    dist:365, yaw:0.92,  pit:0.22,  fov:51 },   // aérea
  { blanco:[0, 62, 0],    dist:300, yaw:2.34,  pit:0.05,  fov:54 },   // perfil
  { blanco:[-120, 22, -52], dist:210, yaw:1.571, pit:0.09, fov:54 }, // avenida
  { blanco:[0, 26, -52],  dist:130, yaw:1.571, pit:0.13,  fov:52 },  // manzana
];
/* La caja de lo CONSTRUIDO, que no es la de la nube: el piso llega bastante más
   lejos que la ciudad —si el plano termina donde termina la ciudad, la nube
   flota como una maqueta— y encuadrando por la caja entera los edificios
   quedaban en una franja del medio. Se mira una de cada tres gaussianas y sólo
   las de más de 8 m de altura. */
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
  const lado = Math.max(caja[3]-caja[0], caja[5]-caja[2]);
  const cx = (caja[0]+caja[3])/2, cz = (caja[2]+caja[5])/2;
  // Todo sale del lado de la huella, no del alto. Encuadrar por el alto para
  // que entren las torres enteras deja la nube como una maqueta flotando en
  // una losa; que las torres se vayan de cuadro es lo que hace una foto.
  ENCUADRES[0].blanco = [cx, lado*0.10, cz];  ENCUADRES[0].dist = lado*0.62;
  ENCUADRES[1].blanco = [cx, lado*0.11, cz];  ENCUADRES[1].dist = lado*0.52;
}
let girando = true, nube = false, brillo = 1.0, modo = 0;

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
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const cp = Math.cos(cam.pit), sp = Math.sin(cam.pit);
  const ojo = [
    cam.blanco[0] + cam.dist * cp * sy,
    cam.blanco[1] + cam.dist * sp,
    cam.blanco[2] + cam.dist * cp * cy,
  ];
  let z = [ojo[0]-cam.blanco[0], ojo[1]-cam.blanco[1], ojo[2]-cam.blanco[2]];
  let l = Math.hypot(...z); z = z.map((v) => v/l);
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
  const f = 1 / Math.tan(cam.fov * Math.PI / 360);
  const a = lienzo.width / lienzo.height;
  const near = 1.0, far = 4000;
  return [ f/a,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0 ];
}

/* --------------------------------------------------------------- carga */
$("#riel i").style.width = "6%";
fetch(ARCHIVO).then(async (r) => {
  if (!r.ok) throw new Error("HTTP " + r.status);
  const total = +r.headers.get("content-length") || 0;
  const trozos = []; let leido = 0;
  const lector = r.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value); leido += value.length;
    if (total) {
      const v = 0.06 + 0.84 * leido / total;
      $("#riel i").style.width = (v*100).toFixed(0) + "%";
      $("#pct").textContent = Math.round(v*100) + " %";
    }
  }
  const buf = new Uint8Array(leido); let o = 0;
  for (const t of trozos) { buf.set(t, o); o += t.length; }
  return buf.buffer;
}).then(arrancar).catch((e) => morir("No se pudo leer el archivo de gaussianas: " + (e.message || e)));

let N = 0, orden = null, worker = null, msOrden = 0, pesoArchivo = 0;

function arrancar(buf){
  pesoArchivo = buf.byteLength;
  const p = empaquetar(buf);
  N = p.n;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, p.ancho, p.alto, 0,
                gl.RGBA_INTEGER, gl.UNSIGNED_INT, p.datos);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.uniform1i(uTex, 0);

  ajustarEncuadres(cajaConstruida(buf, N) || p.caja);
  ir(0, false);
  girando = true; $("#btGira").setAttribute("aria-pressed", "true");

  worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type:"text/javascript" })));
  worker.postMessage({ datos: p.datos.buffer.slice(0), n: N });
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
  // grano: la mediana del lado mayor de la gaussiana, sobre una muestra
  const fs = new Float32Array(buf), m = Math.min(N, 24000), lados = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const j = ((i * 7919) % N) | 0;
    lados[i] = 2 * Math.max(fs[8*j+3], fs[8*j+4]);
  }
  lados.sort();
  $("#dSep").textContent = coma(lados[m >> 1], 2) + " m";
  $("#dTomas").textContent = TOMAS;
  $("#panel").hidden = $("#datos").hidden = false;
  $("#carga").classList.add("ido");
  setTimeout(() => { $("#pista").style.opacity = 0; }, 6500);
  redimensionar();
  lazo();
}

/* --------------------------------------------------------------- mandos */
lienzo.addEventListener("contextmenu", (e) => e.preventDefault());
let arrastra = 0, ux = 0, uy = 0;
lienzo.addEventListener("pointerdown", (e) => {
  arrastra = e.button === 2 ? 2 : 1; ux = e.clientX; uy = e.clientY;
  girando = false; viaje = null; $("#btGira").setAttribute("aria-pressed", "false");
  lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener("pointerup", () => { arrastra = 0; });
lienzo.addEventListener("pointermove", (e) => {
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
  cam.dist = Math.max(18, Math.min(2200, cam.dist * Math.exp(e.deltaY * 0.0011)));
}, { passive:false });

$("#tam").addEventListener("input", (e) => $("#tamV").textContent = coma(+e.target.value));
$("#exp").addEventListener("input", (e) => { brillo = +e.target.value; $("#expV").textContent = coma(brillo); });
$("#btGira").addEventListener("click", (e) => {
  girando = !girando; e.currentTarget.setAttribute("aria-pressed", String(girando));
  if (girando) viaje = null;
});
for (const b of document.querySelectorAll("#encuadres button"))
  b.addEventListener("click", () => ir(+b.dataset.v));
addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "4") ir(+e.key - 1);
  if (e.key === " ") { e.preventDefault(); $("#btGira").click(); }
});
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
  avanzarViaje();
  if (girando) cam.yaw += 0.0016;

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
    gl.uniform1f(uNiebla, 1.0);
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

window.visor = { cam, gl,
  set modo(v){ modo = v|0; },
  get modo(){ return modo; },
  info: () => ({ N, dist: Math.round(cam.dist), msOrden: +msOrden.toFixed(1),
                 error: gl.getError(), tam: +$("#tam").value,
                 blanco: cam.blanco.map((v) => Math.round(v)) }) };

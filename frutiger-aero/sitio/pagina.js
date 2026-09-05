/* ---------------------------------------------------------------------------
   Lo que se mueve: el visor 3D, las listas que se arman solas, el reflejo del
   vidrio y la barra de arriba.
   --------------------------------------------------------------------------- */
import * as THREE from "./vendor/three.module.min.js";
import { cargarGlb, encuadrar } from "./visor.js";
import { PANTALLAS } from "./pantallas.js";

const $ = (id) => document.getElementById(id);

/* =====================  el reflejo del vidrio  =====================
   El ::after de cada pieza es un brillo radial centrado en --mx/--my. Se
   escribe acá, en coordenadas de la pieza, no de la ventana: si no, el brillo
   de una hoja de abajo aparece corrido. */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  for (const p of document.querySelectorAll(".vidrio")) {
    p.addEventListener("pointermove", ev => {
      const c = p.getBoundingClientRect();
      p.style.setProperty("--mx", (ev.clientX - c.left) + "px");
      p.style.setProperty("--my", (ev.clientY - c.top) + "px");
    });
  }
}

/* =====================  los personajes  ===================== */

const BICHOS = [
  { a:"p-usuario", n:"El monigote", c:"#4fc3f7", d:"El de las cuentas de usuario.", giro:0 },
  { a:"p-delfin",  n:"El delfín",   c:"#29b6f6", d:"El del salvapantallas.",       giro:-0.55 },
  /* El pez es plano: de frente se ve de canto. El cuarto de vuelta es obligatorio. */
  { a:"p-pez",     n:"El pez",      c:"#ffd54f", d:"El de toda pantalla submarina.", giro:Math.PI/2 },
  /* El robot salió mirando para atrás: sin este giro se lo ve de espaldas. */
  { a:"p-robot3",  n:"El robot",    c:"#4fc3f7", d:"La cara amable de la tecnología.", giro:4.7 },
  { a:"p-pajaro",  n:"El pajarito", c:"#42a5f5", d:"Así se dibujaba «internet».",  giro:0 },
  { a:"p-medusa",  n:"La medusa",   c:"#e0f7fa", d:"La que mejor queda de vidrio.", giro:0 },
];

const lienzo = $("lienzo");
const motor = new THREE.WebGLRenderer({ canvas:lienzo, antialias:true, alpha:true });
motor.setPixelRatio(Math.min(devicePixelRatio, 2));
motor.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(32, 900 / 620, .1, 100);
escena.add(new THREE.HemisphereLight(0xcfe9ff, 0x123a6b, 2.0));
const sol = new THREE.DirectionalLight(0xffffff, 2.3); sol.position.set(2.4, 3, 4);
const relleno = new THREE.DirectionalLight(0x9fd0ff, 1.0); relleno.position.set(-3, 1, -2);
escena.add(sol, relleno);

let actual = null, materialesOriginales = [], elegido = 0;
let girando = true, deVidrio = false;
let giroY = 0, giroX = 0, lejos = 3.7;

function medirLienzo(){
  const an = lienzo.clientWidth || 900;
  const al = Math.round(an * 620 / 900);
  motor.setSize(an, al, false);
  camara.aspect = an / al; camara.updateProjectionMatrix();
}
addEventListener("resize", medirLienzo);

/* El vidrio se pone acá, no en el modelo: ningún generador de imagen-a-3D
   devuelve transparencia, hornea una textura opaca. Se usa su geometría. */
const VIDRIO = new THREE.MeshPhysicalMaterial({
  color:0xbfe9ff, transmission:.92, thickness:.6, roughness:.08, metalness:0,
  ior:1.35, clearcoat:1, clearcoatRoughness:.06, transparent:true, opacity:.95,
});

function aplicarMaterial(){
  if (!actual) return;
  let i = 0;
  actual.traverse(o => { if (o.isMesh) o.material = deVidrio ? VIDRIO : materialesOriginales[i++]; });
}

async function mostrar(i){
  elegido = i;
  document.querySelectorAll("#fichas .ficha").forEach((b, n) =>
    b.setAttribute("aria-pressed", String(n === i)));
  $("cargando").hidden = false;
  $("cargando").textContent = "Cargando " + BICHOS[i].n.toLowerCase() + "…";
  try {
    const crudo = await cargarGlb("modelos/" + BICHOS[i].a + ".glb");
    if (elegido !== i) return;                       // llegó tarde: ya eligieron otro
    if (actual) { escena.remove(actual); tirar(actual); }
    materialesOriginales = [];
    crudo.traverse(o => { if (o.isMesh) materialesOriginales.push(o.material); });
    actual = encuadrar(crudo);
    giroY = BICHOS[i].giro; giroX = 0; lejos = 3.7;
    escena.add(actual);
    aplicarMaterial();
    $("cargando").hidden = true;
  } catch (e) {
    $("cargando").hidden = false;
    $("cargando").textContent = "No se pudo cargar este personaje.";
    console.error(e);
  }
}

function tirar(obj){
  obj.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of [].concat(o.material)) {
      for (const k of ["map","normalMap","roughnessMap","metalnessMap"]) m[k]?.dispose();
      if (m !== VIDRIO) m.dispose();
    }
  });
}

$("fichas").innerHTML = BICHOS.map((b, i) => `
  <button class="ficha" type="button" data-i="${i}" aria-pressed="${i === 0}">
    <span class="bolo" style="background:radial-gradient(circle at 34% 28%, #fff, ${b.c} 38%, #0a3a70)"></span>
    <span><b>${b.n}</b><small>${b.d}</small></span>
  </button>`).join("");
$("fichas").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-i]"); if (b) mostrar(+b.dataset.i);
});

function quieto(){
  girando = false;
  $("btGirar").setAttribute("aria-pressed", "false");
  $("btGirar").textContent = "Quieto";
}
$("btGirar").addEventListener("click", () => {
  girando = !girando;
  $("btGirar").setAttribute("aria-pressed", String(girando));
  $("btGirar").textContent = girando ? "Girando" : "Quieto";
});
$("btVidrio").addEventListener("click", () => {
  deVidrio = !deVidrio;
  $("btVidrio").setAttribute("aria-pressed", String(deVidrio));
  aplicarMaterial();
});
$("btCentrar").addEventListener("click", () => {
  giroY = BICHOS[elegido].giro; giroX = 0; lejos = 3.7;
});

/* Arrastrar y rueda a mano: OrbitControls vive en `examples/jsm`, que no está
   publicado en cdnjs junto al three que usa esta página. Son treinta líneas. */
let arrastrando = false, deX = 0, deY = 0;
lienzo.addEventListener("pointerdown", ev => {
  arrastrando = true; deX = ev.clientX; deY = ev.clientY;
  lienzo.setPointerCapture(ev.pointerId); quieto();
});
lienzo.addEventListener("pointermove", ev => {
  if (!arrastrando) return;
  giroY += (ev.clientX - deX) * .01;
  giroX = Math.max(-1.2, Math.min(1.2, giroX + (ev.clientY - deY) * .01));
  deX = ev.clientX; deY = ev.clientY;
});
for (const e of ["pointerup", "pointercancel"]) lienzo.addEventListener(e, () => arrastrando = false);
lienzo.addEventListener("wheel", ev => {
  ev.preventDefault();
  lejos = Math.max(2.2, Math.min(7, lejos + ev.deltaY * .003));
}, { passive:false });

function cuadro(){
  requestAnimationFrame(cuadro);
  if (actual) {
    if (girando) giroY += .006;
    actual.rotation.set(giroX, giroY, 0);
  }
  camara.position.set(0, 0, lejos);
  motor.render(escena, camara);
}
medirLienzo(); cuadro(); mostrar(0);

/* =====================  las listas  ===================== */

/* Cada lista es ícono + nombre + una línea. Antes eran párrafos y nadie los leía. */
function tarjetas(donde, filas){
  $(donde).innerHTML = filas.map(([ic, t, d]) => `
    <article class="tarjeta">
      <img src="img/ic/${ic}.webp" alt="" width="256" height="256" loading="lazy">
      <div class="txt"><h3>${t}</h3><p>${d}</p></div>
    </article>`).join("");
}

tarjetas("rejKit", [
  ["i-burbuja",  "La burbuja",  "Brillo arriba, aro de luz, reflejo abajo."],
  ["i-agua",     "El agua",     "Vista desde abajo, con rayos de sol."],
  ["i-orbe2",    "El orbe",     "El botón «Web 2.0». Estuvo en todo."],
  ["i-gota",     "La gota",     "Lo que hace que una hoja se vea recién lavada."],
  ["i-aluminio", "El aluminio", "El contrapeso frío, siempre cepillado."],
  ["i-ventana",  "El vidrio",   "Ventanas que dejaban ver lo de atrás."],
]);

const LINEA = [
  ["2000", "Mac OS X estrena «Aqua». Apple inventa el idioma."],
  ["2001", "Windows XP y su loma verde: la foto que más gente vio."],
  ["2006", "Vista trae Aero Glass. Ventanas translúcidas de verdad."],
  ["2006", "La Wii: blanco, redondo y con sonido de burbujas."],
  ["2007", "El primer iPhone. Cuero falso y madera en la pantalla."],
  ["2010", "Windows Phone estrena Metro. Nada de brillo."],
  ["2012", "Windows 8 tira el vidrio a la basura."],
  ["2013", "iOS 7 borra todos los brillos. Se terminó."],
  ["2017", "Recién ahí alguien le pone nombre: «Frutiger Aero»."],
  ["2025", "Apple presenta Liquid Glass. El vidrio vuelve."],
];
$("rejLinea").innerHTML = LINEA.map(([a, d]) =>
  `<div class="hito"><b>${a}</b><p>${d}</p></div>`).join("");

tarjetas("rejDonde", [
  ["i-vidrio",   "Windows Vista / 7",  "Aero Glass. De acá sale medio nombre."],
  ["i-gel",      "Mac OS X «Aqua»",    "Llegó primero, en 2000."],
  ["i-consola",  "Nintendo Wii",       "Blanco, redondo y con sonido de burbujas."],
  ["i-cruz",     "PlayStation 3",      "La cruz sobre un fondo de ondas."],
  ["i-musica",   "iPod · Zune",        "El objeto era tan Aero como la pantalla."],
  ["i-telefono", "iPhone, hasta iOS 6", "Iconos con lomo brillante y cuero falso."],
]);

tarjetas("rejFinal", [
  ["i-telefono", "Pantallas chicas", "Cuatro degradados no se leen a cinco centímetros."],
  ["i-bateria",  "Batería contada",  "El vidrio con desenfoque se la comía."],
  ["i-burbuja",  "Cambio de humor",  "Después de 2008 el brillo sonaba a mentira."],
]);

/* =====================  las estéticas  ===================== */

const ESTETICAS = [
  ["e-aero",      "Frutiger Aero",     "2004 – 2012 · agua, vidrio y pasto"],
  ["e-dreamcore", "Dreamcore",         "Un lugar conocido que está mal"],
  ["e-weirdcore", "Weirdcore",         "Lo mismo, pero mareado y en baja resolución"],
  ["e-liminal",   "Espacios liminales", "El pasillo sin nadie, a las cuatro de la mañana"],
  ["e-vaporwave", "Vaporwave",         "El shopping de 1993 visto desde 2012"],
  ["e-y2k",       "Y2K cromado",        "Mercurio, destellos y CD-ROM"],
  ["e-metro",     "Frutiger Metro",    "El punto justo antes de tirar el brillo"],
  ["e-cassette",  "Cassette futurism", "El futuro cuando todavía era beige"],
];
$("laminas").innerHTML = ESTETICAS.map(([a, t, d], i) => `
  <button class="lamina" type="button" data-i="${i}">
    <img src="img/est/${a}-min.webp" alt="${t}" width="520" height="330" loading="lazy">
    <span class="txt"><b>${t}</b><small>${d}</small></span>
  </button>`).join("");

let mirandoEst = 0;
function verEstetica(i){
  mirandoEst = (i + ESTETICAS.length) % ESTETICAS.length;
  const [a, t, d] = ESTETICAS[mirandoEst];
  $("lupaImg").src = "img/est/" + a + ".webp";
  $("lupaImg").alt = t;
  $("lupaPie").textContent = t + "  ·  " + d + "  ·  flechas para pasar";
  abrir($("lupa"));
}
$("laminas").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-i]"); if (b) verEstetica(+b.dataset.i);
});

/* =====================  las pantallas de error  ===================== */

/* El nodo se dibuja a 960x600 y se escala al hueco que tenga. La miniatura y la
   vista grande son el mismo HTML: dos copias se desincronizan tarde o temprano. */
const ANCHO = 960, ALTO = 600;
function escalar(marco){
  const tele = marco.querySelector(".tele");
  if (!tele) return;
  const c = marco.getBoundingClientRect();
  tele.style.transform = "scale(" + Math.min(c.width / ANCHO, c.height / ALTO) + ")";
}

$("pantallas").innerHTML = PANTALLAS.map((p, i) => `
  <button class="pant" type="button" data-i="${i}">
    <span class="marco"><span class="tele">${p.html}</span></span>
    <span class="pie2">${p.nombre}<small>${p.pie}</small></span>
  </button>`).join("");
const marcos = [...document.querySelectorAll("#pantallas .marco")];
marcos.forEach(escalar);
addEventListener("resize", () => { marcos.forEach(escalar); ajustarTv(); });

let mirandoTv = 0;
function ajustarTv(){
  const m = $("tvMarco");
  if (!m.firstChild) return;
  const k = Math.min((innerWidth - 40) / ANCHO, (innerHeight - 130) / ALTO);
  m.style.width = ANCHO * k + "px"; m.style.height = ALTO * k + "px";
  m.querySelector(".tele").style.transform = "scale(" + k + ")";
}
function verPantalla(i){
  mirandoTv = (i + PANTALLAS.length) % PANTALLAS.length;
  const p = PANTALLAS[mirandoTv];
  $("tvMarco").innerHTML = `<span class="tele">${p.html}</span>`;
  $("tvPie").textContent = p.nombre + "  ·  " + p.pie + "  ·  flechas para pasar";
  abrir($("tv"));
  ajustarTv();
}
$("pantallas").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-i]"); if (b) verPantalla(+b.dataset.i);
});

/* =====================  los dos visores  ===================== */

function abrir(caja){ caja.classList.add("ver"); document.body.style.overflow = "hidden"; }
function cerrar(caja){ caja.classList.remove("ver"); document.body.style.overflow = ""; }
for (const [caja, boton] of [[$("lupa"), "cerrarLupa"], [$("tv"), "cerrarTv"]]) {
  caja.addEventListener("click", ev => {
    if (ev.target === caja || ev.target.id === boton) cerrar(caja);
  });
}
addEventListener("keydown", ev => {
  const est = $("lupa").classList.contains("ver"), tele = $("tv").classList.contains("ver");
  if (!est && !tele) return;
  if (ev.key === "Escape") cerrar(est ? $("lupa") : $("tv"));
  if (ev.key === "ArrowRight") est ? verEstetica(mirandoEst + 1) : verPantalla(mirandoTv + 1);
  if (ev.key === "ArrowLeft")  est ? verEstetica(mirandoEst - 1) : verPantalla(mirandoTv - 1);
});

/* =====================  la barra  ===================== */

const enlaces = [...document.querySelectorAll("#nav a")];
const mirador = new IntersectionObserver(entradas => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    for (const a of enlaces)
      a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + e.target.id));
  }
}, { rootMargin:"-45% 0px -50% 0px" });
for (const s of document.querySelectorAll("section[id]")) mirador.observe(s);

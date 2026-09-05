/* ---------------------------------------------------------------------------
   Lo que se mueve: el visor 3D, las listas que se arman solas, el reflejo del
   vidrio y la barra de arriba.
   --------------------------------------------------------------------------- */
import * as THREE from "./vendor/three.module.min.js";
import { cargarGlb, encuadrar } from "./visor.js";

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

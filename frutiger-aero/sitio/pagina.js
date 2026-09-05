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
  { a:"p-usuario", n:"El monigote", c:"#4fc3f7",
    d:"El de las cuentas de usuario. Sin cara, sin manos: sos vos, pero de plástico.", giro:0 },
  { a:"p-delfin",  n:"El delfín",   c:"#29b6f6",
    d:"Saltando y mojado. Estuvo en salvapantallas, publicidades de agua y carpetas escolares.",
    giro:-0.55 },
  { a:"p-pez",     n:"El pez",      c:"#ffd54f",
    /* Es plano: de frente se ve de canto. El cuarto de vuelta es obligatorio. */
    d:"Amarillo con bandas negras. Toda pantalla submarina tenía uno adelante.", giro:Math.PI/2 },
  { a:"p-robot3",  n:"El robot",    c:"#4fc3f7",
    /* Salió mirando para atrás: sin este giro se lo ve de espaldas. */
    d:"Blanco brillante y celeste, con dos ojos y una sonrisa. La cara amable de la tecnología.",
    giro:4.7 },
  { a:"p-pajaro",  n:"El pajarito", c:"#42a5f5",
    d:"Redondo, celeste y con pico naranja. La forma en que se dibujaba «internet».", giro:0 },
  { a:"p-medusa",  n:"La medusa",   c:"#e0f7fa",
    d:"Sale sin color a propósito: es la que mejor queda con el material de vidrio.", giro:0 },
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

const KIT = [
  ["La burbuja", "La pieza central. Brillo arriba a la izquierda, aro de luz en el borde y un reflejo chiquito abajo. Sin esos tres, es un círculo."],
  ["El agua", "Vista desde abajo, con los rayos de sol entrando en abanico. Toda pantalla que se preciara tenía un pez."],
  ["El orbe", "El botón «Web 2.0»: degradado vertical, brillo elíptico en la mitad de arriba y sombra abajo. Estuvo en absolutamente todo."],
  ["La gota", "Agua quieta sobre una superficie. Es lo que hace que una hoja se vea recién lavada en vez de simplemente verde."],
  ["El aluminio", "El contrapeso frío. Cepillado, siempre horizontal, para que el plástico brillante no quedara de juguete."],
  ["El vidrio", "Ventanas que dejaban ver lo de atrás, borroso y teñido. Aero Glass le puso nombre y le puso precio: hacía falta placa de video."],
];
$("rejKit").innerHTML = KIT.map(([t, d], i) =>
  `<article class="tarjeta"><span class="num">${i + 1}</span><h3>${t}</h3><p>${d}</p></article>`).join("");

const LINEA = [
  ["2000", "Mac OS X estrena «Aqua»: botones de gel, barras a rayas y reflejos. Apple inventa el idioma."],
  ["2001", "Windows XP sale con Bliss de fondo: una loma verde y un cielo azul. Es la foto que más gente vio en la historia."],
  ["2006", "Windows Vista trae Aero Glass. Ventanas translúcidas de verdad, con desenfoque. De acá sale la mitad del nombre."],
  ["2006", "La Wii y el Canal Mii: blanco, redondo y con sonido de burbujas. Entra a casas que no tenían computadora."],
  ["2007", "El primer iPhone. Iconos con lomo brillante y el estante de madera de los libros: skeuomorfismo puro."],
  ["2010", "Empieza el cansancio. Windows Phone estrena Metro: tipografía grande, colores planos, nada de brillo."],
  ["2012", "Windows 8 tira el vidrio a la basura. Cuadrados de color liso en pantalla completa."],
  ["2013", "iOS 7. En una tarde, el teléfono más copiado del mundo borra todos los brillos. Se terminó."],
  ["2017", "Alguien en internet le pone nombre: «Frutiger Aero», por la tipografía de Adrian Frutiger y el Aero de Vista. Cuatro años tarde."],
  ["2025", "Apple presenta Liquid Glass. El vidrio vuelve, ahora sin burbujas y con los bordes doblando la luz."],
];
$("rejLinea").innerHTML = LINEA.map(([a, d]) =>
  `<div class="hito"><b>${a}</b><p>${d}</p></div>`).join("");

const LUGARES = [
  ["Windows Vista / 7", "Aero Glass: ventanas translúcidas con desenfoque real, el orbe de inicio y los gadgets de la barra lateral. Es de donde sale la mitad del nombre."],
  ["Mac OS X «Aqua»", "Llegó primero, en 2000: botones de gel, barras a rayas y el Dock con reflejo. Apple inventó el idioma y Microsoft lo hizo masivo."],
  ["Nintendo Wii", "Blanco, redondo y con sonido de burbujas. El Canal Mii y el pronóstico del tiempo eran interfaces de vidrio para toda la familia."],
  ["PlayStation 3 · XMB", "Una cruz de iconos sobre un fondo de ondas que cambiaba de color según el mes. Puro brillo, puro degradado."],
  ["Zune · iPod · Nokia", "Reproductores con carcasa de plástico brillante y menús con reflejo. El objeto era tan Aero como la pantalla."],
  ["El iPhone antes de iOS 7", "Iconos con lomo brillante, la libreta con textura de cuero, el estante de madera. Skeuomorfismo puro, la última etapa."],
];
$("rejDonde").innerHTML = LUGARES.map(([t, d]) =>
  `<article class="tarjeta"><h3>${t}</h3><p>${d}</p></article>`).join("");

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

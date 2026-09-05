/* ---------------------------------------------------------------------------
   Todo lo que se mueve en la página: el visor 3D, las rejillas que se arman
   solas, la lupa de los fondos y la barra de abajo.
   --------------------------------------------------------------------------- */
import * as THREE from "./vendor/three.module.min.js";
import { cargarGlb, encuadrar } from "./visor.js";

const $ = (id) => document.getElementById(id);

/* =====================  los personajes  ===================== */

const BICHOS = [
  { a:"p-usuario", n:"El monigote",  c:"#4fc3f7",
    d:"El de las cuentas de usuario. Sin cara, sin manos: sos vos, pero de plástico.",
    giro:0 },
  { a:"p-delfin",  n:"El delfín",    c:"#29b6f6",
    d:"Saltando y mojado. Estuvo en salvapantallas, publicidades de agua y carpetas escolares.",
    giro:-0.55 },
  { a:"p-pez",     n:"El pez",       c:"#ffd54f",
    /* Es plano y de frente se ve de canto: hay que girarlo un cuarto de vuelta. */
    d:"Amarillo con bandas negras. Toda pantalla submarina tenía uno adelante.", giro:Math.PI/2 },
  { a:"p-robot3",  n:"El robot",     c:"#4fc3f7",
    /* Salió mirando para atrás: sin este giro se lo ve de espaldas. */
    d:"Blanco brillante y celeste, con dos ojos y una sonrisa. La cara amable de la tecnología.",
    giro:4.7 },
  { a:"p-pajaro",  n:"El pajarito",  c:"#42a5f5",
    d:"Redondo, celeste y con pico naranja. La forma en que se dibujaba «internet».", giro:0 },
  { a:"p-medusa",  n:"La medusa",    c:"#e0f7fa",
    d:"Sale sin color a propósito: es la que mejor queda con el material de vidrio.", giro:0 },
];

const lienzo = $("lienzo");
const motor = new THREE.WebGLRenderer({ canvas:lienzo, antialias:true, alpha:true });
motor.setPixelRatio(Math.min(devicePixelRatio, 2));
motor.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(32, 900 / 620, .1, 100);
escena.add(new THREE.HemisphereLight(0xdff6ff, 0x2e6b33, 2.1));
const sol = new THREE.DirectionalLight(0xffffff, 2.3); sol.position.set(2.4, 3, 4);
const relleno = new THREE.DirectionalLight(0xbfe8ff, .9); relleno.position.set(-3, 1, -2);
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
    <span class="bolo" style="background:radial-gradient(circle at 34% 28%, #fff, ${b.c} 38%, #0a4f86)"></span>
    <span><b>${b.n}</b><small>${b.d}</small></span>
  </button>`).join("");
$("fichas").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-i]"); if (b) mostrar(+b.dataset.i);
});

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

/* Arrastrar y rueda a mano: los OrbitControls viven en `examples/jsm`, que no
   está publicado en ningún CDN junto al three de cdnjs. Son treinta líneas. */
let arrastrando = false, deX = 0, deY = 0;
lienzo.addEventListener("pointerdown", ev => {
  arrastrando = true; deX = ev.clientX; deY = ev.clientY;
  lienzo.setPointerCapture(ev.pointerId); girando = false;
  $("btGirar").setAttribute("aria-pressed", "false"); $("btGirar").textContent = "Quieto";
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

/* =====================  dónde vivía  ===================== */

const LUGARES = [
  ["Windows Vista / 7", "Aero Glass: ventanas translúcidas con desenfoque real, el orbe de inicio y los gadgets de la barra lateral. Es de donde sale la mitad del nombre."],
  ["Mac OS X «Aqua»", "Llegó primero, en 2000: botones de gel, barras a rayas y el Dock con reflejo. Apple inventó el idioma y Microsoft lo hizo masivo."],
  ["Nintendo Wii", "Blanco, redondo y con sonido de burbujas. El Canal Mii y el pronóstico del tiempo eran interfaces de vidrio para toda la familia."],
  ["PlayStation 3 · XMB", "Una cruz de iconos sobre un fondo de ondas que cambiaba de color según el mes. Puro brillo, puro degradado."],
  ["Zune · iPod · Nokia", "Reproductores con carcasa de plástico brillante y menús con reflejo. El objeto era tan Aero como la pantalla."],
  ["El iPhone antes de iOS 7", "Iconos con lomo brillante, la libreta con textura de cuero, el estante de madera de los libros. Skeuomorfismo puro, la última etapa."],
];
$("rejDonde").innerHTML = LUGARES.map(([t, d]) =>
  `<article class="pieza"><div class="txt"><h3>${t}</h3><p>${d}</p></div></article>`).join("");

/* =====================  los fondos  ===================== */

const FONDOS = [
  ["galeria-1","Burbujas"],   ["galeria-2","Acuario"],  ["galeria-3","Mitad y mitad"],
  ["galeria-4","El monitor"], ["galeria-5","El globo"], ["galeria-6","Medusas"],
  ["galeria-7","Orbes"],      ["galeria-8","Vidrio"],
];
$("galeria").innerHTML = FONDOS.map(([a, t], i) =>
  `<button type="button" data-i="${i}">
     <img src="img/${a}.webp" alt="${t}" width="700" height="700" loading="lazy">
     <span>${t}</span></button>`).join("");

let viendo = 0;
function verFondo(i){
  viendo = (i + FONDOS.length) % FONDOS.length;
  $("lupaImg").src = "img/" + FONDOS[viendo][0] + ".webp";
  $("lupaImg").alt = FONDOS[viendo][1];
  $("lupaPie").textContent = FONDOS[viendo][1] + "  ·  " + (viendo + 1) + " de " + FONDOS.length +
    "  ·  flechas para pasar";
  $("lupa").classList.add("ver");
  document.body.style.overflow = "hidden";
}
function cerrarLupa(){ $("lupa").classList.remove("ver"); document.body.style.overflow = ""; }
$("galeria").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-i]"); if (b) verFondo(+b.dataset.i);
});
$("lupa").addEventListener("click", ev => {
  if (ev.target === $("lupa") || ev.target.id === "cerrarLupa") cerrarLupa();
});
addEventListener("keydown", ev => {
  if (!$("lupa").classList.contains("ver")) return;
  if (ev.key === "Escape") cerrarLupa();
  if (ev.key === "ArrowRight") verFondo(viendo + 1);
  if (ev.key === "ArrowLeft") verFondo(viendo - 1);
});

/* =====================  la barra de abajo  ===================== */

const enlaces = [...document.querySelectorAll("#nav a")];
const mirador = new IntersectionObserver(entradas => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    for (const a of enlaces)
      a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + e.target.id));
  }
}, { rootMargin:"-40% 0px -55% 0px" });
for (const s of document.querySelectorAll("section[id]")) mirador.observe(s);

$("orbe").addEventListener("click", () => scrollTo({ top:0, behavior:"smooth" }));

function reloj(){
  const d = new Date();
  const dias = ["dom","lun","mar","mié","jue","vie","sáb"];
  $("reloj").innerHTML =
    `<span>${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}</span>` +
    `<small>${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}</small>`;
}
reloj(); setInterval(reloj, 20000);

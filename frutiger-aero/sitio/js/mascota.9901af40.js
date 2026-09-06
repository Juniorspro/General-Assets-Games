/* ---------------------------------------------------------------------------
   La mascota en 3D.

   El modelo tiene rig: 41 huesos y dos animaciones grabadas, `preset:idle` y
   `preset:jump`. Encima de eso va una capa hecha por código, y las dos cosas
   conviven porque tocan lugares distintos: el esqueleto mueve las partes por
   dentro y el código mueve, gira y escala al muñeco entero. Si el código
   tocara los huesos, pisaría a la animación en cada cuadro.

   La capa por código:
     · flote      — un seno lento en Y;
     · respiración— escala no uniforme, desfasada del flote;
     · bamboleo   — una inclinación mínima en Z, con otro período todavía;
     · te mira    — el cuerpo gira hacia el puntero con un resorte;
     · arrastrar  — gira libre y sigue girando al soltar, con roce.
   Los períodos (4, 2 y 6 s) son distintos a propósito: si coincidieran, el
   conjunto se repetiría cada cuatro segundos y el ojo lo engancharía.

   LA PIXELACIÓN es del renderizador, no un filtro encima: el lienzo dibuja a
   LADO px de lado y el CSS lo estira con `image-rendering: pixelated`. De paso
   tapa lo que la reconstrucción hizo mal —la malla sale de una sola foto y de
   cerca se le ven los bultos— y deja el mismo escalonado que el personaje ya
   tiene en el pelo y el visor.

   Si no hay WebGL o el modelo no baja, se saca el lienzo y queda la imagen que
   ya estaba en el HTML. Un cuadro vacío sería peor que una foto.
   --------------------------------------------------------------------------- */
import * as THREE from "../vendor/three.module.min.3e690ac7.js";
import { GLTFLoader } from "../vendor/GLTFLoader.09d91253.js";

const lienzo = document.getElementById("lienzo");
const respaldo = document.getElementById("respaldo");
const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Cuántos píxeles de verdad tiene el muñeco. Es lo único que hay que tocar
   para que se vea más o menos pixelado. */
const LADO = 128;
/* El modelo salió mirando a un costado: la reconstrucción no respeta la
   orientación de la foto. */
const FRENTE = 4.71;

function morir(e){ lienzo.remove(); console.error(e); }

let motor;
try {
  motor = new THREE.WebGLRenderer({ canvas:lienzo, antialias:false, alpha:true });
} catch (e) { morir(e); throw e; }
/* Sin esto, en una pantalla retina el buffer saldría al doble y se perdería la
   mitad de la pixelación. */
motor.setPixelRatio(1);
motor.setSize(LADO, LADO, false);   /* `false`: three no toca el CSS del lienzo */
motor.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(30, 1, .1, 100);
camara.position.set(0, 0, 3.9);
escena.add(new THREE.HemisphereLight(0xdff6ff, 0x2b6ba8, 2.1));
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2, 3, 4);
const relleno = new THREE.DirectionalLight(0xa8d8ff, .9); relleno.position.set(-3, 1, -2);
escena.add(sol, relleno);

/* ---------- cargar ---------- */
let cuna, mezclador, aIdle, aSalto;
try {
  const gltf = await new GLTFLoader().loadAsync(lienzo.dataset.modelo);
  const raiz = gltf.scene;

  mezclador = new THREE.AnimationMixer(raiz);
  const clip = (n) => gltf.animations.find(a => a.name === n) || null;
  aIdle  = clip("preset:idle")  && mezclador.clipAction(clip("preset:idle"));
  aSalto = clip("preset:jump") && mezclador.clipAction(clip("preset:jump"));
  if (aIdle) aIdle.play();
  if (aSalto) { aSalto.loop = THREE.LoopOnce; aSalto.clampWhenFinished = true; }
  mezclador.update(0);                 /* que la pose sea la del primer cuadro */

  /* El encuadre se mide por los HUESOS, no con `Box3.setFromObject`: en una
     malla con skin eso devuelve la caja de la pose de amarre, que acá no es la
     que se ve —el muñeco quedaba chico y corrido hacia abajo—. Los huesos, en
     cambio, ya están donde los puso la animación. Van adentro del cuerpo, así
     que la caja se agranda un poco para que no le corte la ropa. */
  raiz.updateWorldMatrix(true, true);
  const caja = new THREE.Box3();
  const punto = new THREE.Vector3();
  let huesos = 0;
  raiz.traverse(o => { if (o.isBone) { caja.expandByPoint(o.getWorldPosition(punto)); huesos++; } });
  if (!huesos) caja.setFromObject(raiz);        /* por si algún día viene sin rig */
  const tam = caja.getSize(new THREE.Vector3());
  caja.expandByVector(tam.clone().multiplyScalar(.16));

  const medio = caja.getCenter(new THREE.Vector3());
  const tam2 = caja.getSize(new THREE.Vector3());
  const e = 1.62 / Math.max(tam2.x, tam2.y, tam2.z);
  raiz.position.sub(medio);

  /* La escala va en un envoltorio, no en el nodo del skin: tocarle la escala a
     un nodo con esqueleto desalinea los huesos de la malla. */
  cuna = new THREE.Group();
  const escalador = new THREE.Group();
  escalador.scale.setScalar(e);
  escalador.add(raiz);
  cuna.add(escalador);
  escena.add(cuna);

  respaldo.hidden = true;
  lienzo.hidden = false;
} catch (e) { morir(e); throw e; }

/* ---------- lo que anima por código ---------- */
let giro = FRENTE, giroObj = FRENTE, velGiro = 0;
let inclina = 0, inclinaObj = 0;
let arrastrando = false, ultimoX = 0, bajoEn = 0, bajoX = 0;

function apuntar(ev){
  if (arrastrando) return;
  const c = lienzo.getBoundingClientRect();
  const dx = (ev.clientX - (c.left + c.width / 2)) / c.width;
  const dy = (ev.clientY - (c.top + c.height / 2)) / c.height;
  giroObj = FRENTE + Math.max(-.7, Math.min(.7, dx * 1.6));
  inclinaObj = Math.max(-.2, Math.min(.2, dy * .45));
}
addEventListener("pointermove", apuntar);
addEventListener("pointerleave", () => { giroObj = FRENTE; inclinaObj = 0; });

lienzo.addEventListener("pointerdown", ev => {
  arrastrando = true; ultimoX = ev.clientX; velGiro = 0;
  bajoEn = performance.now(); bajoX = ev.clientX;
  lienzo.setPointerCapture(ev.pointerId);
});
lienzo.addEventListener("pointermove", ev => {
  if (!arrastrando) return;
  const d = (ev.clientX - ultimoX) * .012;
  giro += d; giroObj = giro; velGiro = d;   /* la última velocidad es la inercia */
  ultimoX = ev.clientX;
});
for (const e of ["pointerup", "pointercancel"])
  lienzo.addEventListener(e, () => { arrastrando = false; });

/* Un toque corto y sin corrimiento es un salto; si no, saltaría cada vez que
   alguien la gira. `reset()` es lo que permite volver a dispararlo: el clip es
   LoopOnce con clampWhenFinished y queda parado en el último cuadro. */
lienzo.addEventListener("pointerup", ev => {
  if (!aSalto) return;
  if (performance.now() - bajoEn > 350 || Math.abs(ev.clientX - bajoX) > 8) return;
  aSalto.reset().play();
  if (aIdle) { aIdle.crossFadeTo(aSalto, .12, false); setTimeout(() => aIdle.play(), 60); }
});

/* ---------- el cuadro ---------- */
const reloj = new THREE.Clock();

function cuadro(){
  requestAnimationFrame(cuadro);
  const t = reloj.getElapsedTime(), d = Math.min(reloj.getDelta(), .05);

  /* el esqueleto avanza siempre: quieto sería un maniquí, no una mascota.
     Lo que se apaga con `prefers-reduced-motion` es la capa de encima. */
  if (mezclador) mezclador.update(d);

  if (suave) {
    if (!arrastrando && Math.abs(velGiro) > .0002) {
      giro += velGiro; velGiro *= .93; giroObj = giro;
    }
    giro += (giroObj - giro) * Math.min(1, d * 6);
    inclina += (inclinaObj - inclina) * Math.min(1, d * 5);

    const flote  = Math.sin(t * (Math.PI * 2 / 4)) * .05;
    const aire   = Math.sin(t * (Math.PI * 2 / 2));
    const vaiven = Math.sin(t * (Math.PI * 2 / 6)) * .04;

    cuna.rotation.set(inclina, giro, vaiven);
    cuna.position.y = flote;
    /* respirar: sube un poco y se angosta lo mismo, para no cambiar de volumen */
    const r = aire * .01;
    cuna.scale.set(1 - r * .5, 1 + r, 1 - r * .5);
  } else {
    cuna.rotation.set(0, giro, 0);
    giro += (giroObj - giro) * Math.min(1, d * 6);
  }

  motor.render(escena, camara);
}
cuadro();

/* ---------------------------------------------------------------------------
   La mascota en 3D, animada por código.

   No hay animaciones grabadas: el modelo es una malla sola, sin huesos —eso es
   lo que devuelve una reconstrucción a partir de una imagen—. Así que todo lo
   que se mueve se calcula en cada cuadro:

     · flote      — un seno lento en Y;
     · respiración— escala no uniforme, desfasada del flote, para que no lata
                    al mismo compás y se note el truco;
     · bamboleo   — una inclinación mínima en Z, con otro período todavía, así
                    los tres nunca coinciden y no se ve el bucle;
     · te mira    — el cuerpo gira hacia el puntero con un resorte, no de golpe;
     · arrastrar  — gira libre y sigue girando al soltar, con roce;
     · tocarlo    — un salto con aplastado antes y después.

   Los períodos son números primos entre sí a propósito: con 4, 2 y 6 segundos
   el conjunto se repite cada 12 y el ojo lo engancha.

   Si no hay WebGL o el modelo no baja, queda la imagen que ya estaba en el
   HTML. Un cuadro vacío sería peor que una foto.
   --------------------------------------------------------------------------- */
import * as THREE from "../vendor/three.module.min.3e690ac7.js";
import { cargarGlb, encuadrar } from "./visor.09f9722e.js";

const lienzo = document.getElementById("lienzo");
const respaldo = document.getElementById("respaldo");
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* El modelo salió mirando a un costado: la reconstrucción no respeta la
   orientación de la foto. Este cuarto de vuelta lo pone de frente. */
const FRENTE = 4.71;

function morir(){ if (lienzo) lienzo.remove(); }

let motor;
try {
  motor = new THREE.WebGLRenderer({ canvas:lienzo, antialias:true, alpha:true });
} catch (e) { morir(); throw e; }
motor.setPixelRatio(Math.min(devicePixelRatio, 2));
motor.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(30, 1, .1, 100);
camara.position.set(0, 0, 3.9);
escena.add(new THREE.HemisphereLight(0xdff6ff, 0x2b6ba8, 2.1));
const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2, 3, 4);
const relleno = new THREE.DirectionalLight(0xa8d8ff, .9); relleno.position.set(-3, 1, -2);
escena.add(sol, relleno);

function medir(){
  const lado = lienzo.clientWidth || 300;
  motor.setSize(lado, lado, false);
  camara.aspect = 1; camara.updateProjectionMatrix();
}
addEventListener("resize", medir);

let bicho = null;
try {
  bicho = encuadrar(await cargarGlb(lienzo.dataset.modelo), 1.55);
  escena.add(bicho);
  if (respaldo) respaldo.hidden = true;
  lienzo.hidden = false;
} catch (e) { morir(); throw e; }

/* ---------- el estado que anima ---------- */
let giro = FRENTE, giroObj = FRENTE, velGiro = 0;   // hacia dónde mira
let inclina = 0, inclinaObj = 0;                     // cabeceo
let salto = -1;                                      // -1 = no está saltando
let arrastrando = false, ultimoX = 0;

/* Mirar al puntero: se convierte su posición dentro del lienzo en un ángulo
   chico alrededor del frente. Girar la cabeza entera es lo único posible sin
   huesos, y alcanza para que parezca que te sigue. */
function apuntar(ev){
  if (arrastrando) return;
  const c = lienzo.getBoundingClientRect();
  const dx = (ev.clientX - (c.left + c.width / 2)) / c.width;
  const dy = (ev.clientY - (c.top + c.height / 2)) / c.height;
  giroObj = FRENTE + Math.max(-.7, Math.min(.7, dx * 1.6));
  inclinaObj = Math.max(-.22, Math.min(.22, dy * .5));
}
addEventListener("pointermove", apuntar);
addEventListener("pointerleave", () => { giroObj = FRENTE; inclinaObj = 0; });

lienzo.addEventListener("pointerdown", ev => {
  arrastrando = true; ultimoX = ev.clientX; velGiro = 0;
  lienzo.setPointerCapture(ev.pointerId);
});
lienzo.addEventListener("pointermove", ev => {
  if (!arrastrando) return;
  const d = (ev.clientX - ultimoX) * .012;
  giro += d; giroObj = giro; velGiro = d;      /* la última velocidad es la inercia */
  ultimoX = ev.clientX;
});
for (const e of ["pointerup", "pointercancel"])
  lienzo.addEventListener(e, () => { arrastrando = false; });

/* Un toque sin arrastre es un salto. Se mide el corrimiento para no saltar
   cada vez que alguien lo gira. */
let bajoEn = 0, bajoX = 0;
lienzo.addEventListener("pointerdown", ev => { bajoEn = performance.now(); bajoX = ev.clientX; });
lienzo.addEventListener("pointerup", ev => {
  if (performance.now() - bajoEn < 350 && Math.abs(ev.clientX - bajoX) < 8 && salto < 0) salto = 0;
});

/* ---------- el cuadro ---------- */
const reloj = new THREE.Clock();

function cuadro(){
  requestAnimationFrame(cuadro);
  const t = reloj.getElapsedTime(), d = Math.min(reloj.getDelta(), .05);

  if (quieto) {
    bicho.rotation.set(0, FRENTE, 0);
    bicho.position.y = 0;
    motor.render(escena, camara);
    return;
  }

  /* al soltar, sigue girando y el roce lo frena */
  if (!arrastrando && Math.abs(velGiro) > .0002) {
    giro += velGiro; velGiro *= .93; giroObj = giro;
  }
  /* resorte hacia donde tiene que mirar */
  giro += (giroObj - giro) * Math.min(1, d * 6);
  inclina += (inclinaObj - inclina) * Math.min(1, d * 5);

  const flote  = Math.sin(t * (Math.PI * 2 / 4.0)) * .055;   /* 4 s */
  const aire   = Math.sin(t * (Math.PI * 2 / 2.0));          /* 2 s */
  const vaiven = Math.sin(t * (Math.PI * 2 / 6.0)) * .045;    /* 6 s */

  /* el salto: aplasta, sube, y aplasta de nuevo al caer */
  let alto = 0, chato = 0;
  if (salto >= 0) {
    salto += d / .62;
    if (salto >= 1) { salto = -1; }
    else {
      const p = salto;
      if (p < .18)      chato = Math.sin(p / .18 * Math.PI) * .16;          /* se agacha */
      else if (p < .82) { const q = (p - .18) / .64;
                          alto = Math.sin(q * Math.PI) * .42;
                          chato = -Math.sin(q * Math.PI) * .07; }           /* se estira */
      else              chato = Math.sin((p - .82) / .18 * Math.PI) * .11;  /* amortigua */
    }
  }

  bicho.rotation.set(inclina, giro, vaiven);
  bicho.position.y = flote + alto;
  /* respirar: sube un poco y se angosta lo mismo, para no cambiar de volumen */
  const r = aire * .012 - chato;
  bicho.scale.set(1 - r * .5, 1 + r, 1 - r * .5);

  motor.render(escena, camara);
}
medir(); cuadro();

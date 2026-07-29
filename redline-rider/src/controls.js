/* Entrada unificada. Todos los esquemas escriben en el MISMO objeto, y el juego solo lee
   de ahi: asi anadir giroscopio o pedales no toca la fisica.

   Tres esquemas de direccion:
     tilt    - giroscopio, el que pide un movil
     touch   - arrastrar en la zona de direccion
     buttons - dos botones en pantalla

   El gas y el freno son SIEMPRE botones visibles en pantalla, ademas del teclado y el
   mando, porque no saber donde tocar es el primer motivo de abandono en movil. */

import { state } from './state.js';
import { clamp } from './gfx.js';

export const SCHEMES = ['tilt', 'touch', 'buttons'];

/* Angulo de inclinacion que equivale a tope de giro. 22 grados es lo que se alcanza
   girando las munecas sin mover los brazos; mas obliga a inclinar el movil hasta perder
   de vista la pantalla. */
const TILT_FULL = 22;
const TILT_DEAD = 1.6;          // zona muerta en grados: sin ella la moto vibra sola
const TILT_SMOOTH = 14;         // suavizado por segundo del giroscopio
const DEG = Math.PI / 180;

export const input = { throttle:0, brake:0, steer:0, horn:false, tiltDeg:0 };

const gyro = { available:false, granted:false, zero:null, raw:0, active:false, flat:0 };
let gyroSteer = 0;
let stage = null;               // envoltorio rotado, para mapear el puntero
let rotated = false;
const keys = new Set();
let touchSteer = 0;
let btnSteer = 0;
const pedal = { gas:false, brake:false, horn:false };

/* ---------- pantalla rotada ---------- */

/** El envoltorio se rota 90 grados cuando el movil esta en vertical, para presentar el
    juego en horizontal SIN pedirle al jugador que gire el telefono ni ensenarle un
    cartel de "gira el movil". Si el navegador ya ha girado la pagina, no se toca. */
export function setStage(el){ stage = el; }

export const isRotated = () => rotated;

export function layoutStage(){
  if (!stage) return { w:innerWidth, h:innerHeight };
  const portrait = innerHeight > innerWidth;
  rotated = portrait;
  if (portrait){
    /* El escenario mide al reves (ancho = alto de pantalla). rotate(90deg) con origen en
       0,0 manda el contenido fuera de pantalla por la izquierda, y translateX lo devuelve.
       Se aplica el translate PRIMERO en la lista porque las transformaciones se leen de
       derecha a izquierda: primero gira, despues se desplaza. */
    stage.style.width = innerHeight + 'px';
    stage.style.height = innerWidth + 'px';
    stage.style.transform = 'translateX(' + innerWidth + 'px) rotate(90deg)';
  } else {
    stage.style.width = innerWidth + 'px';
    stage.style.height = innerHeight + 'px';
    stage.style.transform = 'none';
  }
  /* Las muescas de pantalla cambian de lado al girar: lo que fisicamente es el borde
     superior pasa a ser el borde DERECHO del juego. Sin remapear, el HUD se aparta del
     lado equivocado y queda pegado a la muesca. */
  document.documentElement.classList.toggle('rot', portrait);
  return { w: stage.clientWidth, h: stage.clientHeight };
}

/** Punto de pantalla -> coordenadas locales del escenario rotado.
    clientX/clientY llegan SIN transformar aunque el elemento este rotado, asi que con el
    escenario girado un desliz horizontal del dedo se leeria como vertical.
    Con origen 0 0 y translateX(W) rotate(90deg), el local (x,y) acaba en (W - y, x). */
export function mapPointer(e){
  if (!rotated) return { x:e.clientX, y:e.clientY };
  return { x:e.clientY, y:innerWidth - e.clientX };
}

/* ---------- giroscopio ---------- */

export const gyroAvailable = () => gyro.available;
export const gyroGranted = () => gyro.granted;
export const gyroLive = () => gyro.active;

/** Debe llamarse DENTRO de un gesto del usuario: iOS rechaza el permiso fuera de uno. */
export async function enableGyro(){
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) return false;
  if (typeof DOE.requestPermission === 'function'){
    try {
      if (await DOE.requestPermission() !== 'granted') return false;
    } catch (e) { return false; }
  }
  if (!gyro.granted){
    gyro.granted = true;
    addEventListener('deviceorientation', onOrient, { passive:true });
  }
  gyro.zero = null;
  return true;
}

const wrap180 = a => { a = (a + 180) % 360; return (a < 0 ? a + 360 : a) - 180; };

/* La direccion se saca del ALABEO del aparato sobre la normal de la pantalla, no de beta
   ni de gamma por separado. Elegir eje segun la orientacion es la fuente clasica de
   controles al reves: con la pagina girada por CSS el navegador sigue diciendo "vertical",
   asi que cualquier decision basada en screen.orientation sale mal.

   El alabeo, en cambio, no depende de como se presente la imagen: girar el contenido no
   cambia el sentido de las agujas del reloj. Inclinar el movil en sentido horario es
   girar a la derecha en vertical, en horizontal y con la pagina rotada por CSS. */
function onOrient(e){
  const b = e.beta, g = e.gamma;
  if ((b === null || b === undefined) && (g === null || g === undefined)) return;
  const B = (b || 0) * DEG, G = (g || 0) * DEG;
  /* Gravedad reconstruida en los ejes del aparato (x derecha, y arriba, z sale de pantalla).
     Sale de invertir la rotacion del propio evento, que es intrinseca Z-X'-Y'':
       R = Rz(alfa)*Rx(beta)*Ry(gamma),  g_aparato = R^T * (0,0,-1) = -R[2]
     y la tercera fila de R es (-cosB*sinG, sinB, cosB*cosG). De ahi los signos: el de X es
     POSITIVO. Tenerlo negado es exactamente el bug de "controles al reves", y no se ve a
     ojo porque la moto sigue girando, solo hacia el lado contrario. */
  const gx = Math.cos(B) * Math.sin(G);
  const gy = -Math.sin(B);

  gyro.available = true;
  gyro.flat = Math.hypot(gx, gy);
  /* Con el movil casi plano la gravedad no tiene componente en el plano de la pantalla y
     el alabeo no esta definido: se ignora la lectura en vez de dar un valor que salta. */
  if (gyro.flat < 0.18) return;

  const roll = Math.atan2(gx, -gy) / DEG;
  if (gyro.zero === null) gyro.zero = roll;       // primera lectura = postura neutra
  gyro.raw = wrap180(roll - gyro.zero);
  gyro.active = true;
}

/** Vuelve a tomar la postura actual como centro. */
export function calibrateGyro(){ gyro.zero = null; gyro.raw = 0; gyroSteer = 0; }

/* ---------- teclado, mando y pedales ---------- */

export function install(canvas){
  addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyC') calibrateGyro();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    pedal.gas = pedal.brake = pedal.horn = false;
    btnSteer = 0;
  });

  /* Zona de direccion tactil sobre el lienzo. El puntero se mapea al espacio del
     escenario para que arrastrar "a la derecha" sea derecha tambien con la pagina girada. */
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    drag = { id:e.pointerId, x:mapPointer(e).x };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = mapPointer(e);
    const dx = p.x - drag.x;
    drag.x = p.x;
    const k = 3.4 / Math.max(240, stage ? stage.clientWidth : innerWidth);
    touchSteer = clamp(touchSteer + dx * k, -1, 1);
  });
  const end = e => { if (drag && e.pointerId === drag.id) drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
}

/** Botones de pantalla: cada uno con sus propios eventos, asi el multitactil funciona y se
    puede acelerar y girar a la vez. Un unico manejador en el lienzo no lo permite. */
export function bindButton(el, onDown, onUp){
  if (!el) return;
  const down = e => { e.preventDefault(); el.classList.add('press'); onDown(); };
  const up = e => { e.preventDefault(); el.classList.remove('press'); onUp(); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

export function bindPedals(els){
  bindButton(els.gas,   () => { pedal.gas = true; },   () => { pedal.gas = false; });
  bindButton(els.brake, () => { pedal.brake = true; }, () => { pedal.brake = false; });
  bindButton(els.left,  () => { btnSteer = -1; },      () => { if (btnSteer < 0) btnSteer = 0; });
  bindButton(els.right, () => { btnSteer = 1; },       () => { if (btnSteer > 0) btnSteer = 0; });
  bindButton(els.horn,  () => { pedal.horn = true; },  () => { pedal.horn = false; });
}

function padState(){
  if (!navigator.getGamepads) return null;
  let pads;
  try { pads = navigator.getGamepads(); } catch (e) { return null; }
  for (const p of pads || []){
    if (!p) continue;
    const ax = p.axes && p.axes.length ? p.axes[0] : 0;
    const rt = p.buttons && p.buttons[7] ? p.buttons[7].value : 0;
    const lt = p.buttons && p.buttons[6] ? p.buttons[6].value : 0;
    if (Math.abs(ax) > 0.12 || rt > 0.05 || lt > 0.05)
      return { steer: Math.abs(ax) > 0.12 ? ax : 0, throttle: rt, brake: lt };
  }
  return null;
}

/** Esquema que toca por defecto: giroscopio si el aparato lo tiene, arrastre si no. */
export function defaultScheme(){
  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  return touch && window.DeviceOrientationEvent ? 'tilt' : 'touch';
}

/** El esquema activo, con respaldo: si se pide giroscopio y no llega ni una lectura, se
    conduce con arrastre en vez de quedarse sin direccion. */
export function activeScheme(){
  const s = SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
  if (s === 'tilt' && !gyro.active) return 'touch';
  return s;
}

/* ---------- resolucion por fotograma ---------- */

export function update(dt){
  const pad = padState();

  let throttle = pedal.gas ? 1 : 0;
  let brake = pedal.brake ? 1 : 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) throttle = 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) brake = 1;
  if (pad){ throttle = Math.max(throttle, pad.throttle); brake = Math.max(brake, pad.brake); }

  const scheme = activeScheme();

  // giroscopio: respuesta con mas resolucion en el centro, para colocarse en el carril
  if (gyro.active){
    const mag = clamp((Math.abs(gyro.raw) - TILT_DEAD) / (TILT_FULL - TILT_DEAD), 0, 1);
    const target = Math.sign(gyro.raw) * (mag * mag * 0.62 + mag * 0.38);
    gyroSteer += (target - gyroSteer) * (1 - Math.exp(-TILT_SMOOTH * dt));
  } else {
    gyroSteer = 0;
  }

  let steer = scheme === 'tilt' ? gyroSteer : scheme === 'buttons' ? btnSteer : touchSteer;

  // teclado y mando pisan cualquier esquema, para que el escritorio siempre funcione
  let kb = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kb -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kb += 1;
  if (kb) steer = kb;
  else if (pad && pad.steer) steer = pad.steer;

  /* La inversion se aplica AQUI, sobre el valor final. Antes se aplicaba a una variable
     intermedia que ya se habia consumido, asi que el ajuste no hacia absolutamente nada
     y no habia forma de corregir unos controles al reves. */
  if (state.invert) steer = -steer;

  input.throttle = clamp(throttle, 0, 1);
  input.brake = clamp(brake, 0, 1);
  input.steer = clamp(steer * (state.sens || 1), -1, 1);
  input.horn = pedal.horn || keys.has('KeyH');
  input.tiltDeg = gyro.active ? gyro.raw : 0;

  // el arrastre tactil se autocentra al soltar; los otros esquemas son absolutos
  if (scheme === 'touch' && !kb) touchSteer *= Math.exp(-5 * dt);
}

export function releaseAll(){
  keys.clear();
  pedal.gas = pedal.brake = pedal.horn = false;
  btnSteer = 0;
  touchSteer = 0;
  input.throttle = input.brake = input.steer = 0;
  input.horn = false;
}

export const gyroDebug = () => ({ ...gyro, steer:gyroSteer, rotated });

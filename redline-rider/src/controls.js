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

/* everActive se aparta de active a proposito: active puede caerse un instante si el jugador
   tumba el movil, y si el esquema se decidiera con active el mando cambiaria EN MEDIO de la
   carrera. Una vez que ha llegado una lectura valida, el aparato tiene giroscopio y punto. */
const gyro = { available:false, granted:false, zero:null, raw:0, active:false,
               everActive:false, flat:0, samples:[], last:0 };
/* Sin lecturas durante este tiempo se da el sensor por dormido. Medio segundo es de sobra:
   un giroscopio real emite a 60 Hz. */
const GYRO_STALE_MS = 500;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : 0);
const ZERO_SAMPLES = 6;         // lecturas que se promedian para fijar el centro
const ZERO_MIN_FLAT = 0.30;     // no se calibra con el movil casi plano: ahi el alabeo es ruido
let gyroSteer = 0;
/* Ganancia del arrastre y del giro por botones. En botones no puede ser instantaneo: si
   btnSteer salta a 1 de golpe, la sensibilidad no tiene donde aplicarse (multiplicar la
   salida solo la recorta por debajo de 1 y no hace nada por encima). Aqui la sensibilidad
   escala la VELOCIDAD con la que el manillar llega al tope, que es lo unico que se puede
   regular en un mando digital, y el tope siempre se alcanza. */
const DRAG_GAIN = 3.4;
const BTN_RATE = 3.2;
let btnDir = 0;                 // -1, 0, +1: lo que piden los botones
let drag = null;                // arrastre en curso, a nivel de modulo para poder cancelarlo
const buttons = [];             // mandos vinculados, para poder soltarlos todos de golpe
let stage = null;               // envoltorio rotado, para mapear el puntero
let rotated = false;
/* El ancho con el que se coloco el escenario, cacheado. mapPointer NO debe releer innerWidth
   por su cuenta: serian dos medidas independientes del mismo numero, y si cambia entre la
   colocacion y el toque (barra de herramientas que se recoge, teclado virtual) el dedo se
   mapea desplazado justo esa diferencia. */
let stageW = 0;
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

/** Coarse: aparato de dedo. Una ventana de escritorio estrecha tambien mide mas alto que
    ancho, y girar el juego 90 grados en un ordenador seria absurdo. */
const coarsePointer = () => (navigator.maxTouchPoints || 0) > 0 ||
  (window.matchMedia && matchMedia('(pointer: coarse)').matches);

export function layoutStage(){
  /* Se mide con documentElement.clientWidth/clientHeight, que es el viewport de MAQUETACION:
     es lo que vale para un elemento fijo a pantalla completa, y a diferencia de innerWidth no
     incluye la barra de desplazamiento. */
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = document.documentElement.clientHeight || innerHeight;
  if (!stage) return { w:vw, h:vh };
  const portrait = vh > vw && coarsePointer();
  /* Si la presentacion pasa de girada a no girada es porque el jugador acaba de girar el
     aparato 90 grados de verdad, asi que su postura neutra ha girado con el y el centro
     viejo queda perpendicular al nuevo. Hay que retomarlo. */
  if (portrait !== rotated && gyro.everActive) calibrateGyro();
  rotated = portrait;
  stageW = vw;
  if (portrait){
    /* El escenario mide al reves (ancho = alto de pantalla). rotate(90deg) con origen en
       0,0 manda el contenido fuera de pantalla por la izquierda, y translateX lo devuelve.
       Se aplica el translate PRIMERO en la lista porque las transformaciones se leen de
       derecha a izquierda: primero gira, despues se desplaza. */
    stage.style.width = vh + 'px';
    stage.style.height = vw + 'px';
    stage.style.transform = 'translateX(' + vw + 'px) rotate(90deg)';
  } else {
    stage.style.width = vw + 'px';
    stage.style.height = vh + 'px';
    /* rotate(0deg) y no none: cualquier transform distinto de none convierte al envoltorio en
       bloque contenedor de sus descendientes position:fixed. Con none, esos hijos pasarian a
       medir el viewport en horizontal y el escenario en vertical, y el CSS se comportaria
       distinto segun la orientacion por un motivo que no tiene nada que ver con girar. */
    stage.style.transform = 'rotate(0deg)';
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
  return { x:e.clientY, y:(stageW || innerWidth) - e.clientX };
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
  /* Con el movil casi plano la gravedad no tiene componente en el plano de la pantalla y el
     alabeo no esta definido. Antes se salia sin tocar raw, con lo que el ultimo angulo se
     quedaba pegado: tumbar el movil a tope de giro dejaba la moto girando para siempre.
     Ahora se relaja hacia el centro, que es lo que el jugador espera al dejar de inclinar. */
  if (gyro.flat < 0.18){
    gyro.raw *= 0.85;
    return;
  }

  const roll = Math.atan2(gx, -gy) / DEG;

  /* El centro se promedia sobre varias lecturas y solo con el movil bien inclinado. Tomarlo
     de UNA lectura lo cogia con el dedo todavia sobre el boton y en una postura cualquiera,
     y un centro desviado se siente igual que unos controles invertidos. */
  if (gyro.zero === null){
    if (gyro.flat < ZERO_MIN_FLAT) return;
    gyro.samples.push(roll);
    if (gyro.samples.length < ZERO_SAMPLES) return;
    // media circular: promediar angulos en crudo cruza mal el salto de +-180
    let sx = 0, sy = 0;
    for (const a of gyro.samples){ sx += Math.cos(a * DEG); sy += Math.sin(a * DEG); }
    gyro.zero = Math.atan2(sy, sx) / DEG;
    gyro.samples.length = 0;
  }

  gyro.raw = wrap180(roll - gyro.zero);
  gyro.active = true;
  gyro.everActive = true;
  gyro.last = nowMs();
}

/** Vuelve a tomar la postura actual como centro. */
export function calibrateGyro(){
  gyro.zero = null;
  gyro.samples.length = 0;
  gyro.raw = 0;
  gyroSteer = 0;
}

/* ---------- teclado, mando y pedales ---------- */

export function install(canvas){
  addEventListener('keydown', e => {
    keys.add(e.code);
    if (e.code === 'KeyC') calibrateGyro();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', releaseAll);

  /* Zona de direccion tactil sobre el lienzo. El puntero se mapea al espacio del
     escenario para que arrastrar "a la derecha" sea derecha tambien con la pagina girada. */
  canvas.addEventListener('pointerdown', e => {
    drag = { id:e.pointerId, x:mapPointer(e).x };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = mapPointer(e);
    const dx = p.x - drag.x;
    drag.x = p.x;
    /* La sensibilidad va en la GANANCIA, antes del recorte. Multiplicando la salida ya
       recortada, con sens 0,5 el arrastre se clavaba en 0,5 y no llegaba nunca al tope
       (medido: recorrido infinito sin alcanzarlo), y con sens 2 el tope llegaba a los 130 px:
       recortaba el recorrido util del dedo en vez de cambiar la ganancia. */
    const k = DRAG_GAIN * (state.sens || 1) / Math.max(240, stage ? stage.clientWidth : innerWidth);
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
  /* Un conjunto de punteros, no un booleano: el jugador recoloca la mano y acaba con dos
     dedos sobre el mismo boton sin darse cuenta, y al levantar el primero se soltaria el
     mando estando el segundo puesto.

     El conjunto se REGISTRA para que releaseAll pueda vaciarlo. Al cambiar de aplicacion no
     siempre llega el pointerup, y con un id rancio dentro held.size ya no es cero: al volver,
     el jugador pulsa con otro id (siempre es otro), onDown no se dispara y el gas se queda
     MUERTO el resto de la partida. */
  const held = new Set();
  buttons.push({ el, held, onUp });

  const press = e => {
    e.preventDefault();
    if (!held.size){
      el.classList.add('press');
      onDown();
      if (state.haptics && navigator.vibrate) try { navigator.vibrate(8); } catch (err) {}
    }
    held.add(e.pointerId);
    /* La captura garantiza que el pointerup caiga en ESTE elemento aunque el dedo se haya
       salido. Sin ella habria que usar pointerleave, que no sirve como "se solto": no tiene
       histeresis sobre un borde curvo, y en tactil parece funcionar solo porque la captura
       implicita lo silencia, asi que el fallo no se ve probando en el movil. */
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const release = e => {
    if (!held.delete(e.pointerId)) return;
    if (!held.size){ el.classList.remove('press'); onUp(); }
  };

  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  /* Ocultar el mando con display:none mientras esta pulsado NO dispara pointerup ni
     pointerleave: el unico evento que llega es lostpointercapture. Sin escucharlo, cambiar
     de esquema con el gas pulsado dejaba el gas pegado a fondo. */
  el.addEventListener('lostpointercapture', release);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

export function bindPedals(els){
  bindButton(els.gas,   () => { pedal.gas = true; },   () => { pedal.gas = false; });
  bindButton(els.brake, () => { pedal.brake = true; }, () => { pedal.brake = false; });
  bindButton(els.left,  () => { btnDir = -1; },        () => { if (btnDir < 0) btnDir = 0; });
  bindButton(els.right, () => { btnDir = 1; },         () => { if (btnDir > 0) btnDir = 0; });
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

/** El esquema activo, con respaldo: si se pide giroscopio y no ha llegado NUNCA una lectura,
    se conduce con arrastre en vez de quedarse sin direccion. Se mira everActive y no active
    para que un instante con el movil plano no cambie el mando a mitad de carrera. */
export function activeScheme(){
  const s = SCHEMES.includes(state.scheme) ? state.scheme : defaultScheme();
  if (s === 'tilt' && !gyro.everActive) return 'touch';
  return s;
}

/** Para que la interfaz pueda decir por que el giroscopio no responde en vez de degradar al
    arrastre en silencio, que es justo la queja de "pedi giroscopio y no lo tengo". */
export function gyroStatus(){
  if (!window.DeviceOrientationEvent) return 'unsupported';
  if (!gyro.granted) return 'denied';
  if (!gyro.everActive) return 'waiting';
  if (!gyro.active) return 'stale';
  return 'live';
}

/* ---------- resolucion por fotograma ---------- */

export function update(dt){
  const pad = padState();
  const sens = state.sens || 1;

  let throttle = pedal.gas ? 1 : 0;
  let brake = pedal.brake ? 1 : 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) throttle = 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) brake = 1;
  if (pad){ throttle = Math.max(throttle, pad.throttle); brake = Math.max(brake, pad.brake); }

  /* Vigilante del sensor: gyro.active se ponia a true y no habia quien lo bajara. Medido:
     inclinando a la derecha y dejando de emitir eventos 5 segundos (cambiar de aplicacion,
     revocar el permiso, o que el sensor se duerma) el manillar se quedaba PEGADO a medio
     giro y gyroStatus seguia diciendo "live". Eso es, tal cual, "controles pegados al
     recuperar el foco". */
  if (gyro.active && gyro.last && (nowMs() - gyro.last) > GYRO_STALE_MS){
    gyro.active = false;
    gyro.raw = 0;
  }

  const scheme = activeScheme();

  // el giro por botones va hacia su tope a una velocidad, no de golpe: ver BTN_RATE
  btnSteer += clamp(btnDir - btnSteer, -BTN_RATE * sens * dt, BTN_RATE * sens * dt);
  if (!btnDir && Math.abs(btnSteer) < 0.01) btnSteer = 0;

  /* Giroscopio: respuesta con mas resolucion en el centro, para colocarse en el carril, y
     tope al final para el cambio de carril rapido.
     La sensibilidad escala el ANGULO, no la salida. Multiplicando la salida, con sens=2 se
     saturaba a 11 grados mientras la zona muerta seguia en 1,6: la curva dejaba de ser la
     curva y la zona de control fino se comprimia a la mitad. */
  if (gyro.active){
    const full = Math.max(8, TILT_FULL / sens);
    const mag = clamp((Math.abs(gyro.raw) - TILT_DEAD) / (full - TILT_DEAD), 0, 1);
    const target = Math.sign(gyro.raw) * (mag * mag * 0.62 + mag * 0.38);
    gyroSteer += (target - gyroSteer) * (1 - Math.exp(-TILT_SMOOTH * dt));
  } else {
    gyroSteer = 0;
  }

  /* Ninguno de los tres se multiplica por la sensibilidad AQUI: el giroscopio ya la lleva en
     el angulo, el arrastre en la ganancia y los botones en la velocidad de barrido. Aplicarla
     a la salida, que ya esta recortada a +-1, solo impide llegar al tope por debajo de 1 y no
     hace nada por encima. */
  let steer = scheme === 'tilt' ? gyroSteer
            : scheme === 'buttons' ? btnSteer
            : touchSteer;

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
  input.steer = clamp(steer, -1, 1);
  input.horn = pedal.horn || keys.has('KeyH');
  input.tiltDeg = gyro.active ? gyro.raw : 0;

  // el arrastre tactil se autocentra al soltar; los otros esquemas son absolutos
  if (scheme === 'touch' && !kb) touchSteer *= Math.exp(-5 * dt);
}

export function releaseAll(){
  keys.clear();
  pedal.gas = pedal.brake = pedal.horn = false;
  btnDir = 0;
  btnSteer = 0;
  touchSteer = 0;
  /* El arrastre en curso tambien: era local a install() y sobrevivia a releaseAll, asi que
     al volver a la partida el siguiente pointermove seguia desde la posicion vieja del dedo
     y daba un tiron de manillar. */
  drag = null;
  /* Y los conjuntos de punteros de cada mando, o el mando queda inservible: sin pointerup
     conservan un id rancio, held.size deja de ser cero y el siguiente onDown no dispara. */
  for (const b of buttons){
    if (b.held.size){
      b.held.clear();
      b.el.classList.remove('press');
      b.onUp();
    }
  }
  input.throttle = input.brake = input.steer = 0;
  input.horn = false;
}

export const gyroDebug = () => ({ ...gyro, steer:gyroSteer, rotated });

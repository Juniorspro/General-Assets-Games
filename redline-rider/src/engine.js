/* Motor PROCEDURAL, sintetizado con WebAudio. No hay muestras de motor.

   Por que sintetizar y no muestrear: con tres bucles grabados, las revoluciones solo eligen
   cual suena y a que volumen, y el resultado nunca sube de tono de forma continua — se oyen
   los tres escalones. Medido en las muestras que habia: dos de las tres caian en el mismo tono
   (228 y 229 Hz), asi que media gama de revoluciones sonaba plana. Sintetizando, la frecuencia
   de encendido ES la variable, y subir de vueltas sube el tono de verdad, sin saltos ni costura
   de bucle. De paso se ahorran los tres mp3.

   El modelo tiene tres partes, que es lo que distingue una moto de un zumbido:
     - tren de pulsos de encendido: la fundamental y sus armonicos, que dan el tono
     - ruido de admision filtrado, que da el aire y el cuerpo
     - un filtro paso bajo que se abre con el gas: a medio gas el motor suena tapado, a fondo
       se destapa, y eso es lo que se percibe como esfuerzo

   Nada de esto necesita decodificar ficheros, asi que funciona igual abierto desde file://,
   donde decodeAudioData no puede porque depende de fetch. */

import { state } from './state.js';

/* Frecuencia de encendido, en Hz. Una moto de cuatro cilindros a 1200 vueltas ronda los 40 Hz
   de pulsos y en zona roja pasa de 350; se recorta arriba para que no se vuelva un silbido. */
const F_IDLE = 42, F_RED = 340;
const NOISE_SECONDS = 2;

let ctx = null;
let nodes = null;
let running = false;

/** Ruido rosa aproximado: blanco filtrado por un promedio movil de un polo. El blanco puro
    suena a estatica de television y no a aire moviendose. */
function noiseBuffer(ac){
  const n = Math.floor(ac.sampleRate * NOISE_SECONDS);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++){
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

/** Debe llamarse dentro de un gesto del usuario, como el resto del audio. */
export function init(){
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC(); } catch (e) { ctx = null; return false; }

  const master = ctx.createGain();
  master.gain.value = 0;

  /* Paso bajo comun: es el que se abre con el gas. Q moderado para que al abrirse se note sin
     silbar en la frecuencia de corte. */
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  lp.Q.value = 0.9;
  lp.connect(master);
  master.connect(ctx.destination);

  /* Tren de pulsos: tres dientes de sierra en la fundamental, el doble y el triple. Un solo
     oscilador suena a sintetizador; los armonicos dan la aspereza mecanica. */
  const parts = [];
  for (const [mult, gain, type] of [[1, 0.5, 'sawtooth'], [2, 0.28, 'square'], [3, 0.16, 'sawtooth']]){
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = F_IDLE * mult;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g); g.connect(lp);
    o.start();
    parts.push({ o, mult });
  }
  // subarmonico: da el peso de los cilindros grandes
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = F_IDLE * 0.5;
  const subG = ctx.createGain();
  subG.gain.value = 0.5;
  sub.connect(subG); subG.connect(lp);
  sub.start();

  // admision: ruido por un paso banda que sube con las vueltas
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 0.7;
  const noiseG = ctx.createGain();
  noiseG.gain.value = 0.25;
  src.connect(bp); bp.connect(noiseG); noiseG.connect(lp);
  src.start();

  /* Viento: ruido aparte, con su propio paso alto, que sigue a la VELOCIDAD y no a las
     revoluciones. En sexta a pocas vueltas hay mucho viento y poco motor, y esa diferencia es
     la que hace que las marchas largas se noten. */
  const wsrc = ctx.createBufferSource();
  wsrc.buffer = noiseBuffer(ctx);
  wsrc.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 420;
  const windG = ctx.createGain();
  windG.gain.value = 0;
  wsrc.connect(hp); hp.connect(windG); windG.connect(master);
  wsrc.start();

  nodes = { master, lp, parts, sub, bp, noiseG, windG };
  return true;
}

export function start(){
  if (!ctx && !init()) return;
  running = true;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function stop(){
  running = false;
  if (nodes) ramp(nodes.master.gain, 0, 0.12);
}

/** Rampa corta en vez de asignacion directa: cambiar una ganancia de golpe produce un clic. */
function ramp(param, v, tau){
  if (!ctx) return;
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(v, now, Math.max(0.005, tau || 0.03));
}

/**
 * Actualiza el motor.
 *   rpm        0..1 dentro de la marcha
 *   speedFrac  0..1 de la velocidad punta, para el viento
 *   throttle   0..1, abre el filtro y sube el nivel
 */
export function update(rpm, speedFrac, throttle){
  if (!ctx || !nodes || !running) return;
  const r = Math.max(0, Math.min(1, rpm));
  const gas = Math.max(0, Math.min(1, throttle));
  const vol = Math.max(0, Math.min(1, state.sfx));

  // la frecuencia de encendido crece algo mas que lineal: arriba se estira, como de verdad
  const f = F_IDLE + (F_RED - F_IDLE) * Math.pow(r, 1.15);
  for (const p of nodes.parts) ramp(p.o.frequency, f * p.mult, 0.02);
  ramp(nodes.sub.frequency, f * 0.5, 0.02);

  /* El corte del paso bajo sigue al gas Y a las vueltas: soltar gas a muchas vueltas tiene que
     sonar tapado (freno motor), no igual que ir a fondo. */
  ramp(nodes.lp.frequency, 320 + f * (2.2 + gas * 5.5), 0.05);
  ramp(nodes.bp.frequency, 420 + f * 2.4, 0.05);
  ramp(nodes.noiseG.gain, 0.12 + gas * 0.30, 0.06);

  // nivel: hay motor incluso sin gas, pero mucho menos
  ramp(nodes.master.gain, vol * 0.34 * (0.34 + 0.66 * gas) * (0.55 + 0.45 * r), 0.05);
  ramp(nodes.windG.gain, vol * 0.30 * Math.pow(Math.max(0, Math.min(1, speedFrac)), 1.5), 0.10);
}

export const ready = () => !!ctx;

/** Solo para las herramientas de verificacion. Un sintetizador no se puede comprobar leyendo
    los valores que uno mismo acaba de escribir: hay que medir la SALIDA. Esto expone el nodo de
    mezcla para poder colgarle un analizador y ver el espectro de verdad. */
export const _debug = () => ({ ctx, nodes, running, F_IDLE, F_RED });

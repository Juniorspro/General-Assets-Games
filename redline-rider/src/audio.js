/* Audio con HTMLAudioElement: decodeAudioData necesita fetch, que el navegador bloquea
   en file://, y el juego tiene que sonar igual abierto como archivo local que servido.

   Lo propio de este genero es el motor: no es un efecto puntual sino tres bucles
   (ralenti / medio / alto) cruzados de forma continua por revoluciones, mas un bucle de
   viento que sube con la velocidad. Eso es lo que hace que acelerar se sienta. */

import { state } from './state.js';

const BASE = 'assets/audio/';

/* En la version de un solo fichero el audio viaja empotrado como data URI; en la de CDN
   se sirve desde jsDelivr. El mapa y la base los inyecta build.mjs antes del bundle. */
const ASSETS = (typeof window !== 'undefined' && window.__HX_ASSETS) || null;
const BASE_URL = (typeof window !== 'undefined' && window.__HX_ASSET_BASE) || '';
const resolve = url => (ASSETS && ASSETS[url]) || (BASE_URL ? BASE_URL + url : url);

export const SFX_FILES = {
  horn:     BASE + 'sfx/horn.mp3',
  crash:    BASE + 'sfx/crash.mp3',
  nearmiss: BASE + 'sfx/nearmiss.mp3',
  coin:     BASE + 'sfx/coin.mp3',
  brake:    BASE + 'sfx/brake.mp3',
  click:    BASE + 'sfx/click.mp3'
};
/* Bucles continuos: se manejan aparte de los efectos puntuales porque nunca se
   reinician, solo cambian de volumen. */
export const LOOP_FILES = {
  engineLow:  BASE + 'engine/low.mp3',
  engineMid:  BASE + 'engine/mid.mp3',
  engineHigh: BASE + 'engine/high.mp3',
  wind:       BASE + 'sfx/wind.mp3'
};
export const MUSIC_FILES = {
  menu: BASE + 'music/menu.mp3'
};

/* Mezcla por sonido. Los assets vienen de generaciones independientes y no comparten
   nivel; estos son los factores que los igualan (efectos por debajo de los bucles de
   motor, musica muy por debajo de todo). */
const GAIN = {
  horn:0.55, crash:0.9, nearmiss:0.5, coin:0.5, brake:0.55, click:0.4,
  engineLow:0.55, engineMid:0.6, engineHigh:0.65, wind:0.4
};

const POOL_SIZE = 4;
const pools = new Map();     // efectos puntuales: varias copias para solaparse
const loops = new Map();     // bucles: una sola copia cada uno
const music = new Map();
let current = null;
let fadeTimer = null;
let unlocked = false;
let running = false;         // el motor solo suena en marcha

function el(url, loop){
  const a = new Audio();
  a.src = url;
  a.loop = !!loop;
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  return a;
}

/** Espera datos suficientes sin colgar la carga. No llama a load(): asignar .src con
    preload='auto' ya inicia la descarga, y repetirla la aborta y la reinicia. */
function ready(a, timeout = 15000){
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done){ done = true; cleanup(); resolve(); } };
    const cleanup = () => {
      a.removeEventListener('canplaythrough', finish);
      a.removeEventListener('loadeddata', finish);
      a.removeEventListener('error', finish);
      clearTimeout(timer);
    };
    const timer = setTimeout(finish, timeout);
    a.addEventListener('canplaythrough', finish);
    a.addEventListener('loadeddata', finish);
    a.addEventListener('error', finish);   // un fichero que falle no bloquea el arranque
  });
}

/** Un efecto necesita varias copias para solaparse consigo mismo. Se descarga una vez a
    un blob y todas salen de ahi; por ruta directa cada copia lanzaria su propia peticion. */
async function poolFor(name){
  const direct = resolve(SFX_FILES[name]);
  let url = direct;
  if (!direct.startsWith('data:')){
    try {
      const r = await fetch(direct);
      if (r.ok) url = URL.createObjectURL(await r.blob());
    } catch (e) { /* file:// -> se carga por ruta */ }
  }
  const els = [];
  for (let i = 0; i < POOL_SIZE; i++) els.push(el(url, false));
  await ready(els[0]);
  pools.set(name, { els, i:0 });
}

async function loopFor(name){
  const a = el(resolve(LOOP_FILES[name]), true);
  a.volume = 0;
  loops.set(name, a);
  await ready(a);
}

export function sfxTasks(){
  return Object.keys(SFX_FILES).map(name => ({ label:name, run: () => poolFor(name) }))
    .concat(Object.keys(LOOP_FILES).map(name => ({ label:name, run: () => loopFor(name) })));
}

/** La musica no entra en la barra de carga: son megas frente a los kilobytes de los
    efectos, y esperarla multiplicaria el arranque. */
export function preloadMusic(){
  loadMusic('menu').catch(() => {});
}

async function loadMusic(name){
  if (!MUSIC_FILES[name] || music.has(name)) return music.get(name);
  const a = el(resolve(MUSIC_FILES[name]), true);
  a.volume = 0;
  music.set(name, a);
  await ready(a, 20000);
  return a;
}

/** El primer gesto del usuario habilita el audio (politica de autoplay). */
export function unlock(){
  if (unlocked) return;
  unlocked = true;
  for (const p of pools.values()){
    const a = p.els[0], v = a.volume;
    a.volume = 0;
    a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = v; }).catch(() => { a.volume = v; });
    break;
  }
}

export function play(name, opts){
  const p = pools.get(name);
  if (!p || state.sfx <= 0) return null;
  const o = opts || {};
  const a = p.els[p.i = (p.i + 1) % p.els.length];
  try {
    a.pause();
    a.currentTime = 0;
    a.playbackRate = o.rate || 1;
    a.volume = Math.max(0, Math.min(1, state.sfx * (GAIN[name] || 1) * (o.vol === undefined ? 1 : o.vol)));
    const r = a.play();
    if (r && r.catch) r.catch(() => {});
  } catch (e) { /* un efecto que no suena no interrumpe la partida */ }
  return a;
}

/* ---------- motor ---------- */

function setLoop(name, vol, rate){
  const a = loops.get(name);
  if (!a) return;
  const v = Math.max(0, Math.min(1, vol * state.sfx * (GAIN[name] || 1)));
  a.volume = v;
  if (rate) a.playbackRate = Math.max(0.5, Math.min(2.6, rate));
  if (v > 0.001 && a.paused && running){
    const r = a.play(); if (r && r.catch) r.catch(() => {});
  } else if ((v <= 0.001 || !running) && !a.paused){
    try { a.pause(); } catch (e) {}
  }
}

export function engineStart(){
  running = true;
  for (const n of ['engineLow','engineMid','engineHigh','wind']){
    const a = loops.get(n);
    if (a){ a.volume = 0; try { a.currentTime = 0; } catch (e) {} }
  }
}
export function engineStop(){
  running = false;
  for (const n of ['engineLow','engineMid','engineHigh','wind']) setLoop(n, 0);
}

/**
 * Mezcla el motor. rpm 0..1 recorre las tres capas con solape, asi que no hay salto
 * audible al pasar de una a otra; el playbackRate anade el barrido dentro de cada capa,
 * que es lo que da la sensacion de marcha larga. throttle baja el volumen al soltar gas.
 */
export function engine(rpm, speedFrac, throttle){
  if (!running) return;
  const r = Math.max(0, Math.min(1, rpm));
  const gas = 0.45 + 0.55 * Math.max(0, Math.min(1, throttle));

  // triangulos de mezcla centrados en 0.0 / 0.5 / 1.0
  const low  = Math.max(0, 1 - r / 0.5);
  const mid  = Math.max(0, 1 - Math.abs(r - 0.5) / 0.5);
  const high = Math.max(0, (r - 0.5) / 0.5);

  setLoop('engineLow',  low  * gas, 0.85 + r * 0.5);
  setLoop('engineMid',  mid  * gas, 0.85 + r * 0.6);
  setLoop('engineHigh', high * gas, 0.90 + r * 0.7);
  // el viento no depende de las revoluciones sino de la velocidad real
  setLoop('wind', Math.pow(Math.max(0, Math.min(1, speedFrac)), 1.4));
}

/* ---------- musica ---------- */

export async function playMusic(name, fadeMs = 900){
  if (name === current) return;
  if (name && !music.has(name)) await loadMusic(name);
  const from = current ? music.get(current) : null;
  const to = name ? music.get(name) : null;
  current = name;
  const target = Math.max(0, Math.min(1, state.music));
  if (to){
    to.volume = 0;
    try { if (to.paused){ const r = to.play(); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
  }
  clearInterval(fadeTimer);
  const step = 40, n = Math.max(1, Math.round(fadeMs / step));
  let k = 0;
  const v0 = from ? from.volume : 0;
  fadeTimer = setInterval(() => {
    k++;
    const p = Math.min(1, k / n);
    if (from) from.volume = v0 * (1 - p);
    if (to) to.volume = target * p;
    if (p >= 1){
      clearInterval(fadeTimer);
      if (from && from !== to){ try { from.pause(); } catch (e) {} }
    }
  }, step);
}

export function refreshVolumes(){
  const target = Math.max(0, Math.min(1, state.music));
  for (const [name, a] of music) a.volume = name === current ? target : 0;
  if (current){
    const a = music.get(current);
    if (a){
      if (state.music <= 0){ try { a.pause(); } catch (e) {} }
      else if (a.paused){ const r = a.play(); if (r && r.catch) r.catch(() => {}); }
    }
  }
}

export const currentTrack = () => current;
export function duck(on){
  const a = current ? music.get(current) : null;
  if (a) a.volume = Math.max(0, Math.min(1, state.music * (on ? 0.35 : 1)));
}

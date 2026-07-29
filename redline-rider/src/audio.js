/* Audio con HTMLAudioElement: decodeAudioData necesita fetch, que el navegador bloquea
   en file://, y el juego tiene que sonar igual abierto como archivo local que servido.

   El motor y el viento NO estan aqui: se sintetizan en engine.js, porque con muestras las
   revoluciones solo eligen cual suena y se oyen los escalones. Aqui quedan los efectos
   puntuales, los ambientes y la musica, que si son grabaciones. */

import { state } from './state.js';
import * as synth from './engine.js';

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
/* El motor y el viento ya NO son muestras: los sintetiza engine.js. Con bucles grabados las
   revoluciones solo elegian cual sonaba, se oian los escalones, y dos de las tres muestras
   caian en el mismo tono. Aqui solo quedan los ambientes, que si son grabaciones. */
export const LOOP_FILES = {
  ambDay:    BASE + 'amb/day.mp3',
  ambSunset: BASE + 'amb/sunset.mp3',
  ambNight:  BASE + 'amb/night.mp3'
};
/* La musica va en mp3, NO en m4a. El AAC lo genera sonilo_music por defecto, pero medido en
   el propio navegador: canPlayType('audio/mp4; codecs="mp4a.40.2"') devuelve "" en Chromium
   de codigo abierto, que no trae los codecs propietarios. La pista se quedaba en readyState 0
   y el menu sonaba en silencio en Chromium, en muchas compilaciones de Linux y en Brave. */
export const MUSIC_FILES = {
  menu: BASE + 'music/menu.mp3'
};

/* Mezcla por sonido. Los assets vienen de generaciones independientes y no comparten
   nivel; estos son los factores que los igualan (efectos por debajo de los bucles de
   motor, musica muy por debajo de todo). */
/* El ambiente va por DEBAJO del motor: es fondo, no protagonista. Los tres factores salen de la
   ENERGIA MEDIDA de cada clip, no del oido, porque vienen de generaciones independientes y no
   comparten nivel. Medido con tools/seam.mjs: rms 0,112 dia / 0,149 atardecer / 0,205 noche.
   Contra lo que parecia ("carretera vacia de noche" deberia ser el clip mas flojo), el nocturno
   sale casi el doble de fuerte que el diurno, asi que es el que hay que BAJAR. Los factores
   igualan los tres al nivel del de dia. */
const GAIN = {
  horn:0.55, crash:0.9, nearmiss:0.5, coin:0.55, brake:0.55, click:0.4,
  ambDay:0.32, ambSunset:0.24, ambNight:0.18
};

const POOL_SIZE = 4;
const pools = new Map();     // efectos puntuales: varias copias para solaparse
const loops = new Map();     // bucles: una sola copia cada uno
const music = new Map();
let current = null;
let fadeTimer = null;
let unlocked = false;
let running = false;         // el motor solo suena en marcha
let ambOn = false;           // el ambiente tambien, y va por su cuenta

function el(url, loop){
  const a = new Audio();
  a.src = url;
  a.loop = !!loop;
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  return a;
}

/* Un data URI largo no siempre lo acepta un <audio> (la pista de musica de 1,5 MB en
   base64 se quedaba en readyState 0 y no sonaba). Se pasa por Blob: el navegador recibe
   un recurso con su tipo real, y ademas el pool comparte una sola copia en memoria.
   fetch sobre data: esta permitido incluso en file://, asi que no rompe el modo local. */
const blobCache = new Map();
async function playable(url){
  if (!url.startsWith('data:')) return url;
  if (blobCache.has(url)) return blobCache.get(url);
  try {
    const r = await fetch(url);
    const b = URL.createObjectURL(await r.blob());
    blobCache.set(url, b);
    return b;
  } catch (e) {
    return url;                            // si falla, se intenta con el data URI tal cual
  }
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
  let url = await playable(direct);
  if (url === direct && !direct.startsWith('data:')){
    // servido por ruta: una sola descarga a blob para las cuatro copias del pool
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
  const a = el(await playable(resolve(LOOP_FILES[name])), true);
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
  const a = el(await playable(resolve(MUSIC_FILES[name])), true);
  a.volume = 0;
  music.set(name, a);
  await ready(a, 20000);
  return a;
}

/** El primer gesto del usuario habilita el audio (politica de autoplay). */
export function unlock(){
  if (unlocked) return;
  unlocked = true;
  // el motor sintetizado tambien necesita el gesto: AudioContext arranca suspendido
  synth.init();
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

/* ---------- bucles ---------- */

/* Los unicos bucles que quedan son los ambientes; el motor ya no es una muestra. La condicion
   de marcha es ambOn, NO la del motor: colgar el ambiente de la bandera del motor lo dejaba
   sonando al pausar, porque pause() para el motor y nadie volvia a tocar el bucle. */
function setLoop(name, vol, rate){
  const a = loops.get(name);
  if (!a) return;
  const v = Math.max(0, Math.min(1, vol * state.sfx * (GAIN[name] || 1)));
  a.volume = v;
  if (rate) a.playbackRate = Math.max(0.5, Math.min(2.6, rate));
  if (v > 0.001 && a.paused && ambOn){
    const r = a.play(); if (r && r.catch) r.catch(() => {});
  } else if ((v <= 0.001 || !ambOn) && !a.paused){
    try { a.pause(); } catch (e) {}
  }
}

/* ---------- motor ---------- */

export function engineStart(){
  running = true;
  synth.start();
}
export function engineStop(){
  running = false;
  synth.stop();
}

/* ---------- ambiente ----------
   Un bucle por ambiente, y solo suena el del ambiente activo. Se cruzan con una rampa para que
   cambiar de partida no corte el sonido de golpe. */
const AMB = { day:'ambDay', sunset:'ambSunset', night:'ambNight' };
let ambCur = null;
export function setAmbience(env){
  const want = AMB[env] || null;
  if (want === ambCur) return;
  ambCur = want;
  for (const name of Object.values(AMB)) setLoop(name, name === want ? 1 : 0);
}
export function ambienceOn(on){
  ambOn = !!on;
  for (const name of Object.values(AMB)) setLoop(name, on && name === ambCur ? 1 : 0);
}
export const ambienceTrack = () => ambCur;

/**
 * Mezcla el motor. rpm 0..1 recorre las tres capas con solape, asi que no hay salto
 * audible al pasar de una a otra; el playbackRate anade el barrido dentro de cada capa,
 * que es lo que da la sensacion de marcha larga. throttle baja el volumen al soltar gas.
 */
/** El nombre se mantiene para no tocar a quien lo llama; el trabajo lo hace el sintetizador. */
export function engine(rpm, speedFrac, throttle){
  if (!running) return;
  synth.update(rpm, speedFrac, throttle);
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

/** Solo para las herramientas de verificacion. Un formato que el navegador no sabe
    decodificar no lanza ningun error: deja readyState y duration a cero y no suena, asi que
    esta es la unica forma de comprobar desde fuera que una pista existe de verdad. */
export function probe(name){
  if (music.has(name)) return music.get(name);
  if (loops.has(name)) return loops.get(name);
  const p = pools.get(name);
  return p ? p.els[0] : null;
}

export const currentTrack = () => current;
/** Tambien solo para las pruebas: da acceso al sintetizador para medir su salida real. */
export const engineDebug = () => synth._debug();
export function duck(on){
  const a = current ? music.get(current) : null;
  if (a) a.volume = Math.max(0, Math.min(1, state.music * (on ? 0.35 : 1)));
}

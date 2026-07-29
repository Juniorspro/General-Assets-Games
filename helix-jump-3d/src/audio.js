/* Audio con HTMLAudioElement a proposito: decodeAudioData necesita fetch, que el
   navegador bloquea en file://. Asi el juego suena igual abierto como archivo local
   que servido por http. */

import { state } from './state.js';

const BASE = 'assets/audio/';
export const SFX_FILES = {
  click:      BASE + 'ui/click.mp3',
  hover:      BASE + 'ui/hover.mp3',
  bounce:     BASE + 'sfx/bounce.mp3',
  bounceHard: BASE + 'sfx/bounce-hard.mp3',
  pass:       BASE + 'sfx/pass.mp3',
  smash:      BASE + 'sfx/smash.mp3',
  coin:       BASE + 'sfx/coin.mp3',
  fire:       BASE + 'sfx/fire.mp3',
  die:        BASE + 'sfx/die.mp3',
  win:        BASE + 'sfx/win.mp3',
  portal:     BASE + 'sfx/portal.mp3'
};
export const MUSIC_FILES = {
  menu:    BASE + 'music/menu.mp3',
  aero:    BASE + 'music/game-aero.mp3',
  rooftop: BASE + 'music/game-rooftop.mp3'
};

/* Mezcla por sonido: los assets vienen de packs distintos y no comparten nivel. */
const GAIN = {
  click:0.5, hover:0.25, bounce:0.65, bounceHard:0.8, pass:0.35,
  smash:0.85, coin:0.6, fire:0.5, die:0.9, win:0.9, portal:0.7
};

const pools = new Map();     // name -> { els:[], i:0 }
const music = new Map();     // name -> HTMLAudioElement
let current = null;          // nombre de la pista sonando
let fadeTimer = null;
let unlocked = false;

const POOL_SIZE = 5;

function el(url, loop){
  const a = new Audio();
  a.src = url;
  a.loop = !!loop;
  a.preload = 'auto';
  a.crossOrigin = 'anonymous';
  return a;
}

/** Espera a que el elemento tenga datos suficientes; nunca cuelga la carga.
    No llama a load(): asignar .src con preload='auto' ya empieza la descarga, y
    volver a pedirla la aborta (ERR_ABORTED) y la reinicia. */
function ready(a, timeout = 12000){
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
    a.addEventListener('error', finish);   // un archivo que falle no debe bloquear el juego
  });
}

/** Un sonido necesita varias copias para poder solaparse consigo mismo. Se descarga
    una vez a un blob y todas las copias salen de ahi; con la ruta directa cada copia
    lanzaria su propia peticion. En file:// fetch esta bloqueado y se usa la ruta tal cual. */
async function poolFor(name){
  const direct = SFX_FILES[name];
  let url = direct;
  try {
    const r = await fetch(direct);
    if (r.ok) url = URL.createObjectURL(await r.blob());
  } catch (e) { /* file:// -> se cargan por ruta */ }
  const loop = name === 'fire';
  const els = [];
  for (let i = 0; i < POOL_SIZE; i++) els.push(el(url, loop));
  await ready(els[0]);
  pools.set(name, { els, i:0 });
}

export function sfxTasks(){
  return Object.keys(SFX_FILES).map(name => ({ label:name, run: () => poolFor(name) }));
}

export function musicTasks(){
  // solo el menu y la pista elegida entran en la carga inicial; el resto va en diferido
  const names = ['menu'];
  if (state.track && state.track !== 'none') names.push(state.track);
  return names.map(name => ({
    label: 'music:' + name,
    run: async () => { await loadMusic(name); }
  }));
}

async function loadMusic(name){
  if (!MUSIC_FILES[name] || music.has(name)) return music.get(name);
  const a = el(MUSIC_FILES[name], true);
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
    const a = p.els[0];
    const v = a.volume; a.volume = 0;
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
  } catch (e) { /* un sfx que no suena no interrumpe la partida */ }
  return a;
}

let fireEl = null;
export function fireLoop(on){
  const p = pools.get('fire');
  if (!p) return;
  if (on){
    if (fireEl) return;
    fireEl = p.els[0];
    fireEl.loop = true;
    fireEl.volume = Math.max(0, Math.min(1, state.sfx * GAIN.fire));
    fireEl.currentTime = 0;
    const r = fireEl.play(); if (r && r.catch) r.catch(() => {});
  } else if (fireEl){
    try { fireEl.pause(); fireEl.currentTime = 0; } catch (e) {}
    fireEl = null;
  }
}

export async function playMusic(name, fadeMs = 900){
  if (name === current) return;
  if (name && name !== 'none' && !music.has(name)) await loadMusic(name);
  const from = current ? music.get(current) : null;
  const to = name && name !== 'none' ? music.get(name) : null;
  current = name;
  const target = Math.max(0, Math.min(1, state.music));
  if (to){
    to.volume = 0;
    try { if (to.paused) { const r = to.play(); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
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
  if (current && state.music <= 0){ const a = music.get(current); if (a) { try { a.pause(); } catch (e) {} } }
  else if (current){ const a = music.get(current); if (a && a.paused){ const r = a.play(); if (r && r.catch) r.catch(() => {}); } }
  if (fireEl) fireEl.volume = Math.max(0, Math.min(1, state.sfx * GAIN.fire));
}

export const currentTrack = () => current;
export function duck(on){
  const a = current ? music.get(current) : null;
  if (a) a.volume = Math.max(0, Math.min(1, state.music * (on ? 0.35 : 1)));
}

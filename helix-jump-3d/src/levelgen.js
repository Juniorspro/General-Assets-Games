/* Estructura de nivel del original: una tanda fija de anillos y una plataforma de meta
   al fondo. Completar el nivel abre el siguiente, con mas anillos y menos hueco. */

import { TAU, norm2 } from './gfx.js';

export const SLOTS = 12;
export const SLOT = TAU / SLOTS;
export const LEVEL_H = 3.0;          // separacion vertical entre anillos
export const R_CORE = 1.7;
export const R_OUT = 4.4;
export const RING_H = 0.42;
export const R_PATH = (R_CORE + R_OUT) / 2;
export const BALL_R = 0.50;
export const START_H = LEVEL_H * 1.5; // altura de caida inicial

export const ringCountFor = level => Math.min(28, 8 + level * 2);

function gapsOf(segs){
  const out = [];
  const sorted = segs.slice().sort((a, b) => a.s - b.s);
  for (let i = 0; i < sorted.length; i++){
    const cur = sorted[i], nxt = sorted[(i + 1) % sorted.length];
    const gs = cur.s + cur.len;
    const len = norm2(nxt.s - gs);
    if (len > 0.02) out.push({ s: gs, len });
  }
  return out;
}

function makeRing(i, level, d){
  const y = -i * LEVEL_H;

  let gapWide = Math.max(2, Math.round(3 - d));         // 3 -> 2 slots por hueco
  let gapCount = Math.random() < 0.25 ? 3 : 2;
  while (gapCount * gapWide > SLOTS - 2){               // siempre quedan >=2 slots solidos
    if (gapWide > 2) gapWide--; else gapCount--;
  }

  // huecos repartidos por sectores con jitter: nunca se solapan
  const open = new Array(SLOTS).fill(false);
  const span = SLOTS / gapCount, room = Math.floor(span) - gapWide;
  for (let g = 0; g < gapCount; g++){
    const st = Math.round(g * span) + (room > 0 ? (Math.random() * (room + 1)) | 0 : 0);
    for (let k = 0; k < gapWide; k++) open[(st + k) % SLOTS] = true;
  }

  // tramos contiguos de slots solidos -> segmentos
  const segs = [];
  let start = 0;
  while (start < SLOTS && !open[start]) start++;
  if (start === SLOTS) start = 0;
  for (let k = 0; k < SLOTS; k++){
    const idx = (start + k) % SLOTS;
    if (open[idx]) continue;
    const prev = (start + k - 1 + SLOTS) % SLOTS;
    if (k > 0 && !open[prev] && segs.length) segs[segs.length - 1].len += SLOT;
    else segs.push({ s: idx * SLOT, len: SLOT, danger:false });
  }

  if (level >= 2){
    const maxBad = Math.floor(segs.length / 2);
    const p = 0.12 + d * 0.4;
    let bad = 0;
    for (const sg of segs) if (bad < maxBad && Math.random() < p){ sg.danger = true; bad++; }
  }

  // anillos que giran solos: entran en el nivel 4 y se hacen mas frecuentes
  const spin = (level >= 4 && Math.random() < Math.min(0.4, 0.12 + d * 0.35))
    ? (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.45)
    : 0;

  return { i, y, segs, spin, offset:0, coins:[], arrow:null, gaps:gapsOf(segs), smashed:false, passed:false };
}

export function makeLevel(level){
  const d = Math.min(1, (level - 1) / 12);
  const count = ringCountFor(level);
  const rings = [];
  for (let i = 0; i < count; i++) rings.push(makeRing(i, level, d));

  // monedas en los huecos: recompensan pasar por el sitio justo
  for (const r of rings){
    if (!r.gaps.length || Math.random() > 0.45) continue;
    const g = r.gaps[(Math.random() * r.gaps.length) | 0];
    r.coins.push({ a: g.s + g.len / 2, taken:false });
  }

  // una o dos flechas verdes por nivel, en el tramo central
  if (level >= 2){
    const n = level >= 8 ? 2 : 1;
    for (let k = 0; k < n; k++){
      const lo = Math.max(1, Math.floor(count * (0.25 + k * 0.35)));
      const hi = Math.min(count - 2, lo + Math.floor(count * 0.25));
      const r = rings[lo + ((Math.random() * Math.max(1, hi - lo)) | 0)];
      if (r && r.gaps.length && !r.arrow){
        const g = r.gaps[(Math.random() * r.gaps.length) | 0];
        r.arrow = { a: g.s + g.len / 2, taken:false };
        if (r.coins.length) r.coins.length = 0;    // flecha y moneda nunca se solapan
      }
    }
  }

  return { level, rings, count, goalY: -count * LEVEL_H, d };
}

/** Segmento solido bajo el angulo local dado, o null si hay hueco. */
export function solidAt(ring, local, tol){
  if (ring.smashed) return null;
  const a = norm2(local - ring.offset);
  for (const sg of ring.segs){
    const dd = norm2(a - sg.s);
    if (dd <= sg.len || dd - sg.len <= tol || TAU - dd <= tol) return sg;
  }
  return null;
}

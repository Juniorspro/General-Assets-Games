/* ===== motor VERTICAL (portrait) — compartido por los 5 juegos ============
   Espacio lógico fijo 540x960. El stage se ajusta al viewport manteniendo el
   aspecto (letterbox). Paso fijo 1/60 con acumulador + alpha de interpolación.
   Audio con respaldo sintetizado. Guardado. Partículas. */
(function () {
'use strict';
const W = 540, H = 960;
const LOC = new URLSearchParams(location.search).has('local');
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);

/* -------- ajuste del stage -------- */
let scale = 1, dpr = 1;
function fit() {
  const vw = innerWidth, vh = innerHeight;
  const s = Math.min(vw / W, vh / H);
  const pw = Math.round(W * s), ph = Math.round(H * s);
  const st = $('stage');
  st.style.width = pw + 'px'; st.style.height = ph + 'px';
  dpr = Math.min(devicePixelRatio || 1, 2.2) * (ARC.q || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  scale = dpr;
  if (GAME.resize) try { GAME.resize(); } catch (e) {}
}
addEventListener('resize', fit);

/* -------- audio: buffers + respaldo sintetizado -------- */
const AU = { ctx: null, master: null, musGain: null, sfxGain: null, buf: {}, musSrc: null, on: true, vib: true };
try { AU.on = localStorage.getItem(SLUG + '_son') !== '0'; AU.vib = localStorage.getItem(SLUG + '_vib') !== '0'; } catch (e) {}
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.on ? 1 : 0; AU.master.connect(AU.ctx.destination);
  AU.musGain = AU.ctx.createGain(); AU.musGain.gain.value = .38; AU.musGain.connect(AU.master);
  AU.sfxGain = AU.ctx.createGain(); AU.sfxGain.gain.value = .8; AU.sfxGain.connect(AU.master);
  const load = (name, url) => fetch(url).then(r => r.arrayBuffer()).then(a => AU.ctx.decodeAudioData(a))
    .then(b => { AU.buf[name] = b; }).catch(() => {});
  for (const k in (GAME.sfx || {})) load(k, GAME.sfx[k]);
}
/* blip sintetizado: distinto timbre por nombre para que no suene todo igual */
const BEEP = { pop: [660, .06, 'sine'], coin: [1180, .12, 'square'], boom: [90, .3, 'sawtooth'],
  shoot: [880, .08, 'square'], swipe: [420, .12, 'sawtooth'], win: [740, .3, 'triangle'],
  lose: [180, .4, 'sawtooth'], power: [520, .22, 'triangle'], tap: [520, .05, 'sine'],
  hit: [240, .1, 'square'], bounce: [420, .07, 'sine'] };
function synth(name, vol, rate) {
  const c = AU.ctx; if (!c) return;
  const d = BEEP[name] || BEEP.tap;
  const o = c.createOscillator(), g = c.createGain();
  o.type = d[2]; o.frequency.value = d[0] * (rate || 1);
  if (name === 'coin') o.frequency.setValueAtTime(d[0] * 1.5 * (rate || 1), c.currentTime + .06);
  if (name === 'lose') o.frequency.exponentialRampToValueAtTime(70, c.currentTime + d[1]);
  if (name === 'win') o.frequency.setValueAtTime(d[0] * 1.5, c.currentTime + .12);
  g.gain.value = 0; g.gain.linearRampToValueAtTime((vol || 1) * .5, c.currentTime + .01);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d[1]);
  o.connect(g); g.connect(AU.sfxGain); o.start(); o.stop(c.currentTime + d[1] + .02);
}
function sfx(name, opt) {
  opt = opt || {}; if (!AU.ctx || !AU.on) return;
  const b = AU.buf[name];
  if (b) { const s = AU.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = opt.rate || 1;
    const g = AU.ctx.createGain(); g.gain.value = opt.vol == null ? 1 : opt.vol;
    s.connect(g); g.connect(AU.sfxGain); s.start(); }
  else synth(name, opt.vol, opt.rate);
}
function music(url) {
  if (!AU.ctx || !url) return;
  fetch(url).then(r => r.arrayBuffer()).then(a => AU.ctx.decodeAudioData(a)).then(b => {
    if (AU.musSrc) try { AU.musSrc.stop(); } catch (e) {}
    const s = AU.ctx.createBufferSource(); s.buffer = b; s.loop = true;
    s.connect(AU.musGain); s.start(); AU.musSrc = s;
  }).catch(() => {});
}

/* -------- guardado -------- */
const SAVE = { best: 0, coins: 0 };
try { const j = JSON.parse(localStorage.getItem(SLUG + '_save') || '{}'); Object.assign(SAVE, j); } catch (e) {}
function persist() { try { localStorage.setItem(SLUG + '_save', JSON.stringify(SAVE)); } catch (e) {} }

/* -------- partículas + sacudida + toast -------- */
const PS = [];
function fxBurst(x, y, color, n, spd) { n = n || 12; spd = spd || 5;
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(.3, 1) * spd;
    PS.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, r: rnd(2, 5), life: 1, col: color, g: .18 }); } }
function fxRing(x, y, color, r0) { PS.push({ ring: 1, x, y, r: r0 || 6, vr: 5, life: 1, col: color }); }
function fxText(x, y, txt, color) { PS.push({ text: txt, x, y, vy: -1.4, life: 1, col: color || '#fff' }); }
function fxStep() {
  for (let i = PS.length - 1; i >= 0; i--) { const p = PS[i];
    p.life -= p.text ? .016 : .02;
    if (p.ring) { p.r += p.vr; p.vr *= .92; }
    else { p.x += p.vx; p.y += p.vy; if (p.g) { p.vy += p.g; } if (!p.text) { p.vx *= .98; } if (p.text) p.y += p.vy; }
    if (p.life <= 0) PS.splice(i, 1); }
}
function fxDraw(g) {
  for (const p of PS) { g.globalAlpha = Math.max(0, p.life);
    if (p.ring) { g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.stroke(); }
    else if (p.text) { g.fillStyle = p.col; g.font = '900 34px system-ui'; g.textAlign = 'center';
      g.fillText(p.text, p.x, p.y); }
    else { g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill(); } }
  g.globalAlpha = 1;
}
let shakeM = 0;
function shake(m) { shakeM = Math.max(shakeM, m); }
let toastT = 0;
function toast(t) { $('toast').textContent = t; $('toast').classList.add('on'); toastT = 1.6; }

/* -------- pantallas -------- */
let state = 'load';
function show(s) {
  state = s;
  $('load').classList.toggle('on', s === 'load');
  $('menu').classList.toggle('on', s === 'menu');
  $('hud').classList.toggle('on', s === 'game' || s === 'pause');
  $('pause').classList.toggle('on', s === 'pause');
  $('over').classList.toggle('on', s === 'over');
  if (s === 'menu') refreshBadges();
}
function refreshBadges() { $('bgBest').textContent = '★ ' + (SAVE.best || 0); $('bgCoin').textContent = '◆ ' + (SAVE.coins || 0); }

/* -------- API pública -------- */
const ARC = window.ARC = {
  W, H, rnd, clamp, LOC, THREE: null, q: 1,
  sfx, music, vib(ms) { if (AU.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
  fx: { burst: fxBurst, ring: fxRing, text: fxText }, shake, toast,
  hud(score, info) { $('score').textContent = score; if (info != null) $('info').textContent = info; },
  S: SAVE, save: persist,
  over(o) { endGame(o); },
  addCoins(n) { SAVE.coins = (SAVE.coins || 0) + n; persist(); }
};

/* -------- fin de partida -------- */
function endGame(o) {
  o = o || {};
  if (o.coins) ARC.addCoins(o.coins);
  const sc = o.score || 0;
  let rec = false;
  if (sc > (SAVE.best || 0)) { SAVE.best = sc; rec = true; persist(); }
  $('ovTitle').textContent = o.title || (o.win ? '¡GANASTE!' : 'FIN');
  $('ovSub').textContent = o.sub || (rec ? '¡NUEVO RÉCORD!' : '');
  $('ovScore').textContent = sc;
  $('ovBest').textContent = (GAME.best || 'RÉCORD') + ': ' + (SAVE.best || 0);
  sfx(o.win ? 'win' : 'lose');
  show('over');
}

/* -------- bucle: paso fijo + interpolación -------- */
let last = 0, acc = 0; const STEP = 1 / 60;
function frame(t) {
  requestAnimationFrame(frame);
  const now = t / 1000; let dt = now - last; last = now;
  if (dt > .25) dt = .25; if (!last) dt = 0;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (state === 'game') { acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) { try { GAME.step(STEP); } catch (e) { console.error(e); } acc -= STEP; steps++; }
    fxStep();
  } else if (state === 'menu') { fxStep(); }
  // render
  const alpha = state === 'game' ? acc / STEP : 0;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);
  let sx = 0, sy = 0;
  if (shakeM > 0) { sx = rnd(-shakeM, shakeM); sy = rnd(-shakeM, shakeM); shakeM *= .86; if (shakeM < .3) shakeM = 0; }
  ctx.save(); ctx.translate(sx, sy);
  if (state === 'menu' && GAME.attract) { try { GAME.attract(dt, ctx); } catch (e) {} }
  if (state === 'game' || state === 'pause' || state === 'over') { try { GAME.draw(ctx, alpha); } catch (e) {} }
  fxDraw(ctx);
  ctx.restore();
}

/* -------- puntero en espacio lógico -------- */
function pt(e) {
  const r = $('stage').getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX);
  const cy = (e.touches ? e.touches[0].clientY : e.clientY);
  return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H };
}
let dragging = false;
function onDown(e) { audioInit(); if (state !== 'game') return; e.preventDefault(); dragging = true; if (GAME.down) GAME.down(pt(e), e); }
function onMove(e) { if (state !== 'game' || !dragging) return; e.preventDefault(); if (GAME.move) GAME.move(pt(e), e); }
function onUp(e) { if (state !== 'game') return; dragging = false; if (GAME.up) GAME.up(pt(e), e); }
cv.addEventListener('touchstart', onDown, { passive: false });
cv.addEventListener('touchmove', onMove, { passive: false });
cv.addEventListener('touchend', onUp);
cv.addEventListener('mousedown', onDown); addEventListener('mousemove', onMove); addEventListener('mouseup', onUp);
addEventListener('keydown', e => { if (GAME.key) GAME.key(e.code, true); });
addEventListener('keyup', e => { if (GAME.key) GAME.key(e.code, false); });

/* -------- arranque de partida -------- */
function begin() {
  audioInit();
  acc = 0; PS.length = 0; shakeM = 0;
  try { GAME.start(); } catch (e) { console.error(e); }
  if (GAME.music) music(GAME.music);
  show('game');
}

/* -------- botones -------- */
function bind() {
  const go = () => { audioInit(); $('load').classList.remove('on'); show('menu'); };
  $('ldGo').addEventListener('click', go);
  $('ldGo').addEventListener('touchstart', e => { e.preventDefault(); go(); }, { passive: false });
  document.querySelectorAll('#ldLang .chip').forEach(ch => ch.addEventListener('click', () => {
    document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.remove('on')); ch.classList.add('on');
    LANG = ch.dataset.l; localStorage.setItem(SLUG + '_lang', LANG); applyLang();
  }));
  const play = e => { if (e) e.preventDefault(); begin(); };
  $('bPlay').addEventListener('click', play);
  $('bPlay').addEventListener('touchstart', play, { passive: false });
  $('bPause').addEventListener('click', () => { if (state === 'game') show('pause'); });
  $('pReanudar').addEventListener('click', () => { if (state === 'pause') { last = 0; show('game'); } });
  $('pMenu').addEventListener('click', () => show('menu'));
  $('oOtra').addEventListener('click', () => begin());
  $('oMenu').addEventListener('click', () => show('menu'));
  $('miSon').addEventListener('click', () => { AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? 1 : 0;
    localStorage.setItem(SLUG + '_son', AU.on ? '1' : '0'); $('miSon').textContent = AU.on ? '🔊' : '🔇'; });
  $('miVib').addEventListener('click', () => { AU.vib = !AU.vib; localStorage.setItem(SLUG + '_vib', AU.vib ? '1' : '0');
    $('miVib').style.opacity = AU.vib ? 1 : .4; });
  $('miSon').textContent = AU.on ? '🔊' : '🔇'; $('miVib').style.opacity = AU.vib ? 1 : .4;
}

/* -------- idioma -------- */
let LANG = 'es';
try { LANG = localStorage.getItem(SLUG + '_lang') || 'es'; } catch (e) {}
window.LANG = LANG;
function applyLang() { window.LANG = LANG; if (GAME.lang) try { GAME.lang(LANG); } catch (e) {} }

/* -------- arte del menú/carga -------- */
function loadArt() {
  if (!GAME.art) return;
  const img = new Image();
  img.onload = () => { $('load').style.backgroundImage = 'url(' + GAME.art + ')';
    $('load').style.backgroundSize = 'cover'; $('load').style.backgroundPosition = 'center';
    $('ldTitle').style.display = 'none'; $('ldSub').style.opacity = '.9'; };
  img.src = GAME.art;
}

/* -------- init -------- */
function boot() {
  document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.toggle('on', c.dataset.l === LANG));
  bind(); applyLang(); loadArt();
  if (GAME.three) return; // los 3D esperan a three.js (boot3d)
  if (GAME.init) try { GAME.init(); } catch (e) { console.error(e); }
  fit(); refreshBadges();
  requestAnimationFrame(frame);
}
window.__BOOT = boot;

/* -------- ganchos de prueba (headless) -------- */
window.__ARC = {
  state: () => state, W, H,
  goMenu: () => { $('load').classList.remove('on'); show('menu'); },
  play: () => begin(),
  pause: () => { if (state === 'game') show('pause'); },
  snap: () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let lum = 0, cols = {}; const n = cv.width * cv.height;
    for (let i = 0; i < d.length; i += 4 * 97) { lum += (d[i] + d[i + 1] + d[i + 2]);
      cols[(d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5)] = 1; }
    return { luz: +(lum / (n / 97 * 3) / 255).toFixed(3), colores: Object.keys(cols).length }; },
  dbg: () => GAME.dbg || {}
};
})();

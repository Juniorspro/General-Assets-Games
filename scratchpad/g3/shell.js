/* ===== motor 3D APAISADO — pantalla completa + rotación en celular ========
   Espacio lógico 960x540. En celular vertical el stage se gira 90°. three.js
   para 3D; canvas 2D encima para HUD/mira/partículas. Paso fijo 1/60. */
(function () {
'use strict';
const LW = 960, LH = 540;
const $ = id => document.getElementById(id);
const gl = $('gl'), cv = $('cv'), ctx = cv.getContext('2d');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
let THREE = null, GLTF = null, renderer = null, scene = null, cam = null;

/* -------- ajuste + rotación -------- */
let rot = 0, S = 1, dpr = 1;
function fit() {
  const vw = innerWidth, vh = innerHeight;
  rot = vh > vw ? 90 : 0;
  S = rot ? Math.min(vh / LW, vw / LH) : Math.min(vw / LW, vh / LH);
  const st = $('stage');
  st.style.width = (LW * S) + 'px'; st.style.height = (LH * S) + 'px';
  st.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
  dpr = Math.min(devicePixelRatio || 1, 2) * (ARC.q || 1);
  cv.width = Math.round(LW * dpr); cv.height = Math.round(LH * dpr);
  if (renderer) { renderer.setPixelRatio(dpr); renderer.setSize(LW, LH, false); if (cam) { cam.aspect = LW / LH; cam.updateProjectionMatrix(); } }
  if (GAME.resize) try { GAME.resize(LW, LH); } catch (e) {}
}
addEventListener('resize', fit);

/* -------- puntero en espacio lógico (con rotación) -------- */
function pt(e) {
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const px = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
  const py = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
  let lx, ly;
  if (rot) { lx = py / S; ly = -px / S; } else { lx = px / S; ly = py / S; }
  return { x: lx + LW / 2, y: ly + LH / 2 };
}
/* delta de arrastre en ejes lógicos (para mirar) */
function delt(dx, dy) { return rot ? { x: dy, y: -dx } : { x: dx, y: dy }; }

/* -------- audio -------- */
const AU = { ctx: null, master: null, musGain: null, sfxGain: null, buf: {}, musSrc: null, on: true, vib: true };
try { AU.on = localStorage.getItem(SLUG + '_son') !== '0'; AU.vib = localStorage.getItem(SLUG + '_vib') !== '0'; } catch (e) {}
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.on ? 1 : 0; AU.master.connect(AU.ctx.destination);
  AU.musGain = AU.ctx.createGain(); AU.musGain.gain.value = .32; AU.musGain.connect(AU.master);
  AU.sfxGain = AU.ctx.createGain(); AU.sfxGain.gain.value = .85; AU.sfxGain.connect(AU.master);
  for (const k in (GAME.sfx || {})) fetch(GAME.sfx[k]).then(r => r.arrayBuffer()).then(a => AU.ctx.decodeAudioData(a)).then(b => AU.buf[k] = b).catch(() => {});
}
const BEEP = { shoot: [520, .08, 'square'], boom: [90, .3, 'sawtooth'], hit: [200, .12, 'square'],
  coin: [1180, .12, 'square'], win: [740, .3, 'triangle'], lose: [170, .4, 'sawtooth'],
  power: [520, .22, 'triangle'], tap: [500, .05, 'sine'], swipe: [420, .1, 'sawtooth'],
  reload: [300, .14, 'square'], hurt: [150, .2, 'sawtooth'], step: [120, .05, 'sine'] };
function synth(name, vol, rate) { const c = AU.ctx; if (!c) return; const d = BEEP[name] || BEEP.tap;
  const o = c.createOscillator(), g = c.createGain(); o.type = d[2]; o.frequency.value = d[0] * (rate || 1);
  if (name === 'lose' || name === 'boom') o.frequency.exponentialRampToValueAtTime(60, c.currentTime + d[1]);
  g.gain.value = 0; g.gain.linearRampToValueAtTime((vol || 1) * .5, c.currentTime + .008);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d[1]);
  o.connect(g); g.connect(AU.sfxGain); o.start(); o.stop(c.currentTime + d[1] + .02); }
function sfx(name, opt) { opt = opt || {}; if (!AU.ctx || !AU.on) return; const b = AU.buf[name];
  if (b) { const s = AU.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = opt.rate || 1;
    const g = AU.ctx.createGain(); g.gain.value = opt.vol == null ? 1 : opt.vol; s.connect(g); g.connect(AU.sfxGain); s.start(); }
  else synth(name, opt.vol, opt.rate); }
function music(url) { if (!AU.ctx || !url) return; fetch(url).then(r => r.arrayBuffer()).then(a => AU.ctx.decodeAudioData(a)).then(b => {
  if (AU.musSrc) try { AU.musSrc.stop(); } catch (e) {} const s = AU.ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(AU.musGain); s.start(); AU.musSrc = s; }).catch(() => {}); }

/* -------- guardado -------- */
const SAVE = { best: 0, coins: 0 };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem(SLUG + '_save') || '{}')); } catch (e) {}
function persist() { try { localStorage.setItem(SLUG + '_save', JSON.stringify(SAVE)); } catch (e) {} }

/* -------- fx 2D -------- */
const PS = [];
function fxBurst(x, y, col, n, spd) { n = n || 12; spd = spd || 5; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(.3, 1) * spd;
  PS.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(2, 5), life: 1, col }); } }
function fxText(x, y, txt, col) { PS.push({ text: txt, x, y, vy: -1.2, life: 1, col: col || '#fff' }); }
function fxRing(x, y, col, r0) { PS.push({ ring: 1, x, y, r: r0 || 6, vr: 4, life: 1, col }); }
function fxStep() { for (let i = PS.length - 1; i >= 0; i--) { const p = PS[i]; p.life -= p.text ? .016 : .03;
  if (p.ring) { p.r += p.vr; p.vr *= .92; } else { p.x += p.vx || 0; p.y += p.vy || 0; if (p.text) p.y += p.vy; } if (p.life <= 0) PS.splice(i, 1); } }
function fxDraw(g) { for (const p of PS) { g.globalAlpha = Math.max(0, p.life);
  if (p.ring) { g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.stroke(); }
  else if (p.text) { g.fillStyle = p.col; g.font = '900 28px system-ui'; g.textAlign = 'center'; g.fillText(p.text, p.x, p.y); }
  else { g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill(); } } g.globalAlpha = 1; }
let shakeM = 0; function shake(m) { shakeM = Math.max(shakeM, m); }
let toastT = 0; function toast(t) { $('toast').textContent = t; $('toast').classList.add('on'); toastT = 1.6; }

/* -------- pantallas -------- */
let state = 'load';
function show(s) { state = s;
  $('load').classList.toggle('on', s === 'load'); $('menu').classList.toggle('on', s === 'menu');
  $('hud').classList.toggle('on', s === 'game' || s === 'pause');
  $('pause').classList.toggle('on', s === 'pause'); $('over').classList.toggle('on', s === 'over');
  if (s === 'menu') { $('bgBest').textContent = '★ ' + (SAVE.best || 0); $('bgCoin').textContent = '◆ ' + (SAVE.coins || 0); } }

/* -------- API -------- */
const ARC = window.ARC = {
  W: LW, H: LH, rnd, clamp, get THREE() { return THREE; }, get scene() { return scene; }, get cam() { return cam; },
  get renderer() { return renderer; }, q: 1,
  sfx, music, vib(ms) { if (AU.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
  fx: { burst: fxBurst, text: fxText, ring: fxRing }, shake, toast,
  S: SAVE, save: persist, addCoins(n) { SAVE.coins = (SAVE.coins || 0) + n; persist(); },
  loadGLB(url) { return new Promise((res, rej) => { if (!GLTF) return rej('no gltf'); new GLTF().load(url, g => res(g), undefined, e => rej(e)); }); },
  over(o) { endGame(o); },
  hud() {}, over2: null
};

function endGame(o) { o = o || {}; if (o.coins) ARC.addCoins(o.coins);
  const sc = o.score || 0; let rec = false; if (sc > (SAVE.best || 0)) { SAVE.best = sc; rec = true; persist(); }
  $('ovTitle').textContent = o.title || (o.win ? '¡GANASTE!' : 'FIN'); $('ovSub').textContent = o.sub || (rec ? '¡NUEVO RÉCORD!' : '');
  $('ovScore').textContent = sc; $('ovBest').textContent = (GAME.best || 'RÉCORD') + ': ' + (SAVE.best || 0);
  sfx(o.win ? 'win' : 'lose'); if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) {} show('over'); }

/* -------- bucle -------- */
let last = 0, acc = 0; const STEP = 1 / 60;
function frame(t) { requestAnimationFrame(frame);
  const now = t / 1000; let dt = now - last; last = now; if (dt > .25) dt = .25; if (!last) dt = 0;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (state === 'game') { acc += dt; let n = 0; while (acc >= STEP && n < 5) { try { GAME.step(STEP); } catch (e) { console.error(e); } acc -= STEP; n++; } fxStep(); }
  else if (state === 'menu') { try { if (GAME.attract3d) GAME.attract3d(dt); } catch (e) {} fxStep(); }
  const alpha = state === 'game' ? acc / STEP : 0;
  // render 3D
  if (renderer && scene && cam && (state === 'game' || state === 'pause' || state === 'over' || state === 'menu')) { try { renderer.render(scene, cam); } catch (e) {} }
  // overlay 2D
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, LW, LH);
  let sx = 0, sy = 0; if (shakeM > 0) { sx = rnd(-shakeM, shakeM); sy = rnd(-shakeM, shakeM); shakeM *= .85; if (shakeM < .3) shakeM = 0; }
  ctx.save(); ctx.translate(sx, sy);
  if ((state === 'game' || state === 'pause' || state === 'over') && GAME.draw2d) { try { GAME.draw2d(ctx, alpha); } catch (e) {} }
  if (state === 'menu' && GAME.menu2d) { try { GAME.menu2d(ctx); } catch (e) {} }
  fxDraw(ctx); ctx.restore();
}

/* -------- entrada -------- */
let dragging = false, lastX = 0, lastY = 0;
function onDown(e) { audioInit(); if (state !== 'game') return; e.preventDefault(); dragging = true;
  const c = e.touches ? e.touches[0] : e; lastX = c.clientX; lastY = c.clientY; if (GAME.down) GAME.down(pt(e), e); }
function onMove(e) { if (state !== 'game') return; const c = e.touches ? e.touches[0] : e;
  if (dragging) { e.preventDefault(); let dx = c.clientX - lastX, dy = c.clientY - lastY; lastX = c.clientX; lastY = c.clientY;
    const d = delt(dx, dy); if (GAME.look) GAME.look(d.x, d.y); }
  if (GAME.move) GAME.move(pt(e), e); }
function onUp(e) { if (state !== 'game') return; dragging = false; if (GAME.up) GAME.up(pt(e), e); }
cv.parentElement.addEventListener('touchstart', onDown, { passive: false });
cv.parentElement.addEventListener('touchmove', onMove, { passive: false });
addEventListener('touchend', onUp);
gl.addEventListener('mousedown', onDown); addEventListener('mousemove', e => {
  if (state === 'game' && document.pointerLockElement) { const d = delt(e.movementX, e.movementY); if (GAME.look) GAME.look(d.x, d.y); if (GAME.aimMove) GAME.aimMove(); }
  onMove(e); });
addEventListener('mouseup', onUp);
addEventListener('keydown', e => { if (GAME.key) GAME.key(e.code, true); });
addEventListener('keyup', e => { if (GAME.key) GAME.key(e.code, false); });

/* -------- pantalla completa + orientación -------- */
function goFull() { const el = document.documentElement; const r = el.requestFullscreen || el.webkitRequestFullscreen;
  if (r) { try { const p = r.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  if (screen.orientation && screen.orientation.lock) { try { const p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }

/* -------- arranque de partida -------- */
function begin() { audioInit(); acc = 0; PS.length = 0; shakeM = 0; try { GAME.start(); } catch (e) { console.error(e); }
  if (GAME.music) music(GAME.music); show('game'); }

/* -------- botones -------- */
function bind() {
  const go = () => { audioInit(); goFull(); $('load').classList.remove('on'); show('menu'); };
  $('ldGo').addEventListener('click', go); $('ldGo').addEventListener('touchstart', e => { e.preventDefault(); go(); }, { passive: false });
  document.querySelectorAll('#ldLang .chip').forEach(ch => ch.addEventListener('click', () => {
    document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.remove('on')); ch.classList.add('on');
    LANG = ch.dataset.l; try { localStorage.setItem(SLUG + '_lang', LANG); } catch (e) {} window.LANG = LANG; if (GAME.lang) try { GAME.lang(LANG); } catch (e) {} }));
  const play = e => { if (e) e.preventDefault(); goFull(); begin(); };
  $('bPlay').addEventListener('click', play); $('bPlay').addEventListener('touchstart', play, { passive: false });
  $('pReanudar').addEventListener('click', () => { if (state === 'pause') { last = 0; show('game'); } });
  $('pMenu').addEventListener('click', () => show('menu'));
  $('oOtra').addEventListener('click', () => begin()); $('oMenu').addEventListener('click', () => show('menu'));
  $('miSon').addEventListener('click', () => { AU.on = !AU.on; if (AU.master) AU.master.gain.value = AU.on ? 1 : 0;
    try { localStorage.setItem(SLUG + '_son', AU.on ? '1' : '0'); } catch (e) {} $('miSon').textContent = AU.on ? '🔊' : '🔇'; });
  $('miVib').addEventListener('click', () => { AU.vib = !AU.vib; try { localStorage.setItem(SLUG + '_vib', AU.vib ? '1' : '0'); } catch (e) {} $('miVib').style.opacity = AU.vib ? 1 : .4; });
  $('miSon').textContent = AU.on ? '🔊' : '🔇'; $('miVib').style.opacity = AU.vib ? 1 : .4;
}
window.ARC_pause = () => { if (state === 'game') show('pause'); };

/* -------- idioma -------- */
let LANG = 'es'; try { LANG = localStorage.getItem(SLUG + '_lang') || 'es'; } catch (e) {}
window.LANG = LANG;

/* -------- init 3D + boot -------- */
function loadArt() {
  if (!GAME.art) return;
  const img = new Image();
  img.onload = () => {
    const ld = $('load');
    ld.style.backgroundImage = 'linear-gradient(180deg,rgba(5,6,12,.05),rgba(5,6,12,.45)),url(' + GAME.art + ')';
    ld.style.backgroundSize = 'cover'; ld.style.backgroundPosition = 'center';
    $('ldT').style.display = 'none';
    const mn = $('menu');
    mn.style.backgroundImage = 'url(' + GAME.art + ')';
    mn.style.backgroundSize = 'cover'; mn.style.backgroundPosition = 'center';
    $('mTitle').style.display = 'none';       // la portada ya trae el título
  };
  img.src = GAME.art;
}
async function boot() {
  document.querySelectorAll('#ldLang .chip').forEach(c => c.classList.toggle('on', c.dataset.l === LANG));
  bind(); loadArt();
  try {
    THREE = await import(TRE);
    const gm = await import(GLTFURL); GLTF = gm.GLTFLoader;
    renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // sombras en tiempo real (los juegos activan castShadow)
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(70, LW / LH, .1, 400);
    fit();
    if (GAME.init3d) await GAME.init3d(THREE);
    $('ldFill').style.width = '100%';
    requestAnimationFrame(frame);
  } catch (e) { console.error('boot3d', e); $('ldS').textContent = 'error 3D'; }
}
window.__BOOT = boot;

/* -------- ganchos de prueba -------- */
const snapCv = document.createElement('canvas'); snapCv.width = 240; snapCv.height = 135; const sctx = snapCv.getContext('2d');
window.__ARC = {
  state: () => state, W: LW, H: LH,
  goMenu: () => { $('load').classList.remove('on'); show('menu'); },
  play: () => begin(), pause: () => { if (state === 'game') show('pause'); },
  snap: () => { try { sctx.drawImage(gl, 0, 0, 240, 135); } catch (e) { return { luz: 0, colores: 0 }; }
    const d = sctx.getImageData(0, 0, 240, 135).data; let lum = 0; const cols = {};
    for (let i = 0; i < d.length; i += 4 * 13) { lum += d[i] + d[i + 1] + d[i + 2]; cols[(d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5)] = 1; }
    return { luz: +(lum / (d.length / (4 * 13) * 3) / 255).toFixed(3), colores: Object.keys(cols).length }; },
  dbg: () => GAME.dbg || {}
};
})();

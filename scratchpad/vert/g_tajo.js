/* ===== TAJO — cortá objetos al vuelo, combos y bombas ===================== */
(function () {
const W = 540, H = 960, G = 0.34;
const FRUIT = [['#ff5470', '#ffb3c0'], ['#ffd23f', '#fff0a8'], ['#8cff66', '#d6ffc4'], ['#4dd2ff', '#c4f0ff'], ['#c07dff', '#e8d6ff']];
let objs, halves, blade, score, lives, dead, t, spawnT, combo, comboT, lastP;

function GAMEstart() {
  objs = []; halves = []; blade = []; score = 0; lives = 3; dead = false; t = 0; spawnT = .6; combo = 0; comboT = 0; lastP = null;
  ARC.hud(0, '♥♥♥');
}
function hud() { ARC.hud(score, '♥'.repeat(Math.max(0, lives))); }

function spawn() {
  const n = 1 + (Math.random() < .5 ? 1 : 0) + (Math.random() < .25 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const bomb = Math.random() < .14;
    const x = ARC.rnd(70, W - 70);
    objs.push({ x, y: H + 30, vx: ARC.rnd(-2.4, 2.4) + (W / 2 - x) * .012, vy: ARC.rnd(-19, -22), r: 30, spin: ARC.rnd(-.1, .1), rot: 0, bomb, col: (Math.random() * FRUIT.length) | 0, sliced: false });
  }
  ARC.sfx('launch', { vol: .3, rate: 1 });
}

function sliceObj(o) {
  if (o.sliced) return; o.sliced = true;
  if (o.bomb) { ARC.shake(14); ARC.fx.burst(o.x, o.y, '#ff5470', 22, 9); ARC.fx.ring(o.x, o.y, '#fff', 10); ARC.sfx('boom', { vol: .6 }); ARC.vib(60);
    lives = 0; dead = true; ARC.over({ win: false, score, title: '¡BOMBA!' }); return; }
  combo++; comboT = .7; const pts = 10 * Math.max(1, combo);
  score += pts; hud();
  const c = FRUIT[o.col];
  ARC.fx.burst(o.x, o.y, c[0], 14, 6); ARC.fx.burst(o.x, o.y, c[1], 8, 4);
  ARC.sfx('swipe', { vol: .4, rate: ARC.rnd(.9, 1.2) }); ARC.vib(15);
  if (combo >= 2) ARC.fx.text(o.x, o.y - 20, 'x' + combo, c[1]);
  // dos mitades volando
  for (let s = -1; s <= 1; s += 2) halves.push({ x: o.x, y: o.y, vx: o.vx + s * 3, vy: o.vy * .5 - 1, rot: o.rot, vr: s * .2, col: o.col, side: s, life: 1.4 });
  const i = objs.indexOf(o); if (i >= 0) objs.splice(i, 1);
}

function seg(ax, ay, bx, by) {
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i];
    // distancia del centro al segmento
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    let tt = ((o.x - ax) * dx + (o.y - ay) * dy) / L; tt = ARC.clamp(tt, 0, 1);
    const px = ax + dx * tt, py = ay + dy * tt;
    if ((o.x - px) ** 2 + (o.y - py) ** 2 < (o.r + 6) ** 2) sliceObj(o);
  }
}

function GAMEstep(dt) {
  if (dead) return; t += dt;
  if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
  spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = ARC.rnd(.75, 1.4); }
  for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; o.vy += G; o.x += o.vx; o.y += o.vy; o.rot += o.spin;
    if (o.y > H + 60 && o.vy > 0) { objs.splice(i, 1); if (!o.bomb) { lives--; hud(); ARC.sfx('lose', { vol: .3 }); ARC.shake(4);
      if (lives <= 0) { dead = true; ARC.over({ win: false, score, title: 'SE TE ESCAPARON' }); } } }
  }
  for (let i = halves.length - 1; i >= 0; i--) { const h = halves[i]; h.vy += G; h.x += h.vx; h.y += h.vy; h.rot += h.vr; h.life -= dt; if (h.life <= 0 || h.y > H + 60) halves.splice(i, 1); }
  for (let i = blade.length - 1; i >= 0; i--) { blade[i].life -= dt * 3; if (blade[i].life <= 0) blade.splice(i, 1); }
}

function drawFruit(g, x, y, rot, col, r, half) {
  const c = FRUIT[col];
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = c[0];
  if (half) { g.beginPath(); g.arc(0, 0, r, half > 0 ? -1.57 : 1.57, half > 0 ? 1.57 : 4.71); g.closePath(); g.fill();
    g.fillStyle = c[1]; g.beginPath(); g.arc(0, 0, r * .7, half > 0 ? -1.57 : 1.57, half > 0 ? 1.57 : 4.71); g.closePath(); g.fill(); }
  else { g.beginPath(); g.arc(0, 0, r, 0, 6.28); g.fill();
    g.fillStyle = c[1]; g.beginPath(); g.arc(-r * .3, -r * .3, r * .4, 0, 6.28); g.fill(); }
  g.restore();
}
function GAMEdraw(g) {
  g.fillStyle = '#140a1e'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 5; i++) g.beginPath(), g.arc(W * (i / 5) + 40, 200 + i * 120, 90, 0, 6.28), g.fill();
  for (const h of halves) { g.globalAlpha = Math.min(1, h.life); drawFruit(g, h.x, h.y, h.rot, h.col, 28, h.side); }
  g.globalAlpha = 1;
  for (const o of objs) {
    if (o.bomb) { g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
      g.fillStyle = '#1a1a22'; g.beginPath(); g.arc(0, 0, o.r, 0, 6.28); g.fill();
      g.fillStyle = '#ff5470'; g.beginPath(); g.arc(-o.r * .3, -o.r * .3, o.r * .3, 0, 6.28); g.fill();
      g.strokeStyle = '#ffb04d'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -o.r); g.lineTo(4, -o.r - 10); g.stroke(); g.restore(); }
    else drawFruit(g, o.x, o.y, o.rot, o.col, o.r);
  }
  // hoja
  if (blade.length > 1) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineCap = 'round';
    for (let i = 1; i < blade.length; i++) { g.lineWidth = 10 * blade[i].life; g.strokeStyle = 'rgba(180,240,255,' + blade[i].life + ')';
      g.beginPath(); g.moveTo(blade[i - 1].x, blade[i - 1].y); g.lineTo(blade[i].x, blade[i].y); g.stroke(); } }
}

let ao, at3 = 0;
function attract(dt, g) {
  at3 += dt;
  if (!ao) { ao = []; }
  if (Math.random() < .04) ao.push({ x: ARC.rnd(80, W - 80), y: H + 30, vx: ARC.rnd(-2, 2), vy: ARC.rnd(-18, -21), r: 30, rot: 0, spin: ARC.rnd(-.1, .1), col: (Math.random() * 5) | 0 });
  g.fillStyle = '#140a1e'; g.fillRect(0, 0, W, H);
  for (let i = ao.length - 1; i >= 0; i--) { const o = ao[i]; o.vy += G; o.x += o.vx; o.y += o.vy; o.rot += o.spin; if (o.y > H + 60) ao.splice(i, 1); else drawFruit(g, o.x, o.y, o.rot, o.col, o.r); }
}

function addBlade(p) { blade.push({ x: p.x, y: p.y, life: 1 }); if (blade.length > 12) blade.shift(); }

window.GAME = {
  slug: 'tajo', name: 'TAJO', sub: 'cortá al vuelo', acc: '#ff4de1',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init() {}, start: GAMEstart, step: GAMEstep, draw: GAMEdraw, resize() {}, attract,
  down(p) { lastP = p; addBlade(p); },
  move(p) { if (lastP) seg(lastP.x, lastP.y, p.x, p.y); lastP = p; addBlade(p); },
  up() { lastP = null; },
  dbg: {
    state: () => ({ score, lives, objs: objs ? objs.length : 0, dead }),
    autoPlay() {
      if (dead) return;
      // cortar la fruta (no bomba) más alta en pantalla
      let tgt = null; for (const o of objs) if (!o.bomb && !o.sliced && o.y > 0 && o.y < H - 40) { if (!tgt || o.y < tgt.y) tgt = o; }
      if (tgt) { seg(tgt.x - 40, tgt.y, tgt.x + 40, tgt.y); addBlade({ x: tgt.x - 40, y: tgt.y }); addBlade({ x: tgt.x + 40, y: tgt.y }); }
    }
  }
};
})();

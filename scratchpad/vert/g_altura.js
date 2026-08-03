/* ===== ALTURA — trepador infinito (doodle-jump) vertical ================== */
(function () {
const W = 540, H = 960, G = 0.5, JUMP = -16.5, PW = 82, PH = 18, SCROLL = H * 0.42;
const PCOL = { normal: '#8cff66', move: '#4dd2ff', break: '#ff9f45', spring: '#ffd23f' };
let pl, plats, springs, height, best, dead, tx, t, maxTopY;

function makePlat(y, forceNormal) {
  const r = Math.random();
  let type = 'normal';
  if (!forceNormal) { if (r < .12) type = 'break'; else if (r < .30) type = 'move'; }
  const p = { x: ARC.rnd(20, W - PW - 20), y, w: PW, type, vx: type === 'move' ? (Math.random() < .5 ? 1.6 : -1.6) : 0, dead: false, spring: (type === 'normal' && Math.random() < .18) };
  return p;
}
function GAMEstart() {
  pl = { x: W / 2, y: H - 200, vx: 0, vy: JUMP, r: 22 };
  tx = W / 2; height = 0; dead = false; t = 0; maxTopY = pl.y;
  plats = [];
  plats.push({ x: W / 2 - PW / 2, y: H - 120, w: PW, type: 'normal', vx: 0, dead: false, spring: false });
  for (let y = H - 220; y > -40; y -= ARC.rnd(70, 105)) plats.push(makePlat(y, y > H - 400));
  ARC.hud(0, 'METROS');
}

function bounce(spring) { pl.vy = spring ? JUMP * 1.6 : JUMP; ARC.sfx(spring ? 'power' : 'bounce', { vol: spring ? .6 : .4, rate: spring ? 1 : 1.3 });
  if (spring) { ARC.vib(30); ARC.fx.ring(pl.x, pl.y + pl.r, '#ffd23f', 8); } }

function GAMEstep(dt) {
  if (dead) return; t += dt;
  pl.x += (tx - pl.x) * .28;
  if (pl.x < -pl.r) pl.x += W + pl.r * 2; if (pl.x > W + pl.r) pl.x -= W + pl.r * 2;
  pl.vy += G; pl.y += pl.vy;
  // colisión con plataformas (sólo al caer)
  if (pl.vy > 0) for (const p of plats) { if (p.dead) continue;
    if (pl.x + pl.r * .6 > p.x && pl.x - pl.r * .6 < p.x + p.w && pl.y + pl.r > p.y && pl.y + pl.r < p.y + PH + pl.vy) {
      if (p.type === 'break') { p.dead = true; ARC.fx.burst(pl.x, p.y, PCOL.break, 8, 4); ARC.sfx('hit', { vol: .4 }); }
      else { bounce(p.spring); pl.y = p.y - pl.r; break; }
    } }
  // plataformas móviles
  for (const p of plats) if (p.type === 'move') { p.x += p.vx; if (p.x < 10 || p.x > W - p.w - 10) p.vx *= -1; }
  // scroll cuando sube
  if (pl.y < SCROLL) { const dy = SCROLL - pl.y; pl.y = SCROLL; height += dy;
    for (const p of plats) p.y += dy;
    // reciclar y generar arriba
    for (let i = plats.length - 1; i >= 0; i--) if (plats[i].y > H + 40) plats.splice(i, 1);
    let top = 1e9; for (const p of plats) top = Math.min(top, p.y);
    while (top > -20) { top -= ARC.rnd(70, 105); plats.push(makePlat(top)); }
  }
  ARC.hud(height / 10 | 0, 'METROS');
  if (pl.y - pl.r > H) { dead = true; ARC.over({ win: false, score: height / 10 | 0, title: 'CAÍSTE', coins: (height / 200 | 0) }); }
}

function drawChar(g, x, y) {
  g.fillStyle = '#7dff9e'; g.beginPath(); g.ellipse(x, y, pl.r, pl.r * 1.05, 0, 0, 6.28); g.fill();
  g.fillStyle = '#0a1226'; g.beginPath(); g.arc(x - 8, y - 4, 5, 0, 6.28); g.arc(x + 8, y - 4, 5, 0, 6.28); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 6, y - 5, 2, 0, 6.28); g.arc(x + 10, y - 5, 2, 0, 6.28); g.fill();
  g.fillStyle = '#0a1226'; g.beginPath(); g.arc(x, y + 8, 5, .1, 3.04); g.stroke();
  // patas
  g.strokeStyle = '#4bbf6e'; g.lineWidth = 4; g.beginPath();
  g.moveTo(x - 8, y + pl.r - 2); g.lineTo(x - 8, y + pl.r + 6); g.moveTo(x + 8, y + pl.r - 2); g.lineTo(x + 8, y + pl.r + 6); g.stroke();
}
function GAMEdraw(g) {
  g.fillStyle = '#0a1226'; g.fillRect(0, 0, W, H);
  // nubes/estrellas de fondo por altura
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let i = 0; i < 8; i++) { const y = (i * 140 + (height * .3 % 140)); g.fillRect(0, y, W, 2); }
  for (const p of plats) { if (p.dead) continue;
    g.fillStyle = PCOL[p.type]; roundRect(g, p.x, p.y, p.w, PH, 8); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; roundRect(g, p.x, p.y, p.w, 6, 6); g.fill();
    if (p.spring) { g.fillStyle = '#ffd23f'; g.fillRect(p.x + p.w / 2 - 8, p.y - 10, 16, 10); } }
  drawChar(g, pl.x, pl.y);
  if (pl.x < pl.r) drawChar(g, pl.x + W, pl.y);
  if (pl.x > W - pl.r) drawChar(g, pl.x - W, pl.y);
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

let ay = 0, aplats;
function attract(dt, g) {
  if (!aplats) { aplats = []; for (let y = 0; y < H; y += 90) aplats.push({ x: ARC.rnd(20, W - 100), y, t: ['normal', 'move', 'spring'][(Math.random() * 3) | 0] }); }
  ay += dt * 40;
  g.fillStyle = '#0a1226'; g.fillRect(0, 0, W, H);
  for (const p of aplats) { const y = (p.y + ay) % (H + 40) - 20; g.fillStyle = PCOL[p.t] || PCOL.normal; roundRect(g, p.x, y, 82, PH, 8); g.fill(); }
  const bx = W / 2 + Math.sin(ay * .04) * 150, by = H * 0.4 + Math.sin(ay * .12) * 30;
  drawChar(g, bx, by);
}

window.GAME = {
  slug: 'altura', name: 'ALTURA', sub: 'subí sin caer', acc: '#7dff9e',
  music: null, art: null, sfx: {}, best: 'METROS',
  init() {}, start: GAMEstart, step: GAMEstep, draw: GAMEdraw, resize() {}, attract,
  down(p) { tx = p.x; }, move(p) { tx = p.x; }, up() {},
  dbg: {
    state: () => ({ m: height / 10 | 0, dead, y: pl ? pl.y | 0 : 0 }),
    autoPlay() {
      if (dead) return;
      // ir hacia la plataforma sólida más cercana por encima del jugador
      let best2 = null, bd = 1e9;
      for (const p of plats) { if (p.dead || p.type === 'break') continue;
        if (p.y < pl.y + pl.r && pl.y - p.y < bd) { bd = pl.y - p.y; best2 = p; } }
      tx = best2 ? best2.x + best2.w / 2 : pl.x;
    }
  }
};
})();

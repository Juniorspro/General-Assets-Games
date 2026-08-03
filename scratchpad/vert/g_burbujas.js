/* ===== BURBUJAS — bubble shooter vertical ================================= */
(function () {
const W = 540, H = 960, R = 25, ROWH = R * 1.72, COLS = 10, TOPY = 150;
const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd23f', '#8cff66', '#c07dff', '#ff9f45'];
const cx = c => c * 2 * R + R;
const rowX = (r) => (r & 1) ? R : 0;

let grid, shooter, shot, aim, aiming, next, score, lost, cleared, aimT, shotsFired;
function bubbleCount() { let n = 0; if (grid) for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c)) n++; return n; }

function cellPos(r, c) { return { x: rowX(r) + cx(c), y: TOPY + r * ROWH }; }
function colorsInPlay() {
  const s = new Set(); for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (grid[r] && grid[r][c] >= 0) s.add(grid[r][c]);
  return s.size ? [...s] : [0, 1, 2, 3];
}
function pickColor() { const cs = colorsInPlay(); return cs[(Math.random() * cs.length) | 0]; }

function newBoard(rows) {
  grid = [];
  for (let r = 0; r < rows; r++) { grid[r] = []; for (let c = 0; c < COLS - (r & 1); c++) grid[r][c] = (Math.random() * 4) | 0; }
  for (let r = rows; r < 14; r++) grid[r] = [];
}

function GAMEstart() {
  score = 0; lost = false; cleared = false; aiming = false; aim = -Math.PI / 2; aimT = 0; shotsFired = 0;
  newBoard(5);
  shooter = { x: W / 2, y: H - 66 };
  next = [pickColor(), pickColor()];
  shot = null;
  ARC.hud(0, '');
}

function loadShot() { next[0] = next[1]; next[1] = pickColor(); }

function fire(angle) {
  if (shot) return;
  const sp = 15;
  shot = { x: shooter.x, y: shooter.y, vx: Math.cos(angle) * sp, vy: Math.sin(angle) * sp, col: next[0] };
  shotsFired++;
  loadShot();
  ARC.sfx('shoot', { vol: .5, rate: 1.2 });
}

/* --- vecinos hex --- */
function neighbors(r, c) {
  const odd = r & 1;
  const list = [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + (odd ? 1 : -1)], [r + 1, c], [r + 1, c + (odd ? 1 : -1)]];
  return list.filter(([rr, cc]) => rr >= 0 && rr < grid.length && cc >= 0 && grid[rr] && cc < COLS - (rr & 1));
}
function has(r, c) { return grid[r] && grid[r][c] != null && grid[r][c] >= 0; }

function snap(x, y, col) {
  let br = 0, bc = 0, bd = 1e9;
  for (let r = 0; r < 13; r++) { const cols = COLS - (r & 1);
    for (let c = 0; c < cols; c++) { if (has(r, c)) continue;
      const p = cellPos(r, c); const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      // sólo celdas que toquen algo existente o la fila 0
      if (d < bd) { const touch = r === 0 || neighbors(r, c).some(([rr, cc]) => has(rr, cc));
        if (touch) { bd = d; br = r; bc = c; } } } }
  if (!grid[br]) grid[br] = [];
  grid[br][bc] = col;
  return { r: br, c: bc };
}

function floodSame(r, c, col, seen) {
  const key = r + ',' + c; if (seen.has(key)) return; if (grid[r][c] !== col) return;
  seen.add(key);
  for (const [rr, cc] of neighbors(r, c)) if (has(rr, cc)) floodSame(rr, cc, col, seen);
}

function popCluster(r, c) {
  const col = grid[r][c], seen = new Set();
  floodSame(r, c, col, seen);
  if (seen.size >= 3) {
    for (const k of seen) { const [rr, cc] = k.split(',').map(Number); const p = cellPos(rr, cc);
      grid[rr][cc] = -1; ARC.fx.burst(p.x, p.y, COLORS[col], 8, 5); }
    score += seen.size * 10;
    ARC.sfx('pop', { rate: 1 + Math.min(seen.size, 8) * .05 }); ARC.vib(20);
    dropFloating();
    if (seen.size >= 5) { ARC.shake(6); ARC.fx.text(shooter.x, H / 2, '+' + seen.size, COLORS[col]); }
    return true;
  }
  return false;
}

function dropFloating() {
  // marca todo conectado a la fila 0
  const keep = new Set(), stack = [];
  for (let c = 0; c < COLS; c++) if (has(0, c)) { stack.push([0, c]); keep.add('0,' + c); }
  while (stack.length) { const [r, c] = stack.pop();
    for (const [rr, cc] of neighbors(r, c)) if (has(rr, cc) && !keep.has(rr + ',' + cc)) { keep.add(rr + ',' + cc); stack.push([rr, cc]); } }
  let dropped = 0;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c) && !keep.has(r + ',' + c)) {
    const p = cellPos(r, c); ARC.fx.burst(p.x, p.y, COLORS[grid[r][c]], 6, 6); grid[r][c] = -1; dropped++; }
  if (dropped) { score += dropped * 15; ARC.sfx('coin', { vol: .5 }); }
  ARC.hud(score, '');
  // ¿tablero limpio?
  if (!colorsHave()) { cleared = true; ARC.over({ win: true, score, title: '¡TABLERO LIMPIO!', coins: (score / 20) | 0 }); }
}
function colorsHave() { if (!grid) return false; for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c)) return true; return false; }

function lowest() { let m = 0; for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c)) m = Math.max(m, cellPos(r, c).y); return m; }

function GAMEstep(dt) {
  if (lost || cleared) return;
  aimT += dt;
  if (shot) {
    for (let s = 0; s < 3; s++) {
      shot.x += shot.vx / 3; shot.y += shot.vy / 3;
      if (shot.x < R) { shot.x = R; shot.vx *= -1; ARC.sfx('bounce', { vol: .3 }); }
      if (shot.x > W - R) { shot.x = W - R; shot.vx *= -1; ARC.sfx('bounce', { vol: .3 }); }
      let hit = shot.y <= TOPY + R * .3;
      if (!hit) { outer: for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c)) {
        const p = cellPos(r, c); if ((p.x - shot.x) ** 2 + (p.y - shot.y) ** 2 < (2 * R - 4) ** 2) { hit = true; break outer; } } }
      if (hit) { const cell = snap(shot.x, shot.y, shot.col); const p = cellPos(cell.r, cell.c);
        ARC.fx.ring(p.x, p.y, COLORS[shot.col], 6); shot = null;
        if (!popCluster(cell.r, cell.c)) { ARC.sfx('tap', { vol: .4 }); ARC.hud(score, ''); }
        if (lowest() > shooter.y - 90 && !cleared) { lost = true; ARC.over({ win: false, score, title: 'TE ALCANZARON' }); }
        break; }
    }
  }
}

function GAMEdraw(g, alpha) {
  // fondo
  g.fillStyle = '#0a0a1e'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.03)';
  for (let i = 0; i < 6; i++) g.fillRect(0, TOPY + i * 130 + (aimT * 8 % 130), W, 2);
  // línea de peligro
  g.strokeStyle = 'rgba(255,80,80,.35)'; g.lineWidth = 3; g.setLineDash([12, 10]);
  g.beginPath(); g.moveTo(0, shooter.y - 90); g.lineTo(W, shooter.y - 90); g.stroke(); g.setLineDash([]);
  // burbujas
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c)) drawBubble(g, cellPos(r, c).x, cellPos(r, c).y, grid[r][c]);
  // mira
  if (aiming && !shot) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.setLineDash([8, 12]);
    let x = shooter.x, y = shooter.y, vx = Math.cos(aim), vy = Math.sin(aim);
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 60; i++) { x += vx * 14; y += vy * 14; if (x < R || x > W - R) vx *= -1; if (y < TOPY) break; g.lineTo(x, y); }
    g.stroke(); g.setLineDash([]); }
  // cañón
  g.save(); g.translate(shooter.x, shooter.y); g.rotate(aim + Math.PI / 2);
  g.fillStyle = '#2a2a44'; g.fillRect(-11, -46, 22, 46); g.restore();
  if (!shot) drawBubble(g, shooter.x, shooter.y, next[0]);
  drawBubble(g, W - 42, H - 42, next[1], .7);
  if (shot) drawBubble(g, shot.x, shot.y, shot.col);
}
function drawBubble(g, x, y, col, sc) {
  sc = sc || 1; const r = R * sc;
  g.fillStyle = COLORS[col]; g.beginPath(); g.arc(x, y, r - 1, 0, 6.28); g.fill();
  const gr = g.createRadialGradient(x - r * .3, y - r * .35, 1, x, y, r);
  gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.4, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r - 1, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r - 1, 0, 6.28); g.stroke();
}

/* --- menú vivo: burbujas subiendo --- */
let ab = null;
function attract(dt, g) {
  if (!ab) { ab = []; for (let i = 0; i < 24; i++) ab.push({ x: ARC.rnd(0, W), y: ARC.rnd(0, H), col: (Math.random() * 6) | 0, s: ARC.rnd(.5, 1.1), v: ARC.rnd(20, 60) }); }
  g.fillStyle = '#0a0a1e'; g.fillRect(0, 0, W, H);
  for (const b of ab) { b.y -= b.v * dt; if (b.y < -40) { b.y = H + 40; b.x = ARC.rnd(0, W); }
    drawBubble(g, b.x, b.y, b.col, b.s); }
}

/* --- control --- */
function aimTo(p) { let a = Math.atan2(p.y - shooter.y, p.x - shooter.x);
  a = ARC.clamp(a, -Math.PI + .25, -.25); aim = a; }

window.GAME = {
  slug: 'burbujas', name: 'BURBUJAS', sub: 'apuntá y explotá', acc: '#4dd2ff',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init() {}, start: GAMEstart, step: GAMEstep, draw: GAMEdraw, resize() {}, attract,
  down(p) { aiming = true; aimTo(p); },
  move(p) { aiming = true; aimTo(p); },
  up(p) { if (aiming) { aiming = false; fire(aim); } },
  dbg: {
    state: () => ({ score, lost, cleared, shots: shotsFired, count: bubbleCount() }),
    autoPlay() {
      if (shot || lost || cleared) return;
      // apuntar a una burbuja del mismo color (para que realmente explote)
      const targets = [];
      for (let r = 0; r < grid.length; r++) for (let c = 0; c < COLS; c++) if (has(r, c) && grid[r][c] === next[0]) targets.push(cellPos(r, c));
      if (targets.length) { const t = targets[(Math.random() * targets.length) | 0]; aimTo({ x: t.x, y: t.y + R }); }
      else aim = ARC.rnd(-Math.PI + .6, -.6);
      fire(aim);
    }
  }
};
})();

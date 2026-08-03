/* ===== REBOTE — breakout vertical con power-ups =========================== */
(function () {
const W = 540, H = 960, PADY = H - 70, BR = 10;
const COLS = 8, BW = W / COLS, BH = 30, TOP = 130;
const HUE = ['#ff5470', '#ff9f45', '#ffd23f', '#8cff66', '#4dd2ff', '#c07dff'];

let paddle, balls, bricks, drops, score, lives, lvl, launched, tx, won, dead, t;

function makeLevel(n) {
  bricks = [];
  const rows = Math.min(4 + n, 8);
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    if (n > 1 && Math.random() < .12) continue;
    const hp = r < 2 ? 1 : (Math.random() < .35 ? 2 : 1);
    bricks.push({ x: c * BW, y: TOP + r * BH, hp, col: (r + n) % HUE.length, pow: Math.random() < .12 });
  }
}
function resetBall() { launched = false; balls = [{ x: paddle.x, y: PADY - BR - 2, vx: 0, vy: 0 }]; }

function GAMEstart() {
  score = 0; lives = 3; lvl = 1; won = false; dead = false; t = 0;
  paddle = { x: W / 2, w: 118 }; tx = W / 2;
  makeLevel(1); resetBall(); drops = [];
  ARC.hud(0, '♥♥♥  NIVEL 1');
}
function launch() { if (launched) return; launched = true; const a = -Math.PI / 2 + ARC.rnd(-.4, .4);
  const sp = 8.4; balls[0].vx = Math.cos(a) * sp; balls[0].vy = Math.sin(a) * sp; ARC.sfx('shoot', { vol: .4, rate: 1.4 }); }

function hud() { ARC.hud(score, '♥'.repeat(Math.max(0, lives)) + '  NIVEL ' + lvl); }

function brickHit(b, ball) {
  b.hp--;
  ARC.fx.burst(ball.x, ball.y, HUE[b.col], 6, 4);
  if (b.hp <= 0) {
    score += 10 * lvl; ARC.sfx('pop', { rate: 1.1 }); ARC.vib(12);
    ARC.fx.burst(b.x + BW / 2, b.y + BH / 2, HUE[b.col], 8, 5);
    if (b.pow) drops.push({ x: b.x + BW / 2, y: b.y + BH / 2, kind: (Math.random() < .5 ? 'wide' : 'multi') });
    const i = bricks.indexOf(b); if (i >= 0) bricks.splice(i, 1);
  } else ARC.sfx('tap', { vol: .4, rate: 1.6 });
  hud();
  if (!bricks.length) nextLevel();
}
function nextLevel() { lvl++; won = false; ARC.sfx('win', { vol: .5 }); ARC.toast('NIVEL ' + lvl);
  paddle.w = 118; makeLevel(lvl); resetBall(); }

function GAMEstep(dt) {
  if (won || dead) return; t += dt;
  paddle.x += (tx - paddle.x) * .3;
  paddle.x = ARC.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
  if (!launched) { balls[0].x = paddle.x; balls[0].y = PADY - BR - 2; }
  for (let bi = balls.length - 1; bi >= 0; bi--) {
    const ball = balls[bi];
    for (let s = 0; s < 3; s++) {
      ball.x += ball.vx / 3; ball.y += ball.vy / 3;
      if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); ARC.sfx('bounce', { vol: .3 }); }
      if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx); ARC.sfx('bounce', { vol: .3 }); }
      if (ball.y < BR + 90) { ball.y = BR + 90; ball.vy = Math.abs(ball.vy); ARC.sfx('bounce', { vol: .3 }); }
      // paleta
      if (ball.vy > 0 && ball.y + BR > PADY && ball.y < PADY + 14 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + BR) {
        ball.y = PADY - BR; const rel = (ball.x - paddle.x) / (paddle.w / 2);
        const sp = Math.min(11, Math.hypot(ball.vx, ball.vy) + .06);
        const a = -Math.PI / 2 + rel * 1.05; ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp;
        ARC.sfx('bounce', { vol: .5, rate: 1.2 });
      }
      // ladrillos
      for (const b of bricks) {
        if (ball.x > b.x - BR && ball.x < b.x + BW + BR && ball.y > b.y - BR && ball.y < b.y + BH + BR) {
          const ox = Math.min(ball.x - (b.x - BR), (b.x + BW + BR) - ball.x);
          const oy = Math.min(ball.y - (b.y - BR), (b.y + BH + BR) - ball.y);
          if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
          brickHit(b, ball); break;
        }
      }
    }
    if (ball.y > H + 20) { balls.splice(bi, 1);
      if (!balls.length) { lives--; hud(); ARC.sfx('lose', { vol: .5 }); ARC.shake(6);
        if (lives <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN VIDAS' }); }
        else { paddle.w = 118; resetBall(); } } }
  }
  // caídas de power-up
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.y += 3.4;
    if (Math.abs(d.x - paddle.x) < paddle.w / 2 + 14 && d.y > PADY - 14 && d.y < PADY + 20) {
      if (d.kind === 'wide') { paddle.w = Math.min(190, paddle.w + 44); ARC.toast('PALETA ANCHA'); }
      else { const ex = balls[0] || { x: paddle.x, y: PADY - 20, vx: 3, vy: -6 };
        for (let k = 0; k < 2; k++) balls.push({ x: ex.x, y: ex.y, vx: ARC.rnd(-6, 6), vy: -Math.abs(ex.vy || 7) }); ARC.toast('MULTI-BOLA'); launched = true; }
      ARC.sfx('power'); ARC.vib(20); drops.splice(i, 1); }
    else if (d.y > H) drops.splice(i, 1);
  }
}

function GAMEdraw(g) {
  g.fillStyle = '#0b1026'; g.fillRect(0, 0, W, H);
  for (const b of bricks) {
    g.fillStyle = HUE[b.col]; roundRect(g, b.x + 3, b.y + 3, BW - 6, BH - 6, 6); g.fill();
    if (b.hp > 1) { g.fillStyle = 'rgba(255,255,255,.35)'; roundRect(g, b.x + 3, b.y + 3, BW - 6, (BH - 6) / 2, 6); g.fill(); }
    if (b.pow) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(b.x + BW / 2, b.y + BH / 2, 4, 0, 6.28); g.fill(); }
  }
  for (const d of drops) { g.fillStyle = d.kind === 'wide' ? '#4dd2ff' : '#ffd23f'; roundRect(g, d.x - 12, d.y - 8, 24, 16, 5); g.fill();
    g.fillStyle = '#06121c'; g.font = '900 12px system-ui'; g.textAlign = 'center'; g.fillText(d.kind === 'wide' ? '↔' : '＋', d.x, d.y + 4); }
  // paleta
  g.fillStyle = '#ffb04d'; roundRect(g, paddle.x - paddle.w / 2, PADY, paddle.w, 16, 8); g.fill();
  g.fillStyle = 'rgba(255,255,255,.4)'; roundRect(g, paddle.x - paddle.w / 2, PADY, paddle.w, 6, 6); g.fill();
  for (const ball of balls) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, 6.28); g.fill();
    g.fillStyle = 'rgba(120,200,255,.6)'; g.beginPath(); g.arc(ball.x - 3, ball.y - 3, BR * .5, 0, 6.28); g.fill(); }
  if (!launched) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '900 22px system-ui'; g.textAlign = 'center'; g.fillText('TOCÁ PARA LANZAR', W / 2, PADY - 60); }
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

let ab, at2 = 0, dpad = W / 2, dv = 3.2, dball;
function attract(dt, g) {
  at2 += dt;
  if (!dball) dball = { x: W / 2, y: 640, vx: 3.4, vy: -4.2 };
  g.fillStyle = '#0b1026'; g.fillRect(0, 0, W, H);
  // muro de ladrillos con color que gira (menú BIEN vivo)
  const off = Math.floor(at2 * 2);
  for (let r = 0; r < 4; r++) for (let c = 0; c < COLS; c++) {
    g.fillStyle = HUE[(r + c + off) % HUE.length]; roundRect(g, c * BW + 3, 150 + r * BH, BW - 6, BH - 6, 6); g.fill();
  }
  // paleta y bola de demostración
  dpad += dv * (dball.x > dpad ? 1 : -1); dpad = ARC.clamp(dpad, 70, W - 70);
  dball.x += dball.vx; dball.y += dball.vy;
  if (dball.x < 20 || dball.x > W - 20) dball.vx *= -1;
  if (dball.y < 150) dball.vy = Math.abs(dball.vy);
  if (dball.y > 700) dball.vy = -Math.abs(dball.vy);
  g.fillStyle = '#ffb04d'; roundRect(g, dpad - 60, 760, 120, 16, 8); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(dball.x, dball.y, 13, 0, 6.28); g.fill();
}

window.__BALL=()=>balls&&balls[0]?{x:Math.round(balls[0].x),y:Math.round(balls[0].y),vx:+balls[0].vx.toFixed(1),vy:+balls[0].vy.toFixed(1),launched}:null;
window.GAME = {
  slug: 'rebote', name: 'REBOTE', sub: 'rompé todo', acc: '#ffb04d',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init() {}, start: GAMEstart, step: GAMEstep, draw: GAMEdraw, resize() {}, attract,
  down(p) { tx = p.x; launch(); }, move(p) { tx = p.x; }, up() {},
  dbg: {
    state: () => ({ score, lives, lvl, bricks: bricks ? bricks.length : 0, dead, won }),
    autoPlay() {
      if (dead) return;
      const ball = balls && balls[0];
      if (!ball) return;
      if (!launched) { launch(); return; }
      // predecir dónde cruza la paleta (rebotes en paredes/techo)
      let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy, n = 0;
      while (y < PADY && n < 600) { x += vx; y += vy; if (x < BR) { x = BR; vx = Math.abs(vx); } if (x > W - BR) { x = W - BR; vx = -Math.abs(vx); } if (y < BR + 90) { y = BR + 90; vy = Math.abs(vy); } n++; }
      tx = (vy > 0 && n < 600) ? x : ball.x;
    }
  }
};
})();

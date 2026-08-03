/* ===== ORION — mataenemigos espacial vertical con oleadas y jefe ========== */
(function () {
const W = 540, H = 960, SHY = H - 130;
let ship, bul, ebul, foes, boss, stars, score, kills, hp, wave, spawnT, waveN, dead, won, t, tx;

function initStars() { stars = []; for (let i = 0; i < 70; i++) stars.push({ x: ARC.rnd(0, W), y: ARC.rnd(0, H), z: ARC.rnd(.3, 1.4) }); }

function GAMEstart() {
  ship = { x: W / 2, hp: 100, fireT: 0 }; tx = W / 2;
  bul = []; ebul = []; foes = []; boss = null; score = 0; kills = 0; hp = 100;
  wave = 0; waveN = 0; spawnT = .6; dead = false; won = false; t = 0;
  initStars();
  ARC.hud(0, 'OLEADA 1');
}

function spawnWave() {
  waveN++;
  const cols = 5, y0 = 120;
  const type = waveN % 3;
  for (let c = 0; c < cols; c++) {
    foes.push({ x: 70 + c * 100, y: y0 - c * 8, vx: type === 1 ? Math.sin(c) * 1.2 : 0, vy: .7 + waveN * .04,
      hp: 2 + (waveN / 4 | 0), r: 20, fireT: ARC.rnd(1, 3), amp: type === 2 ? 60 : 0, ph: c, base: 70 + c * 100 });
  }
  ARC.hud(score, boss ? 'JEFE' : 'OLEADA ' + waveN);
}

function spawnBoss() {
  boss = { x: W / 2, y: -80, vx: 1.6, hp: 260, max: 260, fireT: 1, r: 60, phase: 0 };
  ARC.toast('¡JEFE!'); ARC.sfx('power');
}

function fire() { bul.push({ x: ship.x - 12, y: SHY - 20, vy: -13 }); bul.push({ x: ship.x + 12, y: SHY - 20, vy: -13 });
  ARC.sfx('shoot', { vol: .28, rate: 1.5 }); }

function hurtShip(d) { hp -= d; ARC.shake(5); ARC.vib(25); ARC.sfx('hit', { vol: .5 });
  if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'NAVE DESTRUIDA' }); } }

function boom(x, y, col, big) { ARC.fx.burst(x, y, col || '#ff9f45', big ? 18 : 10, big ? 8 : 5); if (big) { ARC.shake(8); ARC.fx.ring(x, y, '#fff', 8); } }

function GAMEstep(dt) {
  if (dead || won) return; t += dt;
  ship.x += (tx - ship.x) * .35; ship.x = ARC.clamp(ship.x, 30, W - 30);
  for (const s of stars) { s.y += s.z * 2.2; if (s.y > H) { s.y = 0; s.x = ARC.rnd(0, W); } }
  ship.fireT -= dt; if (ship.fireT <= 0) { fire(); ship.fireT = .18; }
  // balas jugador
  for (let i = bul.length - 1; i >= 0; i--) { const b = bul[i]; b.y += b.vy; if (b.y < -20) { bul.splice(i, 1); continue; }
    let gone = false;
    for (const f of foes) if (Math.abs(f.x - b.x) < f.r && Math.abs(f.y - b.y) < f.r) { f.hp--; boom(b.x, b.y, '#4dd2ff'); bul.splice(i, 1); gone = true;
      if (f.hp <= 0) { boom(f.x, f.y, '#ff5470', true); foes.splice(foes.indexOf(f), 1); score += 15; kills++; ARC.sfx('boom', { vol: .4 }); } break; }
    if (gone) continue;
    if (boss && Math.abs(boss.x - b.x) < boss.r && b.y > boss.y - boss.r && b.y < boss.y + boss.r) {
      boss.hp -= 1; boom(b.x, b.y, '#ffd23f'); bul.splice(i, 1);
      if (boss.hp <= 0) { boom(boss.x, boss.y, '#fff', true); ARC.shake(16); score += 500; won = true; ARC.over({ win: true, score, title: '¡JEFE VENCIDO!', coins: (score / 20) | 0 }); } }
  }
  // enemigos
  for (const f of foes) { f.ph += dt; f.y += f.vy; if (f.amp) f.x = f.base + Math.sin(f.ph * 1.5) * f.amp; else f.x += f.vx;
    if (f.x < 24 || f.x > W - 24) f.vx *= -1;
    f.fireT -= dt; if (f.fireT <= 0 && f.y > 0 && f.y < H - 200) { ebul.push({ x: f.x, y: f.y + f.r, vx: (ship.x - f.x) * .01, vy: 4.2 }); f.fireT = ARC.rnd(1.6, 3.2); }
    if (f.y > H + 30) { f.y = H + 30; } // no daña al salir
    if (Math.abs(f.x - ship.x) < f.r + 18 && Math.abs(f.y - SHY) < f.r + 18) { f.hp = 0; boom(f.x, f.y, '#ff5470', true); foes.splice(foes.indexOf(f), 1); hurtShip(18); }
  }
  // jefe
  if (boss) { boss.x += boss.vx; if (boss.x < 70 || boss.x > W - 70) boss.vx *= -1; if (boss.y < 130) boss.y += 1;
    boss.fireT -= dt; if (boss.fireT <= 0) { for (let k = -2; k <= 2; k++) ebul.push({ x: boss.x, y: boss.y + boss.r, vx: k * 1.4, vy: 3.8 }); boss.fireT = 1.1; ARC.sfx('shoot', { vol: .3, rate: .7 }); } }
  // balas enemigas
  for (let i = ebul.length - 1; i >= 0; i--) { const b = ebul[i]; b.x += b.vx; b.y += b.vy; if (b.y > H + 20) { ebul.splice(i, 1); continue; }
    if (Math.abs(b.x - ship.x) < 20 && Math.abs(b.y - SHY) < 22) { ebul.splice(i, 1); hurtShip(10); } }
  // director de oleadas
  if (!boss) { spawnT -= dt; if (spawnT <= 0 && foes.length < 8) { spawnWave(); spawnT = 3.2; }
    if (waveN >= 5 && foes.length === 0) spawnBoss(); }
  ARC.hud(score, boss ? 'JEFE ' + Math.max(0, boss.hp) : 'OLEADA ' + waveN);
}

function drawShip(g, x, y, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 18, y + 16); g.lineTo(x, y + 8); g.lineTo(x - 18, y + 16); g.closePath(); g.fill();
  g.fillStyle = '#cfe8ff'; g.beginPath(); g.arc(x, y - 4, 6, 0, 6.28); g.fill();
  g.fillStyle = '#ffb04d'; g.beginPath(); g.moveTo(x - 6, y + 8); g.lineTo(x + 6, y + 8); g.lineTo(x, y + 20 + Math.sin(t * 30) * 6); g.closePath(); g.fill();
}
function GAMEdraw(g) {
  g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
  for (const s of stars) { g.fillStyle = 'rgba(255,255,255,' + (.2 + s.z * .4) + ')'; g.fillRect(s.x, s.y, s.z * 1.6, s.z * 3); }
  g.fillStyle = '#ffd23f'; for (const b of bul) { g.fillRect(b.x - 2, b.y - 8, 4, 12); }
  g.fillStyle = '#ff5470'; for (const b of ebul) { g.beginPath(); g.arc(b.x, b.y, 5, 0, 6.28); g.fill(); }
  for (const f of foes) { g.save(); g.translate(f.x, f.y); g.rotate(3.14);
    drawShip(g, 0, 0, f.hp > 2 ? '#c07dff' : '#8cff66'); g.restore(); }
  if (boss) { g.fillStyle = '#ff5470'; g.beginPath(); g.arc(boss.x, boss.y, boss.r, 0, 6.28); g.fill();
    g.fillStyle = '#7a1030'; g.beginPath(); g.arc(boss.x, boss.y, boss.r * .6, 0, 6.28); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(boss.x, boss.y + 6, 12, 0, 6.28); g.fill();
    // barra de vida jefe
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(60, 96, W - 120, 10);
    g.fillStyle = '#ff5470'; g.fillRect(60, 96, (W - 120) * boss.hp / boss.max, 10); }
  drawShip(g, ship.x, SHY, '#4dd2ff');
  // barra de vida
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(20, H - 34, W - 40, 12);
  g.fillStyle = hp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(20, H - 34, (W - 40) * hp / 100, 12);
}

let ax, ast;
function attract(dt, g) {
  if (!ast) { initStars(); ast = stars; ax = W / 2; }
  for (const s of ast) { s.y += s.z * 3; if (s.y > H) s.y = 0; }
  g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
  for (const s of ast) { g.fillStyle = 'rgba(255,255,255,' + (.2 + s.z * .5) + ')'; g.fillRect(s.x, s.y, s.z * 2, s.z * 4); }
  ax = W / 2 + Math.sin(Date2()) * 140;
  drawShip(g, ax, H - 240, '#4dd2ff');
  for (let i = 0; i < 4; i++) drawShip(g, 80 + i * 120, 200 + Math.sin(Date2() + i) * 20, '#8cff66');
}
let _d = 0; function Date2() { _d += .02; return _d; }

window.GAME = {
  slug: 'orion', name: 'ORION', sub: 'defendé la galaxia', acc: '#ff5470',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init() {}, start: GAMEstart, step: GAMEstep, draw: GAMEdraw, resize() {}, attract,
  down(p) { tx = p.x; }, move(p) { tx = p.x; }, up() {},
  dbg: {
    state: () => ({ score, kills, hp: hp | 0, wave: waveN, boss: boss ? boss.hp : -1, dead, won }),
    autoPlay() {
      if (dead || won) return;
      // apuntar al enemigo más cercano y esquivar balas
      let tgt = ship.x;
      if (boss) tgt = boss.x; else if (foes.length) { let low = foes[0]; for (const f of foes) if (f.y > low.y) low = f; tgt = low.x; }
      // esquivar: si hay bala enemiga cerca en x, correrse
      for (const b of ebul) if (b.y > SHY - 160 && Math.abs(b.x - ship.x) < 40) { tgt = ship.x + (b.x > ship.x ? -90 : 90); break; }
      tx = ARC.clamp(tgt, 30, W - 30);
    }
  }
};
})();

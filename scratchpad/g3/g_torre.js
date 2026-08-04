/* ===== TORRE — plataformas hacia arriba ===================================
   Subí la torre saltando de plataforma en plataforma (algunas se mueven).
   Si caés, perdés una vida. Juntá gemas y llegá a la cima antes del reloj.
   Controles: joystick izq = mover · SALTAR (der). */
window.GAME = (function () {
let T, scene, cam, ren;
let hero, px, py, pz, vy, yaw, onGround, vidas, score, alto, best, dead, won, tPlay, timeLeft;
let keys = {}, joy = null, PL = [], gems = [], dbgAuto = false, jumpQueued = false;
const NIV = 26, SEP = 4.2;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('torre_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { vidas: 5, t: 150 }, normal: { vidas: 3, t: 120 }, pro: { vidas: 2, t: 100 } };

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xbcd0e8, 60, 260);
  scene.add(new T.HemisphereLight(0xffffff, 0x60708a, 1.6)); scene.add(new T.AmbientLight(0xffffff, .5));
  const sun = new T.DirectionalLight(0xfff2d8, 2.2); sun.position.set(30, 80, 20);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -40; c.right = 40; c.top = 70; c.bottom = -20; c.near = 1; c.far = 220; sun.shadow.bias = -0.0008; }
  scene.add(sun); ren.toneMappingExposure = 1.16;
  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  // base
  const base = new T.Mesh(new T.CylinderGeometry(15, 17, 2, 28), new T.MeshStandardMaterial({ map: rep(TEX.floor, 6), roughness: .95, color: 0xe8e2ee }));
  base.position.y = -1; base.receiveShadow = true; scene.add(base);
  // columna central
  const col = new T.Mesh(new T.CylinderGeometry(2.2, 2.6, NIV * SEP + 10, 18), new T.MeshStandardMaterial({ map: rep(TEX.wall, 4), roughness: .9, color: 0xd8d2e4 }));
  col.position.y = (NIV * SEP) / 2; col.castShadow = true; col.receiveShadow = true; scene.add(col);
  // PLATAFORMAS en espiral (algunas móviles)
  const pmat = [new T.MeshStandardMaterial({ map: rep(TEX.wall, 2), roughness: .85, color: 0xf0d6a8 }),
    new T.MeshStandardMaterial({ map: rep(TEX.wall, 2), roughness: .85, color: 0xa8d6f0 })];
  PL = [];
  for (let i = 0; i < NIV; i++) {
    const a = i * 1.05, r = 7 + (i % 3) * 1.6;
    const w = i % 4 === 3 ? 4.4 : 6.2, dep = 4.6;
    const m = new T.Mesh(new T.BoxGeometry(w, .7, dep), pmat[i % 2]);
    const y = i * SEP + 1.2;
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    m.rotation.y = -a; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const movil = i > 4 && i % 5 === 0;
    PL.push({ m, x: m.position.x, y, z: m.position.z, w: w / 2, d: dep / 2, a, r, movil, ph: Math.random() * 6.28, rot: -a });
    // gema
    if (i % 2 === 0) { const gm = new T.Mesh(new T.OctahedronGeometry(.42), new T.MeshBasicMaterial({ color: 0x59e0ff }));
      gm.position.set(m.position.x, y + 1.5, m.position.z); scene.add(gm); gems.push({ m: gm, x: m.position.x, y: y + 1.5, z: m.position.z, got: false, pl: i }); }
  }
  // meta
  const meta = new T.Mesh(new T.TorusGeometry(2, .3, 8, 20), new T.MeshBasicMaterial({ color: 0xffd23f }));
  meta.rotation.x = Math.PI / 2; meta.position.set(PL[NIV - 1].x, PL[NIV - 1].y + 2.4, PL[NIV - 1].z); scene.add(meta);
  // HÉROE
  hero = new T.Group();
  try { const g = await ARC.loadGLB(MDL.hero); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(1.7 / (s.y || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); const c2 = nb.getCenter(new T.Vector3());
    m.position.x -= c2.x; m.position.z -= c2.z; m.position.y -= nb.min.y;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) { const mm = o.material; mm.emissive && mm.emissive.setRGB(0,0,0); if (mm.specularIntensity != null) mm.specularIntensity = 0; mm.envMapIntensity = .4; } } });
    hero.add(m);
  } catch (e) { const b2 = new T.Mesh(new T.CapsuleGeometry(.38, .95, 4, 10), new T.MeshStandardMaterial({ color: 0xffa62b }));
    b2.position.y = .9; b2.castShadow = true; hero.add(b2); }
  scene.add(hero);
  mkMenu();
}

function mkMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#ffe8b8}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#fff4e0;background:rgba(0,0,0,.42);border:.4vmin solid rgba(255,225,180,.25);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#ffd23f;color:#2a1c00;border-color:#fff;box-shadow:0 0 20px #ffd23f}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'TRANQUI'], ['normal', 'NORMAL'], ['pro', 'VERTIGO']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('torre_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  vidas = d.vidas; timeLeft = d.t;
  px = PL[0].x; py = PL[0].y + .5; pz = PL[0].z; vy = 0; yaw = 0; onGround = true;
  score = 0; alto = 0; best = 0; dead = false; won = false; tPlay = 0;
  gems.forEach(g => { g.got = false; g.m.visible = true; });
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }
function jump() { if (onGround && !dead) { vy = 13.5; onGround = false; ARC.sfx('swipe', { vol: .4, rate: 1.5 }); ARC.vib(14); } else jumpQueued = true; }

function respawn() {
  vidas--; ARC.shake(8); ARC.sfx('lose', { vol: .4 });
  if (vidas <= 0) { dead = true; ARC.over({ win: false, score, title: 'TE CAÍSTE', sub: 'nivel ' + (alto + 1) + '/' + NIV, coins: (score / 25 | 0) }); return; }
  const i = Math.max(0, alto); px = PL[i].x; py = PL[i].y + .6; pz = PL[i].z; vy = 0; onGround = true;
  ARC.toast('VIDAS: ' + vidas);
}

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN TIEMPO', sub: 'nivel ' + (alto + 1) + '/' + NIV, coins: (score / 25 | 0) }); return; }
  // plataformas móviles
  for (const p of PL) if (p.movil) { const off = Math.sin(tPlay * .9 + p.ph) * 3.4;
    p.x = Math.cos(p.a) * (p.r + off); p.z = Math.sin(p.a) * (p.r + off); p.m.position.set(p.x, p.y, p.z); }
  for (const g of gems) if (!g.got) { g.m.rotation.y += dt * 2.4; g.m.position.y = g.y + Math.sin(tPlay * 2 + g.pl) * .18; }
  // mover
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (joy) { mx += joy.dx; mz += -joy.dy; }
  if (dbgAuto) { const nxt = PL[Math.min(alto + 1, NIV - 1)];
    mx = nxt.x - px; mz = nxt.z - pz; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
    if (onGround) jump(); }
  const ml = Math.hypot(mx, mz);
  if (ml > 0) { mx /= ml; mz /= ml; yaw = Math.atan2(mx, mz); px += mx * 5.6 * dt; pz += mz * 5.6 * dt; }
  // gravedad + colisión con plataformas (solo al caer)
  vy -= 30 * dt; const ny = py + vy * dt;
  let landed = false;
  if (vy <= 0) {
    for (let i = 0; i < PL.length; i++) { const p = PL[i];
      if (Math.abs(px - p.x) < p.w + .4 && Math.abs(pz - p.z) < p.d + .4) {
        const top = p.y + .35;
        if (py >= top - .35 && ny <= top + .2) { py = top; vy = 0; onGround = true; landed = true;
          if (i > alto) { alto = i; score += 60; ARC.toast('NIVEL ' + (i + 1) + '/' + NIV); }
          break; } } }
  }
  if (!landed) { py = ny; if (vy < 0) onGround = false; }
  if (jumpQueued && onGround) { jumpQueued = false; jump(); }
  if (py < -6) { respawn(); if (dead) return; }
  hero.position.set(px, py, pz); hero.rotation.set(0, yaw, 0);
  // cámara: detrás y arriba, mirando al héroe
  const cd = 9;
  cam.position.set(px - Math.sin(yaw) * cd, py + 5.4, pz - Math.cos(yaw) * cd);
  cam.lookAt(px, py + 1.2, pz);
  // gemas
  for (const g of gems) if (!g.got && Math.abs(px - g.x) < 1.2 && Math.abs(pz - g.z) < 1.2 && Math.abs(py + .8 - g.m.position.y) < 1.6) {
    g.got = true; g.m.visible = false; score += 80; ARC.sfx('coin', { vol: .5 });
    const sp = w2s(g.x, g.y, g.z); if (sp) { ARC.fx.ring(sp.x, sp.y, '#59e0ff', 14); ARC.fx.text(sp.x, sp.y - 22, '+80', '#59e0ff'); } }
  // meta
  if (alto >= NIV - 1 && onGround) { won = true; dead = true;
    ARC.over({ win: true, score: score + Math.round(timeLeft * 6) + vidas * 100, title: '¡A LA CIMA!', sub: NIV + ' niveles', coins: (score / 20 | 0) }); }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.textAlign = 'left'; g.font = '900 24px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('NIVEL ' + (alto + 1) + '/' + NIV, 24, 40);
  g.font = '900 15px system-ui'; g.fillStyle = '#ffe8b8'; g.fillText('♥ '.repeat(Math.max(0, vidas)), 24, 62);
  g.textAlign = 'center'; g.font = '900 30px system-ui'; g.fillStyle = timeLeft < 12 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(0) + 's', W / 2, 42);
  g.textAlign = 'right'; g.font = '900 24px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 66, 40);
  // barra de altura
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 40, 80, 12, H - 200);
  g.fillStyle = '#ffd23f'; const frac = (alto + 1) / NIV;
  g.fillRect(W - 40, 80 + (H - 200) * (1 - frac), 12, (H - 200) * frac);
  const jx = 108, jy = H - 108;
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(jx, jy, 62, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(255,235,190,.3)'; g.beginPath(); g.arc(jx + (joy ? joy.dx * 40 : 0), jy + (joy ? joy.dy * 40 : 0), 26, 0, 6.28); g.fill();
  const ax = W - 96, ay = H - 100;
  g.fillStyle = onGround ? 'rgba(255,210,63,.9)' : 'rgba(110,95,40,.6)';
  g.beginPath(); g.arc(ax, ay, 52, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#2a1c00'; g.font = '900 26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('▲', ax, ay + 1); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * .35;
  if (hero && PL.length) { hero.position.set(PL[0].x, PL[0].y + .5, PL[0].z); hero.rotation.set(0, ma, 0); }
  if (cam && PL.length) { cam.position.set(Math.cos(ma) * 20, 12 + Math.sin(ma * .6) * 4, Math.sin(ma) * 20); cam.lookAt(0, 12, 0); } }

function down(p) { if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (Math.hypot(p.x - (ARC.W - 96), p.y - (ARC.H - 100)) < 62) { jump(); return; }
  if (p.x < ARC.W * .45) joy = { x0: p.x, y0: p.y, dx: 0, dy: 0 }; }
function move(p) { if (joy) { joy.dx = ARC.clamp((p.x - joy.x0) / 55, -1, 1); joy.dy = ARC.clamp((p.y - joy.y0) / 55, -1, 1); } }
function up() { joy = null; }
function key(code, dn) { keys[code] = dn;
  if (dn && (code === 'Space' || code === 'KeyJ')) jump();
  if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'torre', name: 'TORRE', sub: 'subí saltando', acc: '#ffd23f', three: true, sky: '#bcd0e8', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, alto, vidas, t: +(timeLeft || 0).toFixed(1), dead, won, y: +py.toFixed(1) }),
    autoPlay() { dbgAuto = true; }
  }
};
})();

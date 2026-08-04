/* ===== ÓRBITA — combate espacial ==========================================
   Pilotás un caza entre asteroides: girá con ◀ ▶, acelerá con GAS y DISPARÁ.
   Oleadas de cazas enemigos; sobreviví y bajá a todos. */
window.GAME = (function () {
let T, scene, cam, ren;
let ship, sx, sz, yaw, v, hp, hpMax, score, wave, dead, won, tPlay, fireCD;
let keys = {}, pad = null, foes = [], rocks = [], shots = [], tmplFoe = null, autoIx = null, autoBoost = false, autoFire = false;
const MAPA = 300, WAVES = 5;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('orbita_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { hp: 160, fd: 5, n: 2 }, normal: { hp: 130, fd: 7, n: 3 }, pro: { hp: 100, fd: 10, n: 4 } };

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.add(new T.HemisphereLight(0x8fa8ff, 0x201838, 1.1)); scene.add(new T.AmbientLight(0xbfd0ff, .55));
  const sun = new T.DirectionalLight(0xffffff, 2.2); sun.position.set(40, 60, -30);
  sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  { const c = sun.shadow.camera; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 200; }
  scene.add(sun);
  ren.toneMappingExposure = 1.1;
  // estrellas
  const sg = new T.BufferGeometry(); const arr = [];
  for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, r = 380 + Math.random() * 260;
    arr.push(Math.cos(a) * r, (Math.random() - .5) * 320, Math.sin(a) * r); }
  sg.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
  // NAVE
  try { const g = await ARC.loadGLB(MDL.ship); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(4 / (Math.max(s.x, s.z) || 1));
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) o.material.metalness = .35; } });
    ship = new T.Group(); ship.add(m);
  } catch (e) { ship = new T.Group();
    const b2 = new T.Mesh(new T.ConeGeometry(1, 3.4, 6), new T.MeshStandardMaterial({ color: 0xdfe8ff, metalness: .5, roughness: .3 }));
    b2.rotation.x = Math.PI / 2; b2.castShadow = true; ship.add(b2); }
  scene.add(ship);
  const trail = new T.PointLight(0x66ccff, 2, 16); trail.position.set(0, 0, -2.4); ship.add(trail);
  // asteroides
  const rmat = new T.MeshStandardMaterial({ color: 0x8a8478, roughness: .95 });
  for (let i = 0; i < 34; i++) {
    const r = 3 + Math.random() * 9;
    const m = new T.Mesh(new T.DodecahedronGeometry(r, 0), rmat);
    const a = Math.random() * 6.28, d = 60 + Math.random() * (MAPA - 80);
    m.position.set(Math.cos(a) * d, (Math.random() - .5) * 26, Math.sin(a) * d);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    rocks.push({ m, r, sp: (Math.random() - .5) * .5 });
  }
  // plantilla de caza enemigo
  try { const g = await ARC.loadGLB(MDL.foe); tmplFoe = g.scene;
    const b = new T.Box3().setFromObject(tmplFoe); const s = b.getSize(new T.Vector3());
    tmplFoe.scale.setScalar(4 / (Math.max(s.x, s.z) || 1));
    tmplFoe.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material = o.material.clone(); o.material.color = new T.Color(0xff6a7a); } } });
  } catch (e) { tmplFoe = new T.Mesh(new T.ConeGeometry(1.1, 3, 5), new T.MeshStandardMaterial({ color: 0xff6a7a })); tmplFoe.rotation.x = Math.PI / 2; }
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  mkMenu();
}

function mkMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#bfd6ff}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#e8f0ff;background:rgba(0,0,0,.42);border:.4vmin solid rgba(160,200,255,.25);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#5ab0ff;color:#04121f;border-color:#fff;box-shadow:0 0 20px #5ab0ff}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'CADETE'], ['normal', 'PILOTO'], ['pro', 'AS']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('orbita_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

function spawnWave() {
  const d = DIF[cfg.dif] || DIF.normal, n = d.n + wave;
  for (let i = 0; i < n; i++) {
    const m = tmplFoe.clone(true); const a = Math.random() * 6.28, r = 130 + Math.random() * 80;
    const fx = sx + Math.cos(a) * r, fz = sz + Math.sin(a) * r;
    m.position.set(fx, 0, fz); scene.add(m);
    foes.push({ m, x: fx, z: fz, hp: 2 + (wave / 2 | 0), cd: Math.random() * 2, yaw: 0 });
  }
  ARC.toast('OLEADA ' + wave + '/' + WAVES + ' · ' + n + ' cazas');
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; sx = 0; sz = 0; yaw = 0; v = 20;
  score = 0; wave = 1; dead = false; won = false; tPlay = 0; fireCD = 0;
  for (const f of foes) scene.remove(f.m); foes = [];
  for (const s of shots) scene.remove(s.m); shots = [];
  spawnWave();
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function fire() {
  if (fireCD > 0 || dead) return; fireCD = .18;
  const m = new T.Mesh(new T.SphereGeometry(.5, 6, 6), new T.MeshBasicMaterial({ color: 0x9ff0ff }));
  m.position.set(sx, 0, sz); scene.add(m);
  shots.push({ m, x: sx, z: sz, dx: Math.sin(yaw), dz: Math.cos(yaw), life: 2.4 });
  ARC.sfx('shoot', { vol: .32, rate: 1.4 });
}

function step(dt) {
  if (dead) return; tPlay += dt; if (fireCD > 0) fireCD -= dt;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const gas = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp;
  if (autoFire || keys.Space || keys.KeyJ) fire();
  v += ((gas ? 42 : 20) - v) * Math.min(1, dt * 1.8);
  yaw -= ix * dt * 1.7;
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(sx, sz); if (L > MAPA) { sx *= MAPA / L; sz *= MAPA / L; }
  ship.position.set(sx, 0, sz); ship.rotation.set(0, 0, 0); ship.rotateY(yaw); ship.rotateZ(-ix * .45);
  const cd = 15; cam.position.set(sx - Math.sin(yaw) * cd, 6.5, sz - Math.cos(yaw) * cd);
  cam.lookAt(sx + Math.sin(yaw) * 10, 0, sz + Math.cos(yaw) * 10);
  for (const r of rocks) r.m.rotation.y += r.sp * dt;
  // choque con asteroide
  for (const r of rocks) { const dx = sx - r.m.position.x, dz = sz - r.m.position.z, dd = Math.hypot(dx, dz);
    if (dd < r.r + 2.5) { sx = r.m.position.x + dx / (dd || 1) * (r.r + 2.5); sz = r.m.position.z + dz / (dd || 1) * (r.r + 2.5);
      v *= .5; hp -= 6 * dt; ARC.shake(5); } }
  // disparos
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i];
    s.x += s.dx * 130 * dt; s.z += s.dz * 130 * dt; s.life -= dt; s.m.position.set(s.x, 0, s.z);
    let hit = false;
    for (const f of foes) { if ((f.x - s.x) ** 2 + (f.z - s.z) ** 2 < 22) { f.hp--; hit = true;
        const sp = w2s(f.x, 0, f.z); if (sp) ARC.fx.burst(sp.x, sp.y, '#9ff0ff', 6, 3);
        if (f.hp <= 0) { scene.remove(f.m); f.dead = true; score += 150; ARC.sfx('boom', { vol: .4 });
          const sp2 = w2s(f.x, 0, f.z); if (sp2) { ARC.fx.burst(sp2.x, sp2.y, '#ffb04d', 14, 5); ARC.fx.text(sp2.x, sp2.y - 26, '+150', '#ffb04d'); } }
        break; } }
    if (hit || s.life <= 0) { scene.remove(s.m); shots.splice(i, 1); } }
  foes = foes.filter(f => !f.dead);
  // enemigos: persiguen y disparan
  for (const f of foes) {
    const dx = sx - f.x, dz = sz - f.z, d = Math.hypot(dx, dz) || 1;
    f.yaw = Math.atan2(dx, dz);
    if (d > 24) { f.x += dx / d * 26 * dt; f.z += dz / d * 26 * dt; }
    else { f.x -= dz / d * 18 * dt; f.z += dx / d * 18 * dt; }
    f.m.position.set(f.x, 0, f.z); f.m.rotation.set(0, 0, 0); f.m.rotateY(f.yaw);
    f.cd -= dt;
    if (f.cd <= 0 && d < 55) { f.cd = 3.2; const dd = DIF[cfg.dif] || DIF.normal;
      hp -= dd.fd; ARC.shake(5); ARC.vib(30); ARC.sfx('hurt', { vol: .35 });
      const sp = w2s(sx, 0, sz); if (sp) ARC.fx.burst(sp.x, sp.y, '#ff5470', 5, 3);
      if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'DERRIBADO', sub: 'oleada ' + wave, coins: (score / 25 | 0) }); return; } }
  }
  if (foes.length === 0) {
    if (wave >= WAVES) { won = true; dead = true;
      ARC.over({ win: true, score: score + hp * 4, title: '¡SECTOR LIMPIO!', sub: WAVES + ' oleadas', coins: (score / 20 | 0) }); return; }
    wave++; hp = Math.min(hpMax, hp + 22); spawnWave();
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.strokeStyle = 'rgba(160,240,255,.7)'; g.lineWidth = 2;
  g.beginPath(); g.arc(W / 2, H / 2 - 30, 13, 0, 6.28); g.stroke();
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 16px system-ui'; g.fillStyle = '#8fd4ff'; g.fillText('OLEADA ' + wave + '/' + WAVES + ' · cazas ' + foes.length, 24, 64);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, H - 44, 240, 20);
  g.fillStyle = hp / hpMax > .35 ? '#5ab0ff' : '#ff5470'; g.fillRect(24, H - 42, 236 * Math.max(0, hp / hpMax), 16);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.fillText('⬢ ' + Math.ceil(hp), 30, H - 28);
  // radar
  const cxp = W - 66, cyp = 112, R = 44, k = R / MAPA;
  g.fillStyle = 'rgba(6,14,30,.55)'; g.beginPath(); g.arc(cxp, cyp, R + 6, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(120,200,255,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cxp, cyp, R, 0, 6.28); g.stroke();
  for (const f of foes) { g.fillStyle = '#ff6a7a'; g.beginPath(); g.arc(cxp + (f.x - sx) * k * .6 + 0, cyp + (f.z - sz) * k * .6, 2.6, 0, 6.28); g.fill(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp, cyp, 3, 0, 6.28); g.fill();
  if (pad) pad.draw(g, '#5ab0ff');
  // botón disparar
  const ax = W - 300, ay = H - 96;
  g.fillStyle = fireCD > 0 ? 'rgba(60,90,120,.6)' : 'rgba(90,176,255,.85)';
  g.beginPath(); g.arc(ax, ay, 46, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#04121f'; g.font = '900 24px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('◎', ax, ay); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * .4;
  if (ship) { ship.position.set(0, 0, 0); ship.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 15, 5, Math.sin(ma) * 15); cam.lookAt(0, 0, 0); }
  for (const r of rocks) r.m.rotation.y += r.sp * dt; }

function down(p) { if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (Math.hypot(p.x - (ARC.W - 300), p.y - (ARC.H - 96)) < 52) fire(); }
function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'orbita', name: 'ÓRBITA', sub: 'combate espacial', acc: '#5ab0ff', three: true, sky: '#0a1030', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), wave, foes: foes.length, dead, won, x: sx | 0, z: sz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; autoFire = false; return; }
      autoFire = true; autoBoost = true;
      if (!foes.length) { autoIx = 0; return; }
      let bx = foes[0].x, bz = foes[0].z, bd = 1e9;
      for (const f of foes) { const d = (f.x - sx) ** 2 + (f.z - sz) ** 2; if (d < bd) { bd = d; bx = f.x; bz = f.z; } }
      const ty = Math.atan2(bx - sx, bz - sz); let dy = ty - yaw;
      while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      autoIx = ARC.clamp(-dy * 2.2, -1, 1); }
  }
};
})();

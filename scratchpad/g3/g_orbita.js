/* ===== ÓRBITA — combate espacial ==========================================
   Pilotás un caza entre asteroides: girá con ◀ ▶, acelerá con GAS y DISPARÁ.
   Oleadas de cazas enemigos; sobreviví y bajá a todos.
   Cámara de 3ª persona: sigue suave y NUNCA entra en un asteroide. */
window.GAME = (function () {
let T, scene, cam, ren;
let ship, sx, sz, yaw, v, hp, hpMax, score, wave, dead, won, tPlay, fireCD, inv;
let keys = {}, pad = null, foes = [], rocks = [], shots = [], ebs = [], tmplFoe = null;
let autoIx = null, autoBoost = false, autoFire = false;
/* cámara: estado interpolado + sacudida 3D propia */
let camP = null, camA = null, camCd = 15, shk3 = 0;
/* pool de proyectiles (sin fugas de GPU) */
let SG = null, SM = null, EG = null, EM = null; const spool = [], epool = [];
const MAPA = 300, WAVES = 5;
const CAM_D = 15, CAM_MIN = 5.5, CAM_H = 6.5;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('orbita_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { hp: 160, fd: 4, n: 2 }, normal: { hp: 130, fd: 6, n: 3 }, pro: { hp: 100, fd: 8, n: 4 } };

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.add(new T.HemisphereLight(0x8fa8ff, 0x201838, 1.2)); scene.add(new T.AmbientLight(0xbfd0ff, .6));
  const sun = new T.DirectionalLight(0xffffff, 2.2); sun.position.set(40, 60, -30);
  sun.castShadow = true; sun.shadow.mapSize.set(512, 512);
  { const c = sun.shadow.camera; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 200; }
  scene.add(sun);
  const fill = new T.DirectionalLight(0x9ec4ff, .9); fill.position.set(-30, 24, 40); scene.add(fill);
  ren.toneMappingExposure = 1.15;
  // estrellas
  const sg = new T.BufferGeometry(); const arr = [];
  for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, r = 380 + Math.random() * 260;
    arr.push(Math.cos(a) * r, (Math.random() - .5) * 320, Math.sin(a) * r); }
  sg.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false })));
  // geometrías/materiales de balas (una sola vez, reciclados por pool)
  SG = new T.SphereGeometry(.5, 6, 6); SM = new T.MeshBasicMaterial({ color: 0x9ff0ff });
  EG = new T.SphereGeometry(.72, 6, 6); EM = new T.MeshBasicMaterial({ color: 0xff5470 });
  // NAVE
  try { const g = await ARC.loadGLB(MDL.ship); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(4 / (Math.max(s.x, s.z) || 1));
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
      if (o.material) { o.material = o.material.clone(); o.material.metalness = .35; o.material.roughness = .45;
        o.material.envMapIntensity = .8; if (o.material.emissive) o.material.emissive.setRGB(.05, .09, .17); } } });
    ship = new T.Group(); ship.add(m);
  } catch (e) { ship = new T.Group();
    const b2 = new T.Mesh(new T.ConeGeometry(1, 3.4, 6), new T.MeshStandardMaterial({ color: 0xdfe8ff, metalness: .5, roughness: .3 }));
    b2.rotation.x = Math.PI / 2; b2.castShadow = true; ship.add(b2); }
  scene.add(ship);
  const trail = new T.PointLight(0x66ccff, 2, 16); trail.position.set(0, 0, -2.4); ship.add(trail);
  // asteroides — dispersión vertical CHICA: lo que ves es lo que choca
  const rmat = new T.MeshStandardMaterial({ color: 0x8a8478, roughness: .95 });
  for (let i = 0; i < 34; i++) {
    const r = 3 + Math.random() * 9;
    const m = new T.Mesh(new T.DodecahedronGeometry(r, 0), rmat);
    const a = Math.random() * 6.28, d = 60 + Math.random() * (MAPA - 80);
    m.position.set(Math.cos(a) * d, (Math.random() - .5) * 4, Math.sin(a) * d);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    rocks.push({ m, r, sp: (Math.random() - .5) * .5 });
  }
  // plantilla de caza enemigo: la malla va DENTRO de un Group (la corrección de
  // orientación sobrevive al rotation.set(0,0,0) de cada frame)
  try { const g = await ARC.loadGLB(MDL.foe); const inner = g.scene;
    const b = new T.Box3().setFromObject(inner); const s = b.getSize(new T.Vector3());
    inner.scale.setScalar(4 / (Math.max(s.x, s.z) || 1));
    const ctr = new T.Box3().setFromObject(inner).getCenter(new T.Vector3()); inner.position.sub(ctr);
    inner.rotation.y = Math.PI / 2;
    inner.traverse(o => { if (o.isMesh) { o.frustumCulled = false;
      if (o.material) { o.material = o.material.clone(); o.material.color = new T.Color(0xff6a7a);
        if (o.material.emissive) o.material.emissive.setRGB(.14, .03, .05); } } });
    tmplFoe = new T.Group(); tmplFoe.add(inner);
  } catch (e) { const inner = new T.Mesh(new T.ConeGeometry(1.1, 3, 5), new T.MeshStandardMaterial({ color: 0xff6a7a }));
    inner.rotation.x = Math.PI / 2; tmplFoe = new T.Group(); tmplFoe.add(inner); }
  pad = mkPad();
  mkMenu();
}

/* ---- controles propios (multitáctil de verdad: changedTouches + identifier) ----
   Se puede DISPARAR mientras girás y acelerás. Zonas pegadas, sin hueco muerto. */
const Z = { L: [36, 384, 152, 504], R: [172, 384, 288, 504], B: [722, 296, 930, 390], A: [722, 390, 930, 516], P: [898, 6, 950, 62] };
function mkPad() {
  const LW = ARC.W, LH = ARC.H, st = { steer: 0, boost: false, fire: false };
  const tmap = {}; let mouse = null;
  const logi = (cx, cy) => { const vw = innerWidth, vh = innerHeight, rot = vh > vw ? 90 : 0;
    const S = rot ? Math.min(vh / LW, vw / LH) : Math.min(vw / LW, vh / LH);
    const px = cx - vw / 2, py = cy - vh / 2; let lx, ly; if (rot) { lx = py / S; ly = -px / S; } else { lx = px / S; ly = py / S; }
    return { x: lx + LW / 2, y: ly + LH / 2 }; };
  const inZ = (p, z) => p.x >= z[0] && p.x <= z[2] && p.y >= z[1] && p.y <= z[3];
  const roleOf = p => { if (inZ(p, Z.P)) return 'P'; if (inZ(p, Z.L)) return 'L'; if (inZ(p, Z.R)) return 'R';
    if (inZ(p, Z.A)) return 'A'; if (inZ(p, Z.B)) return 'B'; return null; };
  const recompute = () => { let l = 0, r = 0, b = false, f = false; const all = Object.values(tmap); if (mouse) all.push(mouse);
    for (const ro of all) { if (ro === 'L') l = 1; if (ro === 'R') r = 1; if (ro === 'B') b = true; if (ro === 'A') f = true; }
    st.steer = r - l; st.boost = b; st.fire = f; };
  const onStart = (id, p) => { const ro = roleOf(p); if (ro === 'P') { window.ARC_pause(); return; }
    if (ro) { if (id === 'm') mouse = ro; else tmap[id] = ro; recompute(); } };
  const onEnd = id => { if (id === 'm') mouse = null; else delete tmap[id]; recompute(); };
  addEventListener('touchstart', e => { for (const tc of e.changedTouches) onStart(tc.identifier, logi(tc.clientX, tc.clientY)); }, { passive: true });
  addEventListener('touchend', e => { for (const tc of e.changedTouches) onEnd(tc.identifier); }, { passive: true });
  addEventListener('touchcancel', e => { for (const tc of e.changedTouches) onEnd(tc.identifier); }, { passive: true });
  addEventListener('mousedown', e => onStart('m', logi(e.clientX, e.clientY)));
  addEventListener('mouseup', () => onEnd('m'));
  st.reset = () => { for (const k in tmap) delete tmap[k]; mouse = null; recompute(); };
  st.draw = (g, acc) => {
    const box = (z, txt, on, fs) => { g.fillStyle = on ? acc : 'rgba(0,0,0,.34)'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
      const x0 = z[0] + 2, y0 = z[1] + 2, x1 = z[2] - 2, y1 = z[3] - 2, rad = 16;
      g.beginPath(); g.moveTo(x0 + rad, y0); g.arcTo(x1, y0, x1, y1, rad); g.arcTo(x1, y1, x0, y1, rad);
      g.arcTo(x0, y1, x0, y0, rad); g.arcTo(x0, y0, x1, y0, rad); g.fill(); g.stroke();
      g.fillStyle = on ? '#062027' : '#fff'; g.font = '900 ' + (fs || 34) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, (x0 + x1) / 2, (y0 + y1) / 2 + 1); };
    box(Z.L, '◀', st.steer < 0); box(Z.R, '▶', st.steer > 0);
    box(Z.B, st.boost ? '🚀 GAS' : 'GAS', st.boost, 30);
    box(Z.A, '◉ FUEGO', st.fire, 30);
    if (fireCD > 0) { g.fillStyle = 'rgba(4,18,31,.28)'; g.fillRect(Z.A[0] + 2, Z.A[1] + 2, (Z.A[2] - Z.A[0] - 4) * (fireCD / .16), Z.A[3] - Z.A[1] - 4); }
    g.textBaseline = 'alphabetic';
  };
  return st;
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

function rockAt(x, z, marg) { for (const r of rocks) { const dx = x - r.m.position.x, dz = z - r.m.position.z;
  if (dx * dx + dz * dz < (r.r + marg) * (r.r + marg)) return r; } return null; }

function spawnWave() {
  const d = DIF[cfg.dif] || DIF.normal, n = Math.min(d.n + wave, 7);
  for (let i = 0; i < n; i++) {
    let fx = 0, fz = 0;
    for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, r = 110 + Math.random() * 70;
      fx = sx + Math.cos(a) * r; fz = sz + Math.sin(a) * r;
      const L = Math.hypot(fx, fz); if (L > MAPA - 25) { const s = (MAPA - 25) / L; fx *= s; fz *= s; }
      if (!rockAt(fx, fz, 8)) break; }
    const m = tmplFoe.clone(true); m.position.set(fx, 0, fz); scene.add(m);
    foes.push({ m, x: fx, z: fz, hp: 2 + (wave / 3 | 0), cd: 1 + Math.random() * 2, yaw: 0, tele: 0, brk: 0 });
  }
  ARC.toast('OLEADA ' + wave + '/' + WAVES + ' · ' + n + ' cazas');
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; sx = 0; sz = 0; yaw = 0; v = 20; inv = 0;
  score = 0; wave = 1; dead = false; won = false; tPlay = 0; fireCD = 0;
  autoIx = null; autoBoost = false; autoFire = false;
  if (pad && pad.reset) pad.reset();
  for (const s of shots) putM(spool, s.m); shots = [];
  for (const s of ebs) putM(epool, s.m); ebs = [];
  for (const f of foes) scene.remove(f.m); foes = [];
  for (const r of rocks) r.touch = false;
  camP = null; camA = null; camCd = CAM_D; shk3 = 0;
  spawnWave();
}

const _pv = { v: null };
function w2s(x, y, z) { if (!_pv.v) _pv.v = new T.Vector3();
  const p = _pv.v.set(x, y, z).project(cam); if (p.z > 1) return null;
  return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function getM(pool, geo, mat) { let m = pool.pop(); if (!m) { m = new T.Mesh(geo, mat); scene.add(m); } m.visible = true; return m; }
function putM(pool, m) { if (!m) return; m.visible = false; pool.push(m); }

function fire() {
  if (fireCD > 0 || dead) return; fireCD = .16;
  const m = getM(spool, SG, SM); m.position.set(sx, 0, sz);
  shots.push({ m, x: sx, z: sz, dx: Math.sin(yaw), dz: Math.cos(yaw), life: 2.4 });
  ARC.sfx('shoot', { vol: .32, rate: 1.4 });
}

/* ---- cámara 3ª persona: acorta la distancia hasta que quede libre de roca,
   interpola posición y objetivo, y suma la sacudida al mundo 3D ---- */
function camFree(cd, bx, bz, h) {
  const cx = sx + bx * cd, cz = sz + bz * cd;
  for (const r of rocks) { const rr = r.r + 2.2;
    const dx = cx - r.m.position.x, dy = h - r.m.position.y, dz = cz - r.m.position.z;
    if (dx * dx + dy * dy + dz * dz < rr * rr) return false; }
  return true;
}
function camStep(dt) {
  const bx = -Math.sin(yaw), bz = -Math.cos(yaw);
  let want = CAM_MIN;
  for (let d = CAM_MIN; d <= CAM_D + .01; d += 1.2) { if (camFree(d, bx, bz, CAM_H)) want = d; else break; }
  // acercar rápido (para no atravesar), alejar lento (suave)
  camCd += (want - camCd) * Math.min(1, dt * (want < camCd ? 16 : 3.5));
  const h = CAM_H + (CAM_D - camCd) * .22;
  const tx = sx + bx * camCd, tz = sz + bz * camCd;
  if (!camP) { camP = { x: tx, y: h, z: tz }; camA = { x: sx + Math.sin(yaw) * 14, y: .5, z: sz + Math.cos(yaw) * 14 }; }
  const k = Math.min(1, dt * 9);
  camP.x += (tx - camP.x) * k; camP.y += (h - camP.y) * k; camP.z += (tz - camP.z) * k;
  const ax = sx + Math.sin(yaw) * 14, az = sz + Math.cos(yaw) * 14, ka = Math.min(1, dt * 11);
  camA.x += (ax - camA.x) * ka; camA.y += (.5 - camA.y) * ka; camA.z += (az - camA.z) * ka;
  // por si la interpolación quedó dentro de una roca: empujar afuera
  let px = camP.x, py = camP.y, pz = camP.z;
  for (const r of rocks) { const rr = r.r + 2.2;
    const dx = px - r.m.position.x, dy = py - r.m.position.y, dz = pz - r.m.position.z;
    const dd = Math.hypot(dx, dy, dz);
    if (dd < rr) { const s = (rr - dd) / (dd || 1); px += dx * s; py += dy * s; pz += dz * s; } }
  camP.x = px; camP.y = py; camP.z = pz;
  if (shk3 > 0) { shk3 = Math.max(0, shk3 - dt * 4.5); }
  const j = shk3 * .5;
  cam.position.set(px + ARC.rnd(-j, j), py + ARC.rnd(-j, j), pz + ARC.rnd(-j, j));
  cam.lookAt(camA.x, camA.y, camA.z);
}
function bump(m) { shk3 = Math.max(shk3, m); ARC.shake(m * .9); }

function step(dt) {
  if (dead) return; tPlay += dt; if (fireCD > 0) fireCD -= dt; if (inv > 0) inv -= dt;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const gas = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp;
  if (autoFire || (pad && pad.fire) || keys.Space || keys.KeyJ) fire();
  v += ((gas ? 42 : 20) - v) * Math.min(1, dt * 1.8);
  // giro de caza arcade: más cerrado cuando soltás el GAS (radio ~7u a 20 u/s)
  yaw -= ix * dt * (gas ? 2.1 : 2.9);
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(sx, sz); if (L > MAPA) { sx *= MAPA / L; sz *= MAPA / L; }
  ship.position.set(sx, 0, sz); ship.rotation.set(0, 0, 0); ship.rotateY(yaw); ship.rotateZ(-ix * .45);
  for (const r of rocks) r.m.rotation.y += r.sp * dt;
  // choque con asteroide: rebote UNA vez por impacto (flanco de entrada)
  for (const r of rocks) {
    const dx = sx - r.m.position.x, dz = sz - r.m.position.z, dd = Math.hypot(dx, dz) || 1;
    const near = dd < r.r + 2.5 && Math.abs(r.m.position.y) < r.r + 3;
    if (!near) { r.touch = false; continue; }
    // salir con margen: r.r+4 rompe el contacto (el test es r.r+2.5)
    const nx = dx / dd, nz = dz / dd;
    sx = r.m.position.x + nx * (r.r + 4); sz = r.m.position.z + nz * (r.r + 4);
    if (!r.touch && inv <= 0) {
      r.touch = true; inv = .6;
      // reflejar el rumbo sobre la normal
      const fx = Math.sin(yaw), fz = Math.cos(yaw), dot = fx * nx + fz * nz;
      const rx = fx - 2 * dot * nx, rz = fz - 2 * dot * nz;
      yaw = Math.atan2(rx, rz); v *= .55;
      hp -= 8; bump(6); ARC.vib(26); ARC.sfx('hit', { vol: .35 });
      const sp = w2s(sx, 0, sz); if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd08a', 8, 4);
      if (hp <= 0) { hp = 0; return lose(); }
    }
  }
  camStep(dt);
  // disparos del jugador (los asteroides los tapan: sirven de cobertura)
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i];
    s.x += s.dx * 150 * dt; s.z += s.dz * 150 * dt; s.life -= dt; s.m.position.set(s.x, 0, s.z);
    let hit = false;
    for (const f of foes) { if ((f.x - s.x) ** 2 + (f.z - s.z) ** 2 < 22) { f.hp--; hit = true;
        const sp = w2s(f.x, 0, f.z); if (sp) ARC.fx.burst(sp.x, sp.y, '#9ff0ff', 6, 3);
        if (f.hp <= 0) { scene.remove(f.m); f.dead = true; score += 150; ARC.sfx('boom', { vol: .4 });
          const sp2 = w2s(f.x, 0, f.z); if (sp2) { ARC.fx.burst(sp2.x, sp2.y, '#ffb04d', 14, 5); ARC.fx.text(sp2.x, sp2.y - 26, '+150', '#ffb04d'); } }
        break; } }
    if (!hit && rockAt(s.x, s.z, 1)) hit = true;
    if (hit || s.life <= 0) { putM(spool, s.m); shots.splice(i, 1); } }
  foes = foes.filter(f => !f.dead);
  // balas enemigas: lentas y esquivables
  for (let i = ebs.length - 1; i >= 0; i--) { const s = ebs[i];
    s.x += s.dx * 72 * dt; s.z += s.dz * 72 * dt; s.life -= dt; s.m.position.set(s.x, 0, s.z);
    let out = s.life <= 0;
    if (!out && (s.x - sx) ** 2 + (s.z - sz) ** 2 < 11) { out = true;
      const dd = DIF[cfg.dif] || DIF.normal; hp -= dd.fd; bump(5); ARC.vib(30); ARC.sfx('hurt', { vol: .35 });
      const sp = w2s(sx, 0, sz); if (sp) ARC.fx.burst(sp.x, sp.y, '#ff5470', 6, 3);
      if (hp <= 0) { hp = 0; putM(epool, s.m); ebs.splice(i, 1); return lose(); } }
    if (!out && rockAt(s.x, s.z, 1)) out = true;
    if (out) { putM(epool, s.m); ebs.splice(i, 1); } }
  // enemigos: persiguen (más rápido de lejos: no hay empate eterno) y telegrafían el tiro
  const ord = foes.map(f => ({ f, d: Math.hypot(sx - f.x, sz - f.z) })).sort((a, b) => a.d - b.d);
  for (let i = 0; i < ord.length; i++) ord[i].f.canShoot = i < 3;
  for (const f of foes) {
    const dx = sx - f.x, dz = sz - f.z, d = Math.hypot(dx, dz) || 1;
    if (f.brk > 0) {   // PASADA: sigue de largo con el rumbo que traía (no orbita: se puede encarar)
      f.brk -= dt; if (d > 46) f.brk = 0;
      f.x += Math.sin(f.yaw) * 34 * dt; f.z += Math.cos(f.yaw) * 34 * dt;
    } else {
      f.yaw = Math.atan2(dx, dz);
      const sp = d > 80 ? 44 : 30;     // de lejos alcanza al jugador: no hay empate eterno
      f.x += dx / d * sp * dt; f.z += dz / d * sp * dt;
      if (d < 20) f.brk = 1.1;
    }
    const fl = Math.hypot(f.x, f.z); if (fl > MAPA) { f.x *= MAPA / fl; f.z *= MAPA / fl; }
    f.m.position.set(f.x, 0, f.z); f.m.rotation.set(0, 0, 0); f.m.rotateY(f.yaw);
    if (f.tele > 0) { f.tele -= dt;
      if (f.tele <= 0) { const m = getM(epool, EG, EM); m.position.set(f.x, 0, f.z);
        const bx = (sx - f.x) / d, bz = (sz - f.z) / d;
        ebs.push({ m, x: f.x, z: f.z, dx: bx, dz: bz, life: 1.6 }); ARC.sfx('shoot', { vol: .22, rate: .7 }); }
      continue; }
    f.cd -= dt;
    if (f.cd <= 0 && d < 36 && f.canShoot) { f.cd = 2.6; f.tele = .45;
      const sp = w2s(f.x, 0, f.z); if (sp) ARC.fx.ring(sp.x, sp.y, '#ff5470', 6); }
  }
  if (foes.length === 0) {
    if (wave >= WAVES) { won = true; dead = true; const fin = score + hp * 4;
      ARC.over({ win: true, score: fin, title: '¡SECTOR LIMPIO!', sub: WAVES + ' oleadas', coins: (fin / 20 | 0) }); return; }
    wave++; hp = Math.min(hpMax, hp + 22); spawnWave();
  }
}
function lose() { dead = true; ARC.over({ win: false, score, title: 'DERRIBADO', sub: 'oleada ' + wave, coins: (score / 20 | 0) }); }

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  // mira CALCULADA sobre el rayo real de las balas (+ marcas de profundidad)
  g.strokeStyle = 'rgba(160,240,255,.75)'; g.lineWidth = 2;
  const a1 = w2s(sx + Math.sin(yaw) * 45, 0, sz + Math.cos(yaw) * 45);
  if (a1) { g.beginPath(); g.arc(a1.x, a1.y, 13, 0, 6.28); g.stroke();
    g.beginPath(); g.moveTo(a1.x - 20, a1.y); g.lineTo(a1.x - 15, a1.y); g.moveTo(a1.x + 15, a1.y); g.lineTo(a1.x + 20, a1.y); g.stroke(); }
  g.strokeStyle = 'rgba(160,240,255,.32)'; g.lineWidth = 2;
  for (const dz of [22, 90]) { const p = w2s(sx + Math.sin(yaw) * dz, 0, sz + Math.cos(yaw) * dz);
    if (p) { g.beginPath(); g.moveTo(p.x - 7, p.y); g.lineTo(p.x + 7, p.y); g.stroke(); } }
  // telegrafía de tiro enemigo
  for (const f of foes) { if (f.tele > 0) { const p = w2s(f.x, 1.4, f.z); if (!p) continue;
    const k = 1 - f.tele / .45; g.strokeStyle = 'rgba(255,84,112,' + (.35 + k * .55) + ')'; g.lineWidth = 3;
    g.beginPath(); g.arc(p.x, p.y, 26 - k * 16, 0, 6.28); g.stroke(); } }
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 16px system-ui'; g.fillStyle = '#8fd4ff'; g.fillText('OLEADA ' + wave + '/' + WAVES + ' · cazas ' + foes.length, 24, 64);
  // barra de vida ARRIBA a la izquierda (abajo la tapaban las flechas)
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, 74, 240, 22);
  g.fillStyle = hp / hpMax > .35 ? '#5ab0ff' : '#ff5470'; g.fillRect(24, 76, 236 * Math.max(0, hp / hpMax), 18);
  g.fillStyle = '#04121f'; g.font = '900 14px system-ui'; g.fillText('⬢ ' + Math.ceil(hp), 30, 90);
  // radar EN EL EJE DE LA NAVE (arriba = adelante) con recorte al borde
  const cxp = W - 66, cyp = 112, R = 44, k = R / 220;
  g.fillStyle = 'rgba(6,14,30,.55)'; g.beginPath(); g.arc(cxp, cyp, R + 6, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(120,200,255,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cxp, cyp, R, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(120,200,255,.14)'; g.beginPath(); g.moveTo(cxp, cyp);
  g.arc(cxp, cyp, R, -Math.PI / 2 - .55, -Math.PI / 2 + .55); g.closePath(); g.fill();
  const cy2 = Math.cos(yaw), sy2 = Math.sin(yaw);
  for (const f of foes) { const dx = f.x - sx, dz = f.z - sz;
    let rx = (dz * sy2 - dx * cy2) * k, ry = (dx * sy2 + dz * cy2) * k;
    const m = Math.hypot(rx, ry); if (m > R) { rx = rx / m * R; ry = ry / m * R; }
    g.fillStyle = '#ff6a7a'; g.beginPath(); g.arc(cxp + rx, cyp - ry, 2.6, 0, 6.28); g.fill(); }
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cxp, cyp - 5); g.lineTo(cxp + 3.6, cyp + 4); g.lineTo(cxp - 3.6, cyp + 4); g.closePath(); g.fill();
  if (pad) pad.draw(g, '#5ab0ff');
  // pausa (mismo rectángulo que la zona táctil)
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(Z.P[0] + 4, Z.P[1] + 6, 44, 44);
  g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', Z.P[0] + 26, Z.P[1] + 34);
}

let ma = 0;
function attract3d(dt) { ma += dt * .4;
  if (ship) { ship.position.set(0, 0, 0); ship.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 15, 5, Math.sin(ma) * 15); cam.lookAt(0, 0, 0); }
  for (const r of rocks) r.m.rotation.y += r.sp * dt; }

function down(p) { if (p.x > ARC.W - 60 && p.y < 56) window.ARC_pause(); }
function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'orbita', name: 'ÓRBITA', sub: 'combate espacial', acc: '#5ab0ff', three: true, sky: '#0a1030', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), wave, foes: foes.length, dead, won, x: sx | 0, z: sz | 0, yaw: +yaw.toFixed(2) }),
    /* ayudas de prueba (sonda): estado de controles, cámara y pegado a roca */
    live: () => ({ shots: shots.length, ebs: ebs.length, fireCD: +fireCD.toFixed(3), steer: pad ? pad.steer : 0, boost: !!(pad && pad.boost), fire: !!(pad && pad.fire) }),
    diag: () => ({ v: +v.toFixed(1), ix: autoIx == null ? null : +autoIx.toFixed(2), bo: autoBoost, borde: Math.hypot(sx, sz) | 0,
      ds: foes.map(f => (Math.hypot(sx - f.x, sz - f.z) | 0) + (f.brk > 0 ? 'p' : '')).join(','),
      roca: (() => { const r = rockAt(sx, sz, 26); return r ? (Math.hypot(sx - r.m.position.x, sz - r.m.position.z) | 0) : -1; })() }),
    camClear() { let mn = 1e9; for (const r of rocks) { const p = r.m.position;
      mn = Math.min(mn, Math.hypot(cam.position.x - p.x, cam.position.y - p.y, cam.position.z - p.z) - r.r); }
      return { margen: +mn.toFixed(2), cd: +camCd.toFixed(2) }; },
    hug(a) { let best = rocks[0]; for (const r of rocks) if (r.r > best.r) best = r;
      sx = best.m.position.x + Math.cos(a) * (best.r + 4.5); sz = best.m.position.z + Math.sin(a) * (best.r + 4.5);
      yaw = a; v = 0; autoIx = 0; autoBoost = false; autoFire = false; hp = hpMax; },
    unhug() { autoIx = null; },
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; autoFire = false; return; }
      autoFire = true;
      if (!foes.length) { autoIx = 0; autoBoost = true; return; }
      let bx = foes[0].x, bz = foes[0].z, bd = 1e9;
      for (const f of foes) { const d = (f.x - sx) ** 2 + (f.z - sz) ** 2; if (d < bd) { bd = d; bx = f.x; bz = f.z; } }
      const dist = Math.sqrt(bd);
      autoBoost = dist > 70;                          // de cerca suelta el GAS: gira más cerrado
      const nrm = a => { while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; return a; };
      let dy = nrm(Math.atan2(bx - sx, bz - sz) - yaw);
      // esquivar el asteroide que tenga justo adelante (bearing relativo)
      for (const r of rocks) { const dx = r.m.position.x - sx, dz = r.m.position.z - sz, dd = Math.hypot(dx, dz) || 1;
        if (dd < r.r + 26 && Math.abs(nrm(Math.atan2(dx, dz) - yaw)) < .6) { dy = nrm(Math.atan2(dx, dz) - yaw) > 0 ? -1.2 : 1.2; break; } }
      autoIx = ARC.clamp(-dy * 2.2, -1, 1); },
    cam: () => ({ cd: +camCd.toFixed(2), x: +cam.position.x.toFixed(1), y: +cam.position.y.toFixed(1), z: +cam.position.z.toFixed(1) })
  }
};
})();

/* ===== CIMA — descenso en snowboard =======================================
   Bajás una montaña nevada esquivando pinos y cruzando puertas de slalom.
   La pendiente te acelera; ◀ ▶ para tallar, GAS para tuck (más velocidad). */
window.GAME = (function () {
let T, scene, cam, ren;
let rider, px, pz, yaw, v, timeLeft, score, gates, dead, won, tPlay, lean;
let keys = {}, pad = null, terr = null, GT = [], gi = 0, gMesh = [], trees = [], autoIx = null, autoBoost = false;
const ANCHO = 90, LARGO = 900;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('cima_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 26, t: 70 }, normal: { v: 34, t: 60 }, pro: { v: 44, t: 52 } };

/* la montaña baja en -Z y ondula a lo ancho */
function h(x, z) { return -z * .13 + Math.sin(x * .05) * 2.6 + Math.sin(z * .035) * 2.2 + Math.sin((x + z) * .02) * 1.2; }

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xdceaf5, 120, 480);
  scene.add(new T.HemisphereLight(0xffffff, 0x9fb8d0, 1.7)); scene.add(new T.AmbientLight(0xffffff, .5));
  const sun = new T.DirectionalLight(0xfff4e0, 2.3); sun.position.set(40, 90, 30);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 1; c.far = 240; c.bias = -0.0008; }
  scene.add(sun);
  ren.toneMappingExposure = 1.14;
  // NIEVE
  const geo = new T.PlaneGeometry(ANCHO * 2.6, LARGO, 70, 160); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  terr = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xf2f8ff, roughness: .82, metalness: .02 }));
  terr.position.z = -LARGO / 2 + 60; terr.receiveShadow = true; scene.add(terr);
  // TABLA + rider (GLB si hay)
  rider = new T.Group();
  const board = new T.Mesh(new T.BoxGeometry(.5, .12, 2.4), new T.MeshStandardMaterial({ color: 0xff4d6a, roughness: .4, metalness: .2 }));
  board.position.y = .1; board.castShadow = true; rider.add(board);
  try { const rg = await ARC.loadGLB(MDL.rider); const r = rg.scene;
    const rb = new T.Box3().setFromObject(r); const rs = rb.getSize(new T.Vector3());
    r.scale.setScalar(1.7 / (rs.y || 1)); r.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(r); const c2 = nb.getCenter(new T.Vector3());
    r.position.x -= c2.x; r.position.z -= c2.z; r.position.y -= nb.min.y - .2;
    r.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
    rider.add(r);
  } catch (e) {
    const b2 = new T.Mesh(new T.CapsuleGeometry(.3, .8, 4, 8), new T.MeshStandardMaterial({ color: 0x2f6fd0 }));
    b2.position.y = 1; b2.castShadow = true; rider.add(b2); }
  scene.add(rider);
  // puertas de slalom
  const gm1 = new T.MeshStandardMaterial({ color: 0xff3b5c, roughness: .6, emissive: 0x3a0008, emissiveIntensity: 1 });
  const gm2 = new T.MeshStandardMaterial({ color: 0x2f7bff, roughness: .6, emissive: 0x001a3a, emissiveIntensity: 1 });
  for (let i = 0; i < 26; i++) {
    const g2 = new T.Group();
    for (const s of [-1, 1]) { const pole = new T.Mesh(new T.CylinderGeometry(.16, .16, 3.4, 6), i % 2 ? gm2 : gm1);
      pole.position.set(s * 5, 1.7, 0); pole.castShadow = true; g2.add(pole); }
    const ban = new T.Mesh(new T.PlaneGeometry(10, .5), new T.MeshBasicMaterial({ color: i % 2 ? 0x2f7bff : 0xff3b5c, transparent: true, opacity: .85, side: T.DoubleSide }));
    ban.position.y = 3.2; g2.add(ban);
    scene.add(g2); gMesh.push(g2);
  }
  // pinos
  LIFE.setup(T);
  const trunk = new T.MeshStandardMaterial({ color: 0x6b4a2f, roughness: .9 });
  const leaf = new T.MeshStandardMaterial({ color: 0x1f6b3a, roughness: .85 });
  for (let i = 0; i < 90; i++) {
    const g2 = new T.Group();
    const tr = new T.Mesh(new T.CylinderGeometry(.2, .3, 1.8, 6), trunk); tr.position.y = .9; g2.add(tr);
    for (let k = 0; k < 3; k++) { const cn = new T.Mesh(new T.ConeGeometry(1.6 - k * .38, 2.2, 8), leaf); cn.position.y = 2 + k * 1.25; g2.add(cn); }
    let x, z;
    do { x = (Math.random() * 2 - 1) * ANCHO * 1.25; z = -Math.random() * (LARGO - 120) - 40; } while (Math.abs(x) < 16);
    g2.position.set(x, h(x, z), z); g2.scale.setScalar(.8 + Math.random() * .8);
    g2.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(g2); trees.push({ g: g2, x, z });
  }
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  mkMenu();
}

function mkMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#d8ecff}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#eaf6ff;background:rgba(0,0,0,.4);border:.4vmin solid rgba(200,230,255,.28);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#59c2ff;color:#04202f;border-color:#fff;box-shadow:0 0 20px #59c2ff}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'VERDE'], ['normal', 'ROJA'], ['pro', 'NEGRA']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('cima_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  GT = []; for (let i = 0; i < gMesh.length; i++) { const z = -60 - i * 30, x = Math.sin(i * .8) * (ANCHO * .55);
    GT.push({ x, z }); gMesh[i].position.set(x, h(x, z), z); gMesh[i].visible = true; }
  px = 0; pz = -10; yaw = 0; v = d.v * .5; lean = 0;
  timeLeft = d.t; score = 0; gates = 0; gi = 0; dead = false; won = false; tPlay = 0;
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN TIEMPO', sub: gates + ' puertas', coins: (score / 25 | 0) }); return; }
  const d = DIF[cfg.dif] || DIF.normal;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const tuck = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp;
  v += ((tuck ? d.v * 1.3 : d.v) - v) * Math.min(1, dt * 1.2);
  yaw = ARC.clamp(yaw - ix * dt * 1.35, -1.1, 1.1);
  yaw *= (1 - dt * .8);                                  // vuelve a la línea de caída
  lean += (ix - lean) * Math.min(1, dt * 6);
  px += Math.sin(yaw) * v * dt; pz -= Math.cos(yaw) * v * dt;
  px = ARC.clamp(px, -ANCHO * 1.2, ANCHO * 1.2);
  const y = h(px, pz);
  rider.position.set(px, y + .1, pz);
  rider.rotation.set(0, 0, 0); rider.rotateY(yaw); rider.rotateZ(-lean * .5); rider.rotateX(-.12);
  const cd = 11; cam.position.set(px - Math.sin(yaw) * cd, y + 5.2, pz + Math.cos(yaw) * cd);
  cam.lookAt(px + Math.sin(yaw) * 10, y + 1.2, pz - Math.cos(yaw) * 10);
  // nieve levantada
  if (Math.random() < .6) { const bp = w2s(px - Math.sin(yaw) * 1.6, y + .2, pz + Math.cos(yaw) * 1.6);
    if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.9)', 2, 2 + Math.abs(lean) * 2); }
  // choque con pino
  for (const t of trees) { if (Math.abs(px - t.x) < 1.5 && Math.abs(pz - t.z) < 1.5) {
      v *= .45; score = Math.max(0, score - 40); ARC.shake(7); ARC.vib(50); ARC.sfx('boom', { vol: .35, rate: .8 });
      px += (px - t.x) * .6; } }
  // puerta de slalom
  const g = GT[gi];
  if (g && pz < g.z + 1.5) {
    if (Math.abs(px - g.x) < 5.6) { gates++; score += 150; timeLeft += 2.5;
      const sp = w2s(g.x, h(g.x, g.z) + 3, g.z); if (sp) { ARC.fx.ring(sp.x, sp.y, '#59c2ff', 18); ARC.fx.text(sp.x, sp.y - 26, '+2.5s', '#59c2ff'); }
      ARC.sfx('coin', { vol: .55 }); ARC.vib(18); }
    else { ARC.toast('PUERTA PERDIDA'); score = Math.max(0, score - 60); }
    gMesh[gi].visible = false; gi++;
    if (gi >= GT.length) { won = true; dead = true;
      ARC.over({ win: true, score: score + Math.round(timeLeft * 8), title: '¡META!', sub: gates + '/' + GT.length + ' puertas', coins: (score / 20 | 0) }); return; }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 18px system-ui'; g.fillStyle = '#59c2ff'; g.fillText('puerta ' + Math.min(gi + 1, GT.length) + '/' + GT.length, W / 2, 68);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText((v * 3.6 | 0) + ' km/h', 24, 62);
  const gt = GT[gi];
  if (gt) { const sp = w2s(gt.x, h(gt.x, gt.z) + 3, gt.z);
    if (sp) { g.strokeStyle = '#59c2ff'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 18 + Math.sin(tPlay * 5) * 3, 0, 6.28); g.stroke(); } }
  if (pad) pad.draw(g, '#59c2ff');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * .4;
  if (rider) { rider.position.set(0, h(0, -10) + .1, -10); rider.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 12, h(0, -10) + 4.5, -10 + Math.sin(ma) * 12); cam.lookAt(0, h(0, -10) + 1, -10); } }

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'cima', name: 'CIMA', sub: 'descenso en tabla', acc: '#59c2ff', three: true, sky: '#cfe6f5', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: +(timeLeft || 0).toFixed(1), gates, gi, dead, won, x: px | 0, z: pz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; return; } const g = GT[gi]; if (!g) { autoIx = 0; return; }
      autoBoost = true; autoIx = ARC.clamp((g.x - px) * .12, -1, 1); }
  }
};
})();

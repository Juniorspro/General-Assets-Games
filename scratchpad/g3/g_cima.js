/* ===== CIMA — descenso en snowboard =======================================
   Bajás una montaña nevada esquivando pinos y cruzando puertas de slalom.
   La pendiente te acelera; ◀ ▶ para tallar, GAS para tuck (más velocidad).
   OJO: la altura del terreno se hornea en coordenadas de MUNDO (ver OFF) para
   que la malla, el rider, las puertas y los pinos apoyen en el mismo piso. */
window.GAME = (function () {
let T, scene, cam, ren, sun;
let rider, px, pz, yaw, v, timeLeft, score, gates, dead, won, tPlay, lean;
let camYaw = 0, camLook = null, camT = null;
let keys = {}, pad = null, terr = null, GT = [], gi = 0, gMesh = [], trees = [], autoIx = null, autoBoost = false;
const ANCHO = 90, LARGO = 1300;
const OFF = -LARGO / 2 + 60;               // traslación en Z de la malla de nieve
const NG = 26, GAP = 45, AMP = ANCHO * .38; // puertas: separación y amplitud del slalom
const NEED = Math.ceil(NG * .5);            // puertas mínimas para que valga como META
const TURN = 2.3, CENTRA = .35, YMAX = 1.15, GW = 7; // giro, auto-centrado, tope de yaw, media puerta

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('cima_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 26, t: 50 }, normal: { v: 34, t: 40 }, pro: { v: 44, t: 33 } };

/* semilla propia: el bosque es reproducible (no Math.random en el layout) */
function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* la montaña BAJA hacia -Z (z*.13: z más negativo ⇒ más abajo) y ondula a lo ancho */
function h(x, z) { return z * .13 + Math.sin(x * .05) * 3.2 + Math.sin(z * .035) * 2.6 + Math.sin((x + z) * .02) * 1.6; }

/* x de la línea de carrera (puertas interpoladas) — para no sembrar pinos encima */
function lineX(z) {
  let i = Math.floor((-z - 60) / GAP); i = ARC.clamp(i, 0, NG - 2);
  const a = GT[i], b = GT[i + 1], t = ARC.clamp((a.z - z) / (a.z - b.z), 0, 1);
  return a.x + (b.x - a.x) * t;
}
function gatesLayout() { GT = []; for (let i = 0; i < NG; i++) GT.push({ x: Math.sin(i * .8) * AMP, z: -60 - i * GAP }); }

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  camLook = new T.Vector3(); camT = new T.Vector3();
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  sky.wrapS = T.RepeatWrapping;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xdceaf5, 120, 400);
  scene.environmentIntensity = .55;                          // si no, la nieve se lava y no se ve el relieve
  scene.add(new T.HemisphereLight(0xffffff, 0x9fb8d0, 1.05)); scene.add(new T.AmbientLight(0xffffff, .28));
  sun = new T.DirectionalLight(0xfff4e0, 2.5); sun.position.set(-58, 74, -6);   // luz lateral: las sombras se VEN
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -46; c.right = 46; c.top = 46; c.bottom = -46; c.near = 1; c.far = 260; }
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = .02;   // el bias va en la LUZ, no en su cámara
  scene.add(sun); scene.add(sun.target);                     // el sol sigue al rider (ver step)
  ren.toneMappingExposure = 1.14;
  gatesLayout();
  // NIEVE — alturas horneadas en coords de MUNDO (z local + OFF)
  const geo = new T.PlaneGeometry(ANCHO * 2.6, LARGO, 70, 200); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i) + OFF));
  geo.computeVertexNormals();
  terr = new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xe4edf9, roughness: .82, metalness: .02 }));
  terr.position.z = OFF; terr.receiveShadow = true; scene.add(terr);
  // TABLA + rider (GLB si hay)
  rider = new T.Group();
  const board = new T.Mesh(new T.BoxGeometry(.5, .12, 2.4), new T.MeshStandardMaterial({ color: 0xff4d6a, roughness: .4, metalness: .2 }));
  board.position.y = .1; board.castShadow = true; rider.add(board);
  try { const rg = await ARC.loadGLB(MDL.rider); const r = rg.scene;
    r.rotation.y = Math.PI;                              // el GLB mira a +Z y se baja hacia -Z
    const rb = new T.Box3().setFromObject(r); const rs = rb.getSize(new T.Vector3());
    r.scale.setScalar(1.7 / (rs.y || 1)); r.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(r); const c2 = nb.getCenter(new T.Vector3());
    r.position.x -= c2.x; r.position.z -= c2.z; r.position.y -= nb.min.y - .16;   // pies sobre la tapa de la tabla
    r.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
      if (o.material) { o.material.metalness = Math.min(o.material.metalness || 0, .4); o.material.envMapIntensity = .5; } } });
    rider.add(r);
  } catch (e) {
    const b2 = new T.Mesh(new T.CapsuleGeometry(.3, .8, 4, 8), new T.MeshStandardMaterial({ color: 0x2f6fd0 }));
    b2.position.y = 1; b2.castShadow = true; rider.add(b2); }
  scene.add(rider);
  // puertas de slalom
  const gm1 = new T.MeshStandardMaterial({ color: 0xff3b5c, roughness: .6, emissive: 0x3a0008, emissiveIntensity: 1 });
  const gm2 = new T.MeshStandardMaterial({ color: 0x2f7bff, roughness: .6, emissive: 0x001a3a, emissiveIntensity: 1 });
  for (let i = 0; i < NG; i++) {
    const g2 = new T.Group();
    for (const s of [-1, 1]) { const pole = new T.Mesh(new T.CylinderGeometry(.16, .16, 3.4, 6), i % 2 ? gm2 : gm1);
      pole.position.set(s * GW, 1.7, 0); pole.castShadow = true; g2.add(pole); }
    const ban = new T.Mesh(new T.PlaneGeometry(GW * 2, .5), new T.MeshBasicMaterial({ color: i % 2 ? 0x2f7bff : 0xff3b5c, transparent: true, opacity: .85, side: T.DoubleSide }));
    ban.position.y = 3.2; g2.add(ban);
    scene.add(g2); gMesh.push(g2);
  }
  // pinos: bosque a los costados, nunca sobre la línea de carrera
  LIFE.setup(T);
  const trunk = new T.MeshStandardMaterial({ color: 0x6b4a2f, roughness: .9 });
  const leaf = new T.MeshStandardMaterial({ color: 0x1f6b3a, roughness: .85 });
  const rnd = mul32(20260804);
  for (let n = 0, guard = 0; n < 110 && guard < 900; guard++) {
    const x = (rnd() * 2 - 1) * ANCHO * 1.2, z = -rnd() * (LARGO - 240) - 40, sc = .8 + rnd() * .8;
    if (Math.abs(x - lineX(z)) < 11) continue;            // corredor de carrera limpio
    n++;
    const g2 = new T.Group();
    const tr = new T.Mesh(new T.CylinderGeometry(.2, .3, 1.8, 6), trunk); tr.position.y = .9; g2.add(tr);
    for (let k = 0; k < 3; k++) { const cn = new T.Mesh(new T.ConeGeometry(1.6 - k * .38, 2.2, 8), leaf); cn.position.y = 2 + k * 1.25; g2.add(cn); }
    g2.position.set(x, h(x, z), z); g2.scale.setScalar(sc);
    g2.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(g2); trees.push({ g: g2, x, z, r: 1.05 * sc, hit: false });
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
  gatesLayout();
  for (let i = 0; i < gMesh.length; i++) { const g = GT[i];
    gMesh[i].position.set(g.x, h(g.x, g.z), g.z); gMesh[i].visible = true; }
  for (const t of trees) { t.hit = false; t.g.visible = true; }
  px = 0; pz = -10; yaw = 0; v = d.v * .5; lean = 0;
  timeLeft = d.t; score = 0; gates = 0; gi = 0; dead = false; won = false; tPlay = 0;
  autoIx = null; autoBoost = false;
  // cámara ya colocada detrás del rider (nada de barridos al arrancar)
  camYaw = 0; const y0 = h(px, pz);
  cam.position.set(px, y0 + 5.4, pz + 11);
  camLook.set(px, y0 + 1.2, pz - 12); cam.lookAt(camLook);
  if (sun) { sun.position.set(px - 58, y0 + 74, pz - 6); sun.target.position.set(px, y0, pz); }
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

/* ---- cámara de 3ª persona: suave, sin atravesar pinos ni meterse en la nieve ---- */
function camera(dt, y) {
  camYaw += (yaw - camYaw) * Math.min(1, dt * 5);
  const sx = -Math.sin(camYaw), sz = Math.cos(camYaw);      // dirección rider -> cámara
  let cd = 11, ch = 5.4;
  for (const t of trees) {                                   // ¿algún pino tapa la línea de visión?
    const dx = t.x - px, dz = t.z - pz;
    const pr = dx * sx + dz * sz; if (pr < .5 || pr > 11.5) continue;
    if (Math.abs(dx * sz - dz * sx) < 2.4 + t.r) { if (pr - 1.8 < cd) { cd = Math.max(5.5, pr - 1.8); ch = 6.6; } }
  }
  const cx = px + sx * cd, cz = pz + sz * cd;
  camT.set(cx, Math.max(y + ch, h(cx, cz) + 2.8), cz);
  cam.position.lerp(camT, Math.min(1, dt * 8));
  const gy = h(cam.position.x, cam.position.z) + 2.4;        // nunca bajo la nieve
  if (cam.position.y < gy) cam.position.y = gy;
  const ax = px + Math.sin(yaw) * 13, az = pz - Math.cos(yaw) * 13;
  camT.set(ax, h(ax, az) + 2.1, az);
  camLook.lerp(camT, Math.min(1, dt * 9)); cam.lookAt(camLook);
  for (const t of trees) {                                   // pinos encima de la cámara: fuera
    const dx = t.x - cam.position.x, dz = t.z - cam.position.z;
    t.g.visible = (dx * dx + dz * dz) > 3.2 * 3.2;
  }
}

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN TIEMPO', sub: gates + ' puertas', coins: (score / 25 | 0) }); return; }
  const d = DIF[cfg.dif] || DIF.normal;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const tuck = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp;
  v += ((tuck ? d.v * 1.3 : d.v) - v) * Math.min(1, dt * 1.2);
  yaw = ARC.clamp(yaw + ix * dt * TURN, -YMAX, YMAX);      // ▶ (ix>0) ⇒ +X ⇒ derecha de pantalla
  yaw *= (1 - dt * CENTRA);                                // vuelve a la línea de caída
  lean += (ix - lean) * Math.min(1, dt * 6);
  px += Math.sin(yaw) * v * dt; pz -= Math.cos(yaw) * v * dt;
  px = ARC.clamp(px, -ANCHO * 1.2, ANCHO * 1.2);
  const y = h(px, pz);
  rider.position.set(px, y + .1, pz);
  rider.rotation.set(0, 0, 0); rider.rotateY(yaw); rider.rotateZ(-lean * .5); rider.rotateX(-.13);
  camera(dt, y);
  if (sun) { sun.position.set(px + 40, y + 90, pz + 30); sun.target.position.set(px, y, pz); sun.target.updateMatrixWorld(); }
  // nieve levantada
  if (Math.random() < .45) { const bp = w2s(px - Math.sin(yaw) * 2.8, y + .2, pz + Math.cos(yaw) * 2.8);
    if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.9)', 2, 1.6 + Math.abs(lean) * 2); }
  // choque con pino: UNA vez por árbol (se rearma al alejarse)
  for (const t of trees) {
    const dx = px - t.x, dz = pz - t.z, d2 = dx * dx + dz * dz;
    if (!t.hit && d2 < t.r * t.r) { t.hit = true;
      v *= .55; score = Math.max(0, score - 40); ARC.shake(7); ARC.vib(50); ARC.sfx('boom', { vol: .35, rate: .8 });
      px = ARC.clamp(px + Math.sign(dx || 1) * (t.r + .9), -ANCHO * 1.2, ANCHO * 1.2);
      const sp = w2s(t.x, h(t.x, t.z) + 2, t.z); if (sp) ARC.fx.burst(sp.x, sp.y, '#ffffff', 10, 5);
    } else if (t.hit && Math.abs(pz - t.z) > 4) t.hit = false;
  }
  // puerta de slalom
  const g = GT[gi];
  if (g && pz < g.z + 1.5) {
    if (Math.abs(px - g.x) < GW) { gates++; score += 150; timeLeft += 1.5;
      const sp = w2s(g.x, h(g.x, g.z) + 3, g.z); if (sp) { ARC.fx.ring(sp.x, sp.y, '#59c2ff', 18); ARC.fx.text(sp.x, sp.y - 26, '+1.5s', '#59c2ff'); }
      ARC.sfx('coin', { vol: .55 }); ARC.vib(18); }
    else { ARC.toast('PUERTA PERDIDA'); score = Math.max(0, score - 60); }
    gMesh[gi].visible = false; gi++;
    if (gi >= GT.length) { dead = true; won = gates >= NEED;
      ARC.over(won
        ? { win: true, score: score + Math.round(timeLeft * 8), title: '¡META!', sub: gates + '/' + GT.length + ' puertas', coins: (score / 20 | 0) }
        : { win: false, score, title: 'DESCALIFICADO', sub: gates + '/' + GT.length + ' puertas (mín. ' + NEED + ')', coins: (score / 30 | 0) });
      return; }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 18px system-ui'; g.fillStyle = '#59c2ff'; g.fillText('puerta ' + Math.min(gi + 1, GT.length) + '/' + GT.length + '  ·  ' + gates + '/' + NEED, W / 2, 68);
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
  const y0 = h(0, -10);
  if (rider) { rider.position.set(0, y0 + .1, -10); rider.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 12, y0 + 4.5, -10 + Math.sin(ma) * 12); cam.lookAt(0, y0 + 1, -10); } }

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'cima', name: 'CIMA', sub: 'descenso en tabla', acc: '#59c2ff', three: true, sky: '#cfe6f5', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: +(timeLeft || 0).toFixed(1), gates, gi, dead, won, x: px | 0, y: Math.round(h(px, pz)), z: pz | 0 }),
    /* diagnóstico de cámara: altura libre sobre la nieve, pino más cercano y el rider en pantalla (ndc) */
    camInfo: () => { let nt = 1e9;
      for (const t of trees) { const dx = t.x - cam.position.x, dz = t.z - cam.position.z; nt = Math.min(nt, Math.sqrt(dx * dx + dz * dz) - t.r); }
      const p = new T.Vector3(px, h(px, pz) + 1.1, pz).project(cam);
      return { clear: +(cam.position.y - h(cam.position.x, cam.position.z)).toFixed(2), nt: +nt.toFixed(2),
        sx: +p.x.toFixed(2), sy: +p.y.toFixed(2), sz: +p.z.toFixed(3) }; },
    autoPlay() {
      if (dead) { autoIx = null; autoBoost = false; return; }
      const g = GT[gi]; if (!g) { autoIx = null; return; }
      autoBoost = true;
      // apunta a la puerta con el rumbo (px += sin(yaw)*v*dt, pz -= cos(yaw)*v*dt)
      let tx = g.x;
      for (const t of trees) { const fz = pz - t.z;      // esquiva pinos que tenga adelante
        if (fz > 1 && fz < 22 && Math.abs(t.x - px) < 3.4) tx = t.x > px ? Math.min(tx, t.x - 4.2) : Math.max(tx, t.x + 4.2); }
      const yawT = ARC.clamp(Math.atan2(tx - px, Math.max(6, pz - g.z)), -1, 1);
      autoIx = ARC.clamp((yawT - yaw) * 4, -1, 1);
    }
  }
};
})();

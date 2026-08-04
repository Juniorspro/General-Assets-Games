/* ===== DUNA — buggy sobre dunas ===========================================
   Terreno de dunas real (malla desplazada): el buggy sigue la pendiente, salta
   en las crestas y cruza CHECKPOINTS de banderas contra reloj. Sombras.
   Controles: ◀ ▶ + GAS (o A/D + W). */
window.GAME = (function () {
let T, scene, cam, ren;
let car, cx, cz, yaw, v, vy, air, timeLeft, score, cps, dead, won, tPlay;
let keys = {}, pad = null, terr = null, CP = [], ci = 0, flags = [], autoIx = null, autoBoost = false;
const MAPA = 260, NCP = 10;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('duna_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 26, t: 50 }, normal: { v: 34, t: 42 }, pro: { v: 42, t: 36 } };

/* altura de la duna */
function h(x, z) {
  return Math.sin(x * .018) * 7 + Math.sin(z * .022 + 1.3) * 6
       + Math.sin((x + z) * .04) * 2.6 + Math.sin((x * .7 - z) * .07) * 1.2;
}
function normalAt(x, z) { const e = 2.5;
  const hx = h(x + e, z) - h(x - e, z), hz = h(x, z + e) - h(x, z - e);
  return { hx: hx / (2 * e), hz: hz / (2 * e) }; }

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xe8c98e, 120, 460);
  scene.add(new T.HemisphereLight(0xfff0d0, 0xa87a46, 1.5)); scene.add(new T.AmbientLight(0xffffff, .4));
  const sun = new T.DirectionalLight(0xfff0cc, 2.5); sun.position.set(-60, 80, -40);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 200; sun.shadow.bias = -0.0008; }
  scene.add(sun);
  ren.toneMappingExposure = 1.12;
  // TERRENO de dunas
  const tex = tl.load(TEX.arena); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(30, 30); tex.colorSpace = T.SRGBColorSpace;
  const geo = new T.PlaneGeometry(MAPA * 2, MAPA * 2, 120, 120); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  terr = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tex, color: 0xd9a860, roughness: .96 }));
  terr.receiveShadow = true; scene.add(terr);
  // BUGGY (auto del repo)
  try { const g = await ARC.loadGLB(MDL.car); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(4.6 / (Math.max(s.x, s.z) || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); m.position.y -= nb.min.y; m.rotation.y = Math.PI;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
    car = new T.Group(); car.add(m);
  } catch (e) { car = new T.Group();
    const bd = new T.Mesh(new T.BoxGeometry(2, .9, 4), new T.MeshStandardMaterial({ color: 0xffa62b, roughness: .5 })); bd.position.y = .8; bd.castShadow = true; car.add(bd); }
  scene.add(car);
  // CHECKPOINTS: banderas
  const fm = new T.MeshBasicMaterial({ color: 0x2fd1e0, side: T.DoubleSide });
  for (let i = 0; i < NCP; i++) {
    const g2 = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(.16, .16, 7, 6), new T.MeshStandardMaterial({ color: 0xf0f0f0 })); pole.position.y = 3.5; pole.castShadow = true; g2.add(pole);
    const fl = new T.Mesh(new T.PlaneGeometry(3.2, 2), fm); fl.position.set(1.6, 6, 0); g2.add(fl);
    scene.add(g2); flags.push(g2);
  }
  LIFE.setup(T);
  let palm = null; try { const pg = await ARC.loadGLB(MDL.palm); palm = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palm);
  for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, r = 80 + Math.random() * 150;
    const px2 = Math.cos(a) * r, pz2 = Math.sin(a) * r;
    const pl = mkPalm(); pl.position.set(px2, h(px2, pz2), pz2); pl.scale.multiplyScalar(.9 + Math.random() * .5);
    pl.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(pl); }
  LIFE.flock(scene, { count: 10, area: 240, ylo: 30, yhi: 60 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  ARCmenu();
}

function ARCmenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#ffe0b0}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#fff3e0;background:rgba(0,0,0,.42);border:.4vmin solid rgba(255,220,180,.22);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#ffa62b;color:#2a1600;border-color:#fff;box-shadow:0 0 20px #ffa62b}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'PASEO'], ['normal', 'RALLY'], ['pro', 'PRO']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('duna_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  CP = []; for (let i = 0; i < NCP; i++) { const a = i / NCP * 6.283 + .3, r = 90 + (i % 3) * 45;
    CP.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  flags.forEach((f, i) => { f.position.set(CP[i].x, h(CP[i].x, CP[i].z), CP[i].z); f.visible = true; });
  cx = 0; cz = 0; yaw = 0; v = d.v * .5; vy = 0; air = 0;
  timeLeft = d.t; score = 0; cps = 0; ci = 0; dead = false; won = false; tPlay = 0;
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN TIEMPO', sub: cps + '/' + NCP + ' banderas', coins: (score / 25 | 0) }); return; }
  const d = DIF[cfg.dif] || DIF.normal;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const gas = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space;
  v += ((gas ? d.v * 1.25 : d.v * .55) - v) * Math.min(1, dt * 1.8);
  yaw -= ix * dt * (air > 0 ? .5 : 1.5);
  cx += Math.sin(yaw) * v * dt; cz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(cx, cz); if (L > MAPA - 10) { cx *= (MAPA - 10) / L; cz *= (MAPA - 10) / L; v *= .6; }
  // suspensión/salto: sigue el terreno y despega en las crestas
  const gy = h(cx, cz);
  vy -= 26 * dt; let y = (car.position.y || gy) + vy * dt;
  if (y <= gy + .5) { y = gy + .5;
    if (vy < -9) { ARC.shake(4); ARC.sfx('boom', { vol: .22, rate: 1.8 }); }
    vy = 0; air = 0; } else air += dt;
  car.position.set(cx, y, cz);
  const n = normalAt(cx, cz);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const pitch = -(n.hx * fx + n.hz * fz), roll = (n.hx * fz - n.hz * fx);
  car.rotation.set(0, 0, 0); car.rotateY(yaw); car.rotateX(air > .05 ? -.12 : pitch); car.rotateZ(roll * .8 - ix * .07);
  const cd = 12; cam.position.set(cx - Math.sin(yaw) * cd, y + 5.4, cz - Math.cos(yaw) * cd);
  cam.lookAt(cx + Math.sin(yaw) * 9, y + 1.4, cz + Math.cos(yaw) * 9);
  LIFE.update(dt);
  // polvo
  if (v > 8 && Math.random() < .5) { const bp = w2s(cx - fx * 2.4, y - .2, cz - fz * 2.4);
    if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(226,196,140,.75)', 2, 2.2); }
  // checkpoint
  const c = CP[ci];
  if ((cx - c.x) ** 2 + (cz - c.z) ** 2 < 110) {
    cps++; score += 120; timeLeft += 5; flags[ci].visible = false;
    const sp = w2s(c.x, h(c.x, c.z) + 5, c.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#2fd1e0', 18); ARC.fx.text(sp.x, sp.y - 28, '+5s', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6 }); ARC.vib(20); ARC.toast('BANDERA ' + cps + '/' + NCP);
    ci++;
    if (ci >= NCP) { won = true; dead = true;
      ARC.over({ win: true, score: score + Math.round(timeLeft * 10), title: '¡RALLY COMPLETO!', sub: NCP + ' banderas', coins: (score / 20 | 0) }); return; }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 18px system-ui'; g.fillStyle = '#ffc06a'; g.fillText('bandera ' + Math.min(cps + 1, NCP) + '/' + NCP, W / 2, 68);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText((v * 3.6 | 0) + ' km/h' + (air > .15 ? '  ✈ AIRE' : ''), 24, 62);
  const c = CP[ci], sp = w2s(c.x, h(c.x, c.z) + 5, c.z);
  if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) { g.strokeStyle = '#2fd1e0'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 20 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke(); }
  else { const ang = Math.atan2(c.x - cx, c.z - cz) - yaw; g.save(); g.translate(W / 2, 118); g.rotate(-ang);
    g.fillStyle = '#2fd1e0'; g.beginPath(); g.moveTo(0, -24); g.lineTo(13, 8); g.lineTo(-13, 8); g.closePath(); g.fill(); g.restore(); }
  if (pad) pad.draw(g, '#ffa62b');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * .35;
  if (car) { const y = h(0, 0) + .5; car.position.set(0, y, 0); car.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 14, h(0, 0) + 6, Math.sin(ma) * 14); cam.lookAt(0, h(0, 0) + 1, 0); }
  if (window.LIFE) LIFE.update(dt); }

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'duna', name: 'DUNA', sub: 'rally de dunas', acc: '#ffa62b', three: true, sky: '#e8c98e', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: +(timeLeft || 0).toFixed(1), cps, dead, won, x: cx | 0, z: cz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; return; } const c = CP[ci];
      const ty = Math.atan2(c.x - cx, c.z - cz); let dy = ty - yaw;
      while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      autoIx = ARC.clamp(-dy * 2.2, -1, 1); autoBoost = true; }
  }
};
})();

/* ===== FURIA — derby de destrucción =======================================
   Manejás un muscle car en una arena industrial. Los rivales te embisten:
   chocalos VOS más rápido (el que llega con más velocidad hace el daño).
   Rondas: destruí a todos y entra la siguiente tanda, más brava. */
window.GAME = (function () {
const ARENA = 46;
let T, scene, cam, ren;
let car, foes, myHp, score, round, dead, tPlay, steer = 0, boostT = 0;
let keys = {}, touchSteer = 0;

function carPhys() { return { x: 0, z: 0, yaw: 0, v: 0 }; }

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xcabb98, 60, 190);
  scene.add(new T.HemisphereLight(0xfff4dc, 0x6a5c48, 1.5));
  scene.add(new T.AmbientLight(0xffffff, .5));
  const sun = new T.DirectionalLight(0xfff0d0, 2.6); sun.position.set(10, 30, -20); scene.add(sun);
  ren.toneMappingExposure = 1.1;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  // arena de tierra + muro perimetral de contenedores
  const ground = new T.Mesh(new T.CircleGeometry(ARENA + 40, 56), new T.MeshStandardMaterial({ map: load(TEX.ground, 30), color: 0xb59b76, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const brick = load(TEX.brick, 1), facade = load(TEX.facade, 1);
  const matW = new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xa88f78 });
  for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28;
    const b = new T.Mesh(new T.BoxGeometry(11, ARC.rnd(3, 5), 3), matW);
    b.position.set(Math.cos(a) * (ARENA + 3), 1.6, Math.sin(a) * (ARENA + 3)); b.rotation.y = -a + Math.PI / 2; scene.add(b); }
  // galpones de fondo
  const matF = new T.MeshStandardMaterial({ map: facade, roughness: .9, color: 0xb8ab98 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + .26, r = ARENA + ARC.rnd(16, 34);
    const h = ARC.rnd(8, 18); const b = new T.Mesh(new T.BoxGeometry(ARC.rnd(10, 18), h, ARC.rnd(8, 14)), matF);
    b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.rotation.y = ARC.rnd(0, 6.28); scene.add(b); }
  // autos: jugador + plantillas rivales
  async function loadCar(u, tint) { const g = await ARC.loadGLB(u); const m = g.scene;
    const box = new T.Box3().setFromObject(m); const sz = box.getSize(new T.Vector3());
    m.scale.setScalar(4.4 / (Math.max(sz.x, sz.z) || 1));
    m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m);
    m.userData.lift = -nb.min.y;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material && tint) { o.material = o.material.clone(); } } });
    return m; }
  const meshMe = await loadCar(MDL.me);
  car = Object.assign(carPhys(), { mesh: new T.Group() });
  car.mesh.add(meshMe); meshMe.position.y = meshMe.userData.lift; meshMe.rotation.y = Math.PI;
  scene.add(car.mesh);
  const foeMeshes = await Promise.all(MDL.foes.map(u => loadCar(u, true).catch(() => null)));
  car.foeMeshes = foeMeshes.filter(Boolean);
  // chatarra y dressing fuera del muro (entre los galpones)
  try {
    await PROPS.spawn(T, scene, [
      { url: R('assets/hyper/p-crate.glb'), h: 1.6, weight: 3 },
      { url: R('assets/reliquia/obs-log.glb'), h: 1.4, weight: 2 },
      { url: R('assets/arcade/m-agujero-arbol.glb'), h: 6, weight: 1 },
      { url: R('assets/reliquia/obs-totem.glb'), h: 3, weight: 1 }
    ], { seed: 22, count: 40, near: ARENA + 6, radius: ARENA + 38 });
    await PROPS.spawn(T, scene, MDL.foes.map(u => ({ url: u, h: 1.7, weight: 1 })),
      { seed: 8, count: 10, near: ARENA + 8, radius: ARENA + 36 });
  } catch (e) {}
  foes = [];
}

function spawnFoe() {
  const src = car.foeMeshes[(Math.random() * car.foeMeshes.length) | 0];
  const m = src.clone(true);
  const g = new T.Group(); g.add(m); m.position.y = src.userData.lift; m.rotation.y = Math.PI;
  const a = ARC.rnd(0, 6.28), r = ARENA - 6;
  const f = Object.assign(carPhys(), { mesh: g, hp: 3 + (round / 2 | 0), stun: 0 });
  f.x = Math.cos(a) * r; f.z = Math.sin(a) * r; f.yaw = a + Math.PI;
  g.position.set(f.x, 0, f.z);
  scene.add(g); foes.push(f);
}
function startRound() { round++; const n = Math.min(2 + round, 6);
  for (let i = 0; i < n; i++) spawnFoe();
  ARC.toast('RONDA ' + round); ARC.sfx('power', { vol: .5 }); }

function start() {
  Object.assign(car, carPhys()); myHp = 100; score = 0; round = 0; dead = false; tPlay = 0; steer = 0; boostT = 0;
  for (const f of (foes || [])) scene.remove(f.mesh); foes = [];
  car.mesh.position.set(0, 0, 0);
  startRound();
}

function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }

function crash(f) {
  // el que llega más rápido gana el choque
  const relV = Math.abs(car.v) - Math.abs(f.v);
  const sp = worldToScreen((car.x + f.x) / 2, .8, (car.z + f.z) / 2);
  if (sp) { ARC.fx.burst(sp.x, sp.y, '#ffd23f', 16, 8); ARC.fx.ring(sp.x, sp.y, '#fff', 10); }
  ARC.sfx('boom', { vol: .5 }); ARC.shake(8); ARC.vib(40);
  if (relV > -1) { f.hp -= (relV > 6 ? 2 : 1); f.stun = .4;
    if (f.hp <= 0) { const sp2 = worldToScreen(f.x, 1, f.z);
      if (sp2) ARC.fx.burst(sp2.x, sp2.y, '#ff5470', 22, 9);
      scene.remove(f.mesh); foes.splice(foes.indexOf(f), 1);
      score += 100; ARC.sfx('win', { vol: .4 }); ARC.toast('¡DESTRUIDO! +100'); } }
  else { myHp -= 14; if (myHp <= 0) { myHp = 0; dead = true;
      ARC.over({ win: false, score, title: 'CHATARRA', sub: 'ronda ' + round, coins: (score / 25 | 0) }); } }
  // separar + rebote
  const dx = car.x - f.x, dz = car.z - f.z, d = Math.hypot(dx, dz) || 1;
  car.x += dx / d * 1.6; car.z += dz / d * 1.6;
  f.x -= dx / d * 1.6; f.z -= dz / d * 1.6;
  car.v *= -.35; f.v *= -.3;
}

function step(dt) {
  if (dead) return; tPlay += dt;
  // ---- control
  let s = touchSteer;
  if (keys.KeyA || keys.ArrowLeft) s = -1; if (keys.KeyD || keys.ArrowRight) s = 1;
  steer += (s - steer) * Math.min(1, dt * 8);
  if (boostT > 0) boostT -= dt;
  const maxV = boostT > 0 ? 21 : 15;
  car.v += (maxV - car.v) * Math.min(1, dt * .9);              // acelera solo
  car.yaw -= steer * dt * (1.7 + car.v * .02);
  car.x += Math.sin(car.yaw) * car.v * dt;
  car.z += Math.cos(car.yaw) * car.v * dt;
  const L = Math.hypot(car.x, car.z);
  if (L > ARENA - 2) { car.x *= (ARENA - 2) / L; car.z *= (ARENA - 2) / L; car.v *= .55; ARC.shake(3); ARC.sfx('hit', { vol: .3 }); }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  car.mesh.rotation.z = -steer * .06;
  // ---- cámara persecución
  const cd = 8.4;
  cam.position.set(car.x - Math.sin(car.yaw) * cd, 4.1, car.z - Math.cos(car.yaw) * cd);
  cam.lookAt(car.x + Math.sin(car.yaw) * 4, 1, car.z + Math.cos(car.yaw) * 4);
  // ---- rivales: persiguen y embisten
  for (const f of foes) {
    if (f.stun > 0) { f.stun -= dt; f.v *= .96; }
    else { const ty = Math.atan2(car.x - f.x, car.z - f.z);
      let dy = ty - f.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      f.yaw += ARC.clamp(dy, -dt * 1.5, dt * 1.5);
      f.v += ((11 + round) - f.v) * Math.min(1, dt * .8); }
    f.x += Math.sin(f.yaw) * f.v * dt; f.z += Math.cos(f.yaw) * f.v * dt;
    const fl = Math.hypot(f.x, f.z); if (fl > ARENA - 2) { f.x *= (ARENA - 2) / fl; f.z *= (ARENA - 2) / fl; f.v *= .6; }
    f.mesh.position.set(f.x, 0, f.z); f.mesh.rotation.y = f.yaw;
    // choque con el jugador
    if ((f.x - car.x) ** 2 + (f.z - car.z) ** 2 < 13) crash(f);
  }
  // choques entre rivales (se separan)
  for (let i = 0; i < foes.length; i++) for (let j = i + 1; j < foes.length; j++) {
    const a = foes[i], b = foes[j];
    const dx = a.x - b.x, dz = a.z - b.z, d2 = dx * dx + dz * dz;
    if (d2 < 11) { const d = Math.sqrt(d2) || 1; a.x += dx / d * .5; a.z += dz / d * .5; b.x -= dx / d * .5; b.z -= dz / d * .5; } }
  if (!foes.length) startRound();
  score += 0;
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 44, 240, 18);
  g.fillStyle = myHp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(24, H - 44, 240 * myHp / 100, 18);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.textAlign = 'left'; g.fillText('🔧 ' + (myHp | 0), 30, H - 30);
  g.textAlign = 'center'; g.font = '900 24px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('RONDA ' + round, W / 2, 36);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '700 13px system-ui'; g.fillStyle = '#8a7a64'; g.fillText('rivales: ' + foes.length + ' · ' + (car.v * 6 | 0) + ' km/h', 24, 62);
  // flechas de giro (táctil)
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.beginPath(); g.arc(86, H - 96, 46, 0, 6.28); g.fill();
  g.beginPath(); g.arc(206, H - 96, 46, 0, 6.28); g.fill();
  g.fillStyle = '#fff'; g.font = '900 30px system-ui'; g.textAlign = 'center';
  g.fillText('⟲', 86, H - 84); g.fillText('⟳', 206, H - 84);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.font = '900 18px system-ui'; g.fillStyle = '#fff'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (cam) { cam.position.set(Math.cos(menuA) * 11, 4 + Math.sin(menuA * .7), Math.sin(menuA) * 11); cam.lookAt(0, .8, 0); } }

function zone(p) { if (p.x > ARC.W - 60 && p.y < 56) return 'pause';
  if (p.y > ARC.H - 160 && p.x < 140) return 'left';
  if (p.y > ARC.H - 160 && p.x < 260) return 'right';
  return p.x < ARC.W / 2 ? 'left' : 'right'; }
function down(p) { const z = zone(p); if (z === 'pause') { window.ARC_pause(); return; }
  touchSteer = z === 'left' ? -1 : 1; }
function move(p) {}
function up() { touchSteer = 0; }
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'furia', name: 'FURIA', sub: 'derby de destrucción', acc: '#ffd23f', three: true, sky: '#c8b088',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, hp: myHp | 0, round, foes: foes ? foes.length : 0, dead, v: +(car ? car.v : 0).toFixed(1) }),
    autoPlay() {
      if (dead || !foes.length) { touchSteer = 0; return; }
      let n = foes[0], bd = 1e9;
      for (const f of foes) { const d = (f.x - car.x) ** 2 + (f.z - car.z) ** 2; if (d < bd) { bd = d; n = f; } }
      const ty = Math.atan2(n.x - car.x, n.z - car.z);
      let dy = ty - car.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      touchSteer = dy > .1 ? -1 : (dy < -.1 ? 1 : 0);
    }
  }
};
})();

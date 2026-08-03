/* ===== VÉRTIGO — carrera contrarreloj por puertas ==========================
   Manejás una deportiva por la ciudad cruzando PUERTAS antes de que el reloj
   llegue a cero. Cada puerta suma tiempo y puntos; las rachas multiplican.
   Chocar un edificio te frena (y duele). */
window.GAME = (function () {
const MAPA = 130;
let T, scene, cam, ren;
let car, gates, gi, timeLeft, score, streak, dead, tPlay, steer = 0;
let keys = {}, touchSteer = 0, buildings = [];

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xc8b998, 70, 240);
  scene.add(new T.HemisphereLight(0xfff4dc, 0x6a5c48, 1.5));
  scene.add(new T.AmbientLight(0xffffff, .5));
  const sun = new T.DirectionalLight(0xfff0d0, 2.6); sun.position.set(10, 30, -20); scene.add(sun);
  ren.toneMappingExposure = 1.1;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  const ground = new T.Mesh(new T.CircleGeometry(MAPA + 60, 56), new T.MeshStandardMaterial({ map: load(TEX.ground, 44), color: 0x9a9088, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // manzanas de edificios en grilla (con calles)
  const facade = load(TEX.facade, 1), brick = load(TEX.brick, 1), roof = load(TEX.roof, 1);
  const mats = [new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0xbfc8de }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xc89a80 }),
    new T.MeshStandardMaterial({ map: roof, roughness: .9, color: 0x9aa4b8 })];
  buildings = [];
  for (let gx = -2; gx <= 2; gx++) for (let gz = -2; gz <= 2; gz++) {
    if (Math.abs(gx) + Math.abs(gz) === 0) continue;
    if (Math.random() < .22) continue;
    const cx = gx * 44 + ARC.rnd(-4, 4), cz = gz * 44 + ARC.rnd(-4, 4);
    const w = ARC.rnd(10, 17), dp = ARC.rnd(10, 17), h = ARC.rnd(10, 34);
    const g2 = new T.BoxGeometry(w, h, dp); const uv = g2.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 5), uv.getY(k) * (h / 5));
    const b = new T.Mesh(g2, mats[(Math.random() * 3) | 0]);
    b.position.set(cx, h / 2, cz); scene.add(b);
    buildings.push({ x: cx, z: cz, rx: w / 2 + 1.4, rz: dp / 2 + 1.4 });
  }
  // deportiva del jugador
  const g = await ARC.loadGLB(MDL.me); const m = g.scene;
  const box = new T.Box3().setFromObject(m); const sz = box.getSize(new T.Vector3());
  m.scale.setScalar(4.4 / (Math.max(sz.x, sz.z) || 1));
  m.updateWorldMatrix(true, true);
  const nb = new T.Box3().setFromObject(m);
  m.position.y = -nb.min.y; m.rotation.y = Math.PI;
  m.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  car = { x: 0, z: 0, yaw: 0, v: 0, mesh: new T.Group() };
  car.mesh.add(m); scene.add(car.mesh);
  // puerta (anillo) reutilizable
  gates = [];
  for (let i = 0; i < 2; i++) {
    const grp = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: i === 0 ? 0x2bd97e : 0x2bb8d9, transparent: true, opacity: .9 });
    const p1 = new T.Mesh(new T.BoxGeometry(.7, 6, .7), mat); p1.position.set(-4.4, 3, 0); grp.add(p1);
    const p2 = p1.clone(); p2.position.x = 4.4; grp.add(p2);
    const top = new T.Mesh(new T.BoxGeometry(9.6, .7, .7), mat); top.position.y = 6; grp.add(top);
    scene.add(grp); gates.push({ grp, x: 0, z: 0, on: false });
  }
  // arbolado, arbustos y accesorios llenando toda la ciudad hasta el borde
  try {
    const nearB = (x, z) => { for (const b of buildings) if (Math.abs(x - b.x) < b.rx + 2 && Math.abs(z - b.z) < b.rz + 2) return true; return false; };
    await PROPS.spawn(T, scene, [
      { url: R('assets/hyper/p-tree.glb'), h: 7, weight: 4 },
      { url: R('assets/arcade/m-agujero-arbol.glb'), h: 6.5, weight: 4 },
      { url: R('assets/hyper/p-crate.glb'), h: 1.4, weight: 2 },
      { url: R('assets/reliquia/obs-totem.glb'), h: 3, weight: 1 }
    ], { seed: 14, count: 100, rect: [MAPA - 6, MAPA - 6], keepOut: (x, z) => nearB(x, z) || Math.hypot(x, z) < 12 });
  } catch (e) {}
  gi = 0;
}

function placeGate(g2) {
  // en un cruce de calles (evita el interior de las manzanas)
  let x, z, ok = false, tries = 0;
  while (!ok && tries++ < 40) {
    x = (Math.round(ARC.rnd(-2, 2)) * 44) + ARC.rnd(-8, 8);
    z = (Math.round(ARC.rnd(-2, 2)) * 44) + ARC.rnd(-8, 8);
    ok = Math.hypot(x - car.x, z - car.z) > 30;
    if (ok) for (const b of buildings) if (Math.abs(x - b.x) < b.rx + 5 && Math.abs(z - b.z) < b.rz + 5) { ok = false; break; }
  }
  g2.x = x; g2.z = z; g2.on = true;
  g2.grp.position.set(x, 0, z);
  g2.grp.rotation.y = ARC.rnd(0, 6.28);
  g2.grp.visible = true;
}

function start() {
  car.x = 0; car.z = 0; car.yaw = 0; car.v = 0;
  timeLeft = 40; score = 0; streak = 0; dead = false; tPlay = 0; steer = 0; gi = 0;
  for (const g2 of gates) placeGate(g2);
  gates[1].grp.visible = false; gates[1].on = false;
}

function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt;
  timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; dead = true;
    ARC.over({ win: score >= 600, score, title: score >= 600 ? '¡BUEN PILOTO!' : 'SIN TIEMPO', coins: (score / 30 | 0) }); return; }
  let s = touchSteer;
  if (keys.KeyA || keys.ArrowLeft) s = -1; if (keys.KeyD || keys.ArrowRight) s = 1;
  steer += (s - steer) * Math.min(1, dt * 8);
  car.v += (19 - car.v) * Math.min(1, dt * .8);
  car.yaw -= steer * dt * (1.5 + car.v * .018);
  car.x += Math.sin(car.yaw) * car.v * dt;
  car.z += Math.cos(car.yaw) * car.v * dt;
  const L = Math.hypot(car.x, car.z);
  if (L > MAPA) { car.x *= MAPA / L; car.z *= MAPA / L; car.v *= .5; }
  // choques con edificios
  for (const b of buildings) {
    if (Math.abs(car.x - b.x) < b.rx && Math.abs(car.z - b.z) < b.rz) {
      const ox = b.rx - Math.abs(car.x - b.x), oz = b.rz - Math.abs(car.z - b.z);
      if (ox < oz) car.x += (car.x > b.x ? ox : -ox); else car.z += (car.z > b.z ? oz : -oz);
      if (car.v > 6) { ARC.shake(6); ARC.vib(30); ARC.sfx('hit', { vol: .5 }); streak = 0; timeLeft -= 1.2; ARC.toast('-1.2 s'); }
      car.v *= .35;
    }
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.yaw;
  car.mesh.rotation.z = -steer * .07;
  const cd = 8.8;
  cam.position.set(car.x - Math.sin(car.yaw) * cd, 4.4, car.z - Math.cos(car.yaw) * cd);
  cam.lookAt(car.x + Math.sin(car.yaw) * 5, 1, car.z + Math.cos(car.yaw) * 5);
  // puertas
  const g2 = gates[gi % 2];
  if (g2.on && (car.x - g2.x) ** 2 + (car.z - g2.z) ** 2 < 22) {
    streak++; const bonus = 4 + Math.min(3, streak * .5);
    timeLeft += bonus; score += 50 * Math.min(4, streak);
    const sp = worldToScreen(g2.x, 3, g2.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#2bd97e', 12); ARC.fx.text(sp.x, sp.y - 30, '+' + bonus.toFixed(1) + 's', '#2bd97e'); }
    ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20);
    g2.on = false; g2.grp.visible = false;
    const nx = gates[(gi + 1) % 2]; placeGate(nx);
    gi++;
  }
  // animación de la puerta activa
  const act = gates[gi % 2]; if (act.grp.visible) act.grp.rotation.y += dt * .8;
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  // reloj grande
  g.textAlign = 'center'; g.font = '900 34px system-ui';
  g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 20px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 70);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '700 13px system-ui'; g.fillStyle = '#7a6f60'; g.fillText((car.v * 6 | 0) + ' km/h', 24, 62);
  // flecha a la puerta
  const g2 = gates[gi % 2];
  if (g2 && g2.on) {
    const ang = Math.atan2(g2.x - car.x, g2.z - car.z) - car.yaw;
    g.save(); g.translate(W / 2, 110); g.rotate(-ang);
    g.fillStyle = '#2bd97e'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.beginPath(); g.arc(86, H - 96, 46, 0, 6.28); g.fill();
  g.beginPath(); g.arc(206, H - 96, 46, 0, 6.28); g.fill();
  g.fillStyle = '#fff'; g.font = '900 30px system-ui'; g.textAlign = 'center';
  g.fillText('⟲', 86, H - 84); g.fillText('⟳', 206, H - 84);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.font = '900 18px system-ui'; g.fillStyle = '#fff'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (cam) { cam.position.set(Math.cos(menuA) * 13, 5 + Math.sin(menuA * .7), Math.sin(menuA) * 13); cam.lookAt(0, 1, 0); } }

function zone(p) { if (p.x > ARC.W - 60 && p.y < 56) return 'pause';
  return p.x < ARC.W / 2 ? 'left' : 'right'; }
function down(p) { const z = zone(p); if (z === 'pause') { window.ARC_pause(); return; }
  touchSteer = z === 'left' ? -1 : 1; }
function up() { touchSteer = 0; }
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'vertigo', name: 'VÉRTIGO', sub: 'cruzá las puertas', acc: '#2bd97e', three: true, sky: '#c8b998',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move() {}, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: +timeLeft.toFixed(1), streak, dead, v: +(car ? car.v : 0).toFixed(1) }),
    autoPlay() {
      if (dead) return;
      const g2 = gates[gi % 2]; if (!g2 || !g2.on) { touchSteer = 0; return; }
      const ty = Math.atan2(g2.x - car.x, g2.z - car.z);
      let dy = ty - car.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      touchSteer = dy > .08 ? -1 : (dy < -.08 ? 1 : 0);
    }
  }
};
})();

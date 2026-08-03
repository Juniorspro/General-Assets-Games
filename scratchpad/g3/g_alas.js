/* ===== ALAS — vuelo entre anillos sobre las nubes ==========================
   Pilotás una nave por un mar de nubes doradas cruzando ANILLOS. Cada anillo
   suma tiempo; las rachas multiplican. Arrastrá (o flechas/WASD) para
   inclinar la nave. Relajado pero contrarreloj. */
window.GAME = (function () {
let T, scene, cam, ren;
let ship, sx, sy, sz, yaw, pitch, v, ring, timeLeft, score, streak, dead, tPlay;
let keys = {}, clouds = [], pad = null, vCruise = 15, vMax = 30, autoIx = null, autoBoost = false;

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xf2d9a8, 90, 320);
  scene.add(new T.HemisphereLight(0xfff2d0, 0xc89858, 1.7));
  scene.add(new T.AmbientLight(0xffffff, .5));
  const sun = new T.DirectionalLight(0xffe8c0, 2.4); sun.position.set(-30, 80, -40);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const s = sun.shadow.camera; s.left = -80; s.right = 80; s.top = 80; s.bottom = -80; s.near = 1; s.far = 260; sun.shadow.bias = -0.0006; }
  scene.add(sun);
  ren.toneMappingExposure = 1.15;
  // nubes: planos blancos suaves esparcidos (impostores baratos)
  // nubes volumétricas baratas: sprites suaves que SIEMPRE miran a la cámara
  // (nada de planos que de costado parecen vidrios). Textura de puffs procedural.
  const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cg = cc.getContext('2d');
  for (let i = 0; i < 6; i++) { const bx = 28 + Math.random() * 72, by = 44 + Math.random() * 44, br = 24 + Math.random() * 28;
    const gr = cg.createRadialGradient(bx, by, 0, bx, by, br);
    gr.addColorStop(0, 'rgba(255,251,242,.92)'); gr.addColorStop(.6, 'rgba(255,246,232,.5)'); gr.addColorStop(1, 'rgba(255,246,232,0)');
    cg.fillStyle = gr; cg.beginPath(); cg.arc(bx, by, br, 0, 6.28); cg.fill(); }
  const cloudTex = new T.CanvasTexture(cc); cloudTex.colorSpace = T.SRGBColorSpace;
  for (let i = 0; i < 110; i++) {
    const far = Math.random() < .5;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: cloudTex, transparent: true, opacity: ARC.rnd(.3, .72), depthWrite: false }));
    const sc = far ? ARC.rnd(60, 130) : ARC.rnd(24, 60); sp.scale.set(sc, sc * .6, 1);
    sp.position.set(ARC.rnd(-340, 340), far ? ARC.rnd(-16, 22) : ARC.rnd(-30, 2), ARC.rnd(-340, 340));
    scene.add(sp); clouds.push(sp);
  }
  // nave del repo
  const g = await ARC.loadGLB(MDL.ship); const m = g.scene;
  const box = new T.Box3().setFromObject(m); const szv = box.getSize(new T.Vector3());
  m.scale.setScalar(3.2 / (Math.max(szv.x, szv.z) || 1));
  m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) o.material.metalness = .3; } });
  const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3());
  m.position.sub(ctr);
  m.rotation.y = Math.PI / 2;            // el modelo viene de perfil: proa hacia adelante
  ship = new T.Group(); ship.add(m); scene.add(ship);
  // estela
  const trail = new T.PointLight(0xffc070, 1.2, 10); trail.position.set(0, 0, 3); ship.add(trail);
  // anillo
  ring = { grp: new T.Group(), x: 0, y: 0, z: 0, on: false };
  const rmat = new T.MeshBasicMaterial({ color: 0x35e0c0 });
  const torus = new T.Mesh(new T.TorusGeometry(6.5, .55, 10, 28), rmat);
  ring.grp.add(torus); scene.add(ring.grp);
  // ---- VIDA: islas flotantes con palmeras (debajo del vuelo) + pájaros ----
  LIFE.setup(T);
  let palmRoot = null; try { const pg = await ARC.loadGLB(MDL.palm); palmRoot = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palmRoot);
  const spots = [[120, 60, 18], [-140, 80, 20], [60, -160, 16], [-90, -120, 18], [190, -40, 22], [-40, 180, 17]];
  for (const s of spots) LIFE.island(scene, s[0], s[1], s[2], mkPalm, { y: -13 });
  LIFE.flock(scene, { count: 18, area: 300, ylo: 22, yhi: 62 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
}

function placeRing() {
  const a = yaw + ARC.rnd(-.7, .7);
  const d = ARC.rnd(55, 85);
  ring.x = sx + Math.sin(a) * d;
  ring.z = sz + Math.cos(a) * d;
  ring.y = ARC.clamp(sy + ARC.rnd(-12, 12), 6, 60);
  const L = Math.hypot(ring.x, ring.z);
  if (L > 240) { ring.x *= 240 / L; ring.z *= 240 / L; }
  ring.on = true;
  ring.grp.position.set(ring.x, ring.y, ring.z);
  ring.grp.lookAt(sx, sy, sz);
  ring.grp.visible = true;
}

function start() {
  sx = 0; sy = 26; sz = 0; yaw = 0; pitch = 0; vCruise = 15; vMax = 30; v = vCruise;
  timeLeft = 45; score = 0; streak = 0; dead = false; tPlay = 0;
  placeRing();
}

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam);
  if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt;
  timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; dead = true;
    ARC.over({ win: score >= 600, score, title: score >= 600 ? '¡AS DEL CIELO!' : 'SIN TIEMPO', coins: (score / 30 | 0) }); return; }
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const boosting = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space || keys.ShiftLeft;
  v += ((boosting ? vMax : vCruise) - v) * Math.min(1, dt * 2);
  yaw -= ix * dt * 1.5;
  // altitud automática hacia el anillo (control simple: virar + acelerar)
  const tgtY = ring.on ? ring.y : sy;
  pitch += (ARC.clamp((tgtY - sy) * .02, -.5, .5) - pitch) * Math.min(1, dt * 2);
  sx += Math.sin(yaw) * Math.cos(pitch) * v * dt;
  sz += Math.cos(yaw) * Math.cos(pitch) * v * dt;
  sy += Math.sin(pitch) * v * dt;
  sy = ARC.clamp(sy, 4, 70);
  const L = Math.hypot(sx, sz); if (L > 250) { sx *= 250 / L; sz *= 250 / L; }
  ship.position.set(sx, sy, sz);
  ship.rotation.set(0, 0, 0);
  ship.rotateY(yaw + Math.PI);
  ship.rotateX(-pitch * .8);
  ship.rotateZ(ix * .5);
  const cd = 9.6;
  cam.position.set(sx - Math.sin(yaw) * cd, sy + 3.2, sz - Math.cos(yaw) * cd);
  cam.lookAt(sx + Math.sin(yaw) * 6, sy, sz + Math.cos(yaw) * 6);
  // anillo
  if (ring.on) {
    ring.grp.rotation.z += dt;
    const d2 = (sx - ring.x) ** 2 + (sy - ring.y) ** 2 + (sz - ring.z) ** 2;
    if (d2 < 42) {
      streak++; const bonus = 4 + Math.min(3, streak * .5);
      timeLeft += bonus; score += 50 * Math.min(4, streak);
      const sp = worldToScreen(ring.x, ring.y, ring.z);
      if (sp) { ARC.fx.ring(sp.x, sp.y, '#35e0c0', 14); ARC.fx.text(sp.x, sp.y - 30, '+' + bonus.toFixed(1) + 's', '#35e0c0'); }
      ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20);
      placeRing();
    }
  }
  LIFE.update(dt);
  // estela de la nave (más fuerte al acelerar)
  if (boosting) { const bp = worldToScreen(sx - Math.sin(yaw) * 3, sy - .5, sz - Math.cos(yaw) * 3);
    if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(255,224,180,.7)', 2, 2.2); }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.textAlign = 'center'; g.font = '900 34px system-ui';
  g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 20px system-ui'; g.fillStyle = '#35e0c0'; g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 70);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  // flecha al anillo (3D proyectada o brújula)
  if (ring.on) {
    const sp = worldToScreen(ring.x, ring.y, ring.z);
    if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) {
      g.strokeStyle = '#35e0c0'; g.lineWidth = 3;
      g.beginPath(); g.arc(sp.x, sp.y, 20 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke();
    } else {
      const ang = Math.atan2(ring.x - sx, ring.z - sz) - yaw;
      g.save(); g.translate(W / 2, 116); g.rotate(-ang);
      g.fillStyle = '#35e0c0'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill();
      g.restore();
    }
  }
  if (pad) pad.draw(g, '#35e0c0');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (window.LIFE) LIFE.update(dt);
  if (cam) { cam.position.set(Math.cos(menuA) * 14, 30 + Math.sin(menuA * .6) * 3, Math.sin(menuA) * 14); cam.lookAt(0, 26, 0); }
  if (ship) { ship.position.set(0, 26, 0); ship.rotation.y += dt * .4; } }

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'alas', name: 'ALAS', sub: 'volá entre anillos', acc: '#35e0c0', three: true, sky: '#e8c890',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), streak, dead, y: sy | 0 }),
    autoPlay() {
      if (dead || !ring.on) { autoIx = 0; autoBoost = false; return; }
      const ty = Math.atan2(ring.x - sx, ring.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      autoIx = ARC.clamp(-dy * 2, -1, 1); autoBoost = true;
    }
  }
};
})();

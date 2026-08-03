/* ===== NUDILLOS — brawler 3ª persona: bate, combos y oleadas ==============
   El personaje pelea con el bate (anims punch1/punch2/bat del sux). Tocá el
   botón GOLPE (o clic/Espacio) para pegar: combo de 3. Los enemigos rodean
   y muerden. Se gana sobreviviendo oleadas; botiquines entre medio. */
window.GAME = (function () {
const ARENA = 26;
let T, scene, cam, ren, ch;
let px = 0, pz = 0, pyaw = 0, camYaw = 0;
let enemies, tmplEnemy, meds, hp, score, kills, wave, spawnLeft, spawnT, dead, tPlay;
let joy = null, keys = {}, atkT = 0, atkN = 0, atkCool = 0, moving = false;

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0x3a2836, 30, 110);
  scene.add(new T.HemisphereLight(0xffc48a, 0x2a2030, 1.15));
  scene.add(new T.AmbientLight(0xffe6c8, .35));
  const sun = new T.DirectionalLight(0xffd0a0, 2.2); sun.position.set(2, 10, -46); scene.add(sun);
  const rim = new T.DirectionalLight(0x9a7cff, .7); rim.position.set(-20, 8, 20); scene.add(rim);
  ren.toneMappingExposure = 1.12;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  // patio de fábrica: piso de ladrillo + contenedores
  const ground = new T.Mesh(new T.CircleGeometry(ARENA + 26, 48), new T.MeshStandardMaterial({ map: load(TEX.ground, 20), color: 0x8f8a84, roughness: .97 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const facade = load(TEX.facade, 1), brick = load(TEX.brick, 1);
  const mats = [new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xc89a80 }),
    new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0x8892b0 }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0x7a6a62 })];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * 6.28 + ARC.rnd(-.12, .12), r = ARENA + ARC.rnd(4, 20), h = ARC.rnd(7, 22), w = ARC.rnd(6, 14);
    const g2 = new T.BoxGeometry(w, h, ARC.rnd(5, 9)); const uv = g2.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    const b = new T.Mesh(g2, mats[i % 3]); b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.rotation.y = ARC.rnd(0, 6.28); scene.add(b);
  }
  // barriles/cajas dentro del patio
  try { const cg = await ARC.loadGLB(MDL.crate); const crate = cg.scene;
    const cb = new T.Box3().setFromObject(crate); const cs = cb.getSize(new T.Vector3());
    for (let i = 0; i < 7; i++) { const c = crate.clone(true); const ck = ARC.rnd(1, 1.8) / (Math.max(cs.x, cs.z) || 1);
      c.scale.setScalar(ck); c.updateWorldMatrix(true, true);
      const nb = new T.Box3().setFromObject(c);
      const a = ARC.rnd(0, 6.28), rr = ARC.rnd(8, ARENA - 3);
      c.position.set(Math.cos(a) * rr, -nb.min.y, Math.sin(a) * rr); c.rotation.y = ARC.rnd(0, 6.28); scene.add(c); }
  } catch (e) {}
  // personaje con BATE y set de animaciones de pelea
  ch = await CHAR.load(T, { alto: 1.8, clips: { idle: MDL.aIdle, run: MDL.aRun, p1: MDL.aP1, p2: MDL.aP2, bat: MDL.aBat } });
  scene.add(ch.root);
  const blob = new T.Mesh(new T.CircleGeometry(.55, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .02; ch.root.add(blob);
  await ch.equip(MDL.bat, { esc: 1, rx: -Math.PI / 2, py: .06 });
  ch.play('idle', 0);
  try { const eg = await ARC.loadGLB(MDL.enemy); tmplEnemy = eg.scene;
    const box = new T.Box3().setFromObject(tmplEnemy); const sz = box.getSize(new T.Vector3());
    tmplEnemy.scale.setScalar(2.0 / (sz.y || 1));
    tmplEnemy.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  } catch (e) { tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.5, 1.1, 4, 8), new T.MeshStandardMaterial({ color: 0xff5470 })); }
  // dressing del patio: chatarra, árboles muertos, tótems y púas alrededor
  try {
    await PROPS.spawn(T, scene, [
      { url: R('assets/hyper/p-crate.glb'), h: 1.3, weight: 3 },
      { url: R('assets/hyper/p-tree.glb'), h: 6, weight: 2 },
      { url: R('assets/reliquia/obs-totem.glb'), h: 2.6, weight: 1 },
      { url: R('assets/reliquia/obs-log.glb'), h: 1.2, weight: 2 },
      { url: R('assets/arcade/m-arena-pua.glb'), h: 1.8, weight: 2 }
    ], { seed: 31, count: 42, near: ARENA - 2, radius: ARENA + 24 });
  } catch (e) {}
  enemies = []; meds = [];
}

function spawnEnemy() {
  const e = tmplEnemy.clone(true);
  const a = ARC.rnd(0, 6.28), r = ARENA - ARC.rnd(0, 2);
  e.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  e.userData = { hp: 2 + (wave / 2 | 0), spd: 2.1 + wave * .12 + ARC.rnd(-.2, .3), atk: 0, hitK: 0 };
  scene.add(e); enemies.push(e);
}
function spawnMed() { const m = new T.Mesh(new T.BoxGeometry(.55, .55, .55), new T.MeshBasicMaterial({ color: 0x7dff9e }));
  m.position.set(ARC.rnd(-ARENA + 6, ARENA - 6), .5, ARC.rnd(-ARENA + 6, ARENA - 6)); scene.add(m); meds.push(m); }
function startWave() { wave++; spawnLeft = 4 + wave * 2; spawnT = 0; ARC.toast('OLEADA ' + wave); ARC.sfx('power', { vol: .5 });
  if (wave % 2 === 0) spawnMed(); }

function start() {
  px = 0; pz = 0; pyaw = 0; camYaw = 0; hp = 100; score = 0; kills = 0; wave = 0; dead = false; tPlay = 0;
  atkT = 0; atkN = 0; atkCool = 0;
  for (const e of (enemies || [])) scene.remove(e); enemies = [];
  for (const m of (meds || [])) scene.remove(m); meds = [];
  if (ch) { ch.root.position.set(0, 0, 0); ch.play('idle', 0); }
  startWave();
}

function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }

function attack() {
  if (dead || atkCool > 0) return;
  atkN = (atkN + 1) % 3; atkT = .42; atkCool = .46;
  ch.play(['p1', 'p2', 'bat'][atkN], .08);
  ARC.sfx('swipe', { vol: .5, rate: 1 + atkN * .1 }); ARC.vib(12);
  // daño en abanico al frente
  let hit = 0;
  for (const e of enemies.slice()) {
    const dx = e.position.x - px, dz = e.position.z - pz, d = Math.hypot(dx, dz);
    if (d > 2.7) continue;
    const ang = Math.atan2(dx, dz); let rel = ang - pyaw;
    while (rel > Math.PI) rel -= 6.283; while (rel < -Math.PI) rel += 6.283;
    if (Math.abs(rel) > 1.25) continue;
    e.userData.hp -= (atkN === 2 ? 2 : 1); e.userData.hitK = .5;
    // empujón
    e.position.x += dx / d * .9; e.position.z += dz / d * .9;
    const sp = worldToScreen(e.position.x, e.position.y + 1.3, e.position.z);
    if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd23f', 8, 5);
    hit++;
    if (e.userData.hp <= 0) { const sp2 = worldToScreen(e.position.x, e.position.y + 1, e.position.z);
      if (sp2) { ARC.fx.burst(sp2.x, sp2.y, '#ff5470', 16, 7); ARC.fx.ring(sp2.x, sp2.y, '#fff', 8); }
      scene.remove(e); enemies.splice(enemies.indexOf(e), 1);
      score += 30; kills++; ARC.sfx('boom', { vol: .4 }); ARC.shake(3); }
  }
  if (hit) { ARC.sfx('hit', { vol: .5 }); ARC.shake(2); }
}
function hurt(d) { hp -= d; ARC.shake(5); ARC.vib(30); ARC.sfx('hurt', { vol: .5 });
  if (hp <= 0) { hp = 0; dead = true;
    ARC.over({ win: false, score, title: 'TE NOQUEARON', sub: 'oleada ' + wave, coins: (score / 20 | 0) }); } }

function step(dt) {
  if (dead) return; tPlay += dt;
  if (atkT > 0) atkT -= dt; if (atkCool > 0) atkCool -= dt;
  let mx = 0, mz = 0;
  if (joy) { mx = joy.x; mz = joy.y; }
  if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  const mv = Math.min(1, Math.hypot(mx, mz));
  moving = mv > .1 && atkT <= 0;
  if (moving) {
    const a = Math.atan2(mx, mz) + camYaw;
    px += Math.sin(a) * 5.2 * mv * dt; pz += Math.cos(a) * 5.2 * mv * dt;
    const L = Math.hypot(px, pz); if (L > ARENA - 1) { px *= (ARENA - 1) / L; pz *= (ARENA - 1) / L; }
    pyaw = a;
    if (atkT <= 0) ch.play('run');
  } else if (atkT <= 0) ch.play('idle');
  ch.root.position.set(px, 0, pz);
  let dy = pyaw - ch.root.rotation.y;
  while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
  ch.root.rotation.y += dy * Math.min(1, dt * 12);
  ch.update(dt, 1.1);
  const cd = 5.6;
  cam.position.set(px - Math.sin(camYaw) * cd, 2.9, pz - Math.cos(camYaw) * cd);
  cam.lookAt(px, 1.3, pz);
  // enemigos
  for (const e of enemies) { const u = e.userData;
    if (u.hitK > 0) { u.hitK -= dt; continue; }              // aturdido tras el golpe
    const dx = px - e.position.x, dz = pz - e.position.z, d = Math.hypot(dx, dz);
    e.rotation.y = Math.atan2(dx, dz);
    if (d > 1.4) { e.position.x += dx / d * u.spd * dt; e.position.z += dz / d * u.spd * dt;
      e.position.y = Math.abs(Math.sin(tPlay * 7 + e.position.x)) * .1; }
    else { u.atk -= dt; if (u.atk <= 0) { u.atk = .9; hurt(6 + wave); } }
  }
  for (let i = meds.length - 1; i >= 0; i--) { const m = meds[i]; m.rotation.y += dt * 2;
    if ((m.position.x - px) ** 2 + (m.position.z - pz) ** 2 < 2.2) { scene.remove(m); meds.splice(i, 1);
      hp = Math.min(100, hp + 35); ARC.sfx('coin', { vol: .6 }); ARC.toast('+35 ❤'); ARC.vib(20); } }
  if (spawnLeft > 0) { spawnT -= dt; if (spawnT <= 0 && enemies.length < 10) { spawnEnemy(); spawnLeft--; spawnT = Math.max(.35, 1.3 - wave * .06); } }
  else if (enemies.length === 0) startWave();
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 44, 240, 18);
  g.fillStyle = hp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(24, H - 44, 240 * hp / 100, 18);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.textAlign = 'left'; g.fillText('❤ ' + (hp | 0), 30, H - 30);
  g.textAlign = 'center'; g.font = '900 24px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('OLEADA ' + wave, W / 2, 36);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '700 13px system-ui'; g.fillStyle = '#9fb0d8'; g.fillText('bajas: ' + kills + ' · enemigos: ' + enemies.length, 24, 62);
  if (joy && joy.cx != null) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
    g.beginPath(); g.arc(joy.cx, joy.cy, 52, 0, 6.28); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(joy.cx + joy.x * 44, joy.cy + joy.y * 44, 20, 0, 6.28); g.fill(); }
  // botón GOLPE
  g.fillStyle = atkCool > 0 ? 'rgba(255,84,112,.3)' : 'rgba(255,84,112,.75)';
  g.beginPath(); g.arc(W - 86, H - 96, 46, 0, 6.28); g.fill();
  g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('GOLPE', W - 86, H - 90);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (cam) { cam.position.set(Math.cos(menuA) * 7, 2.6 + Math.sin(menuA * .7), Math.sin(menuA) * 7); cam.lookAt(0, 1.2, 0); }
  if (ch) ch.update(dt, 1); }

function down(p) {
  if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if ((p.x - (ARC.W - 86)) ** 2 + (p.y - (ARC.H - 96)) ** 2 < 52 * 52) { attack(); return; }
  if (p.x < ARC.W * .55) joy = { cx: p.x, cy: p.y, x: 0, y: 0 };
}
let lastLX = null;
function move(p) {
  if (joy && p.x < ARC.W * .72) { const dx = p.x - joy.cx, dy2 = p.y - joy.cy;
    const d = Math.hypot(dx, dy2), k = d > 52 ? 52 / d : 1;
    joy.x = dx * k / 52; joy.y = dy2 * k / 52; }
  else if (lastLX != null) camYaw -= (p.x - lastLX) * .008;
  lastLX = p.x;
}
function up() { joy = null; lastLX = null; }
function look(dx) { if (!joy) camYaw -= dx * .004; }
function key(code, dn) { keys[code] = dn; if ((code === 'Space' || code === 'KeyJ') && dn) attack(); if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'nudillos', name: 'NUDILLOS', sub: 'combo tras combo', acc: '#ffb04d', three: true, sky: '#241826',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look, key,
  dbg: {
    state: () => ({ score, kills, hp: hp | 0, wave, enemies: enemies ? enemies.length : 0, dead }),
    autoPlay() {
      if (dead) return;
      if (enemies && enemies.length) { let n = enemies[0], bd = 1e9;
        for (const e of enemies) { const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2; if (d < bd) { bd = d; n = e; } }
        const d = Math.sqrt(bd);
        pyaw = Math.atan2(n.position.x - px, n.position.z - pz);
        if (d > 2.2) { const rel = pyaw - camYaw; joy = { cx: 120, cy: ARC.H - 120, x: Math.sin(rel), y: Math.cos(rel) }; }
        else { joy = null; attack(); }
      } else joy = null;
    }
  }
};
})();

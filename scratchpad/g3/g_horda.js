/* ===== HORDA — shooter de oleadas en primera persona ====================== */
window.GAME = (function () {
const EYE = 1.7, ARENA = 42;
let T, scene, cam, ren;
let yaw = 0, pitch = 0, vm, muzzle, muzT = 0, recoil = 0, bobT = 0;
let enemies, tmplEnemy, hp, ammo, mag, reloadT, score, kills, wave, spawnLeft, spawnT, dead, tPlay, fireCD, autoFire;

/* ---- construir mundo ---- */
async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  cam.rotation.order = 'YXZ'; cam.position.set(0, EYE, 0);
  const tl = new T.TextureLoader();
  // CIELO 360 (atardecer bélico) de fondo
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0x3a2836, 44, 150);
  // luz de atardecer
  scene.add(new T.HemisphereLight(0xffc48a, 0x2a2030, 1.15));
  scene.add(new T.AmbientLight(0xffe6c8, .35));
  const sun = new T.DirectionalLight(0xffd0a0, 2.3); sun.position.set(2, 10, -46); scene.add(sun);
  const rim = new T.DirectionalLight(0x9a7cff, .8); rim.position.set(-20, 8, 20); scene.add(rim);
  ren.toneMappingExposure = 1.12;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  // suelo: asfalto oscuro
  const ground = new T.Mesh(new T.CircleGeometry(ARENA + 30, 56), new T.MeshStandardMaterial({ map: load(TEX.ground, 26), color: 0x8a7f86, roughness: .96 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // EDIFICIOS PBR: anillo de torres entre el jugador y el skyline del cielo
  const facade = load(TEX.facade, 1), brick = load(TEX.brick, 1), roof = load(TEX.roof, 1);
  const mats = [new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0xbfc8de }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xc89a80 }),
    new T.MeshStandardMaterial({ map: roof, roughness: .9, color: 0x9aa4b8 }),
    new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0x8892b0 }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0x7a6a62 })];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * 6.28 + ARC.rnd(-.1, .1), r = ARENA + ARC.rnd(2, 26), h = ARC.rnd(12, 42), w = ARC.rnd(6, 12), dp = ARC.rnd(6, 12);
    const g2 = new T.BoxGeometry(w, h, dp); const uv = g2.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    const b = new T.Mesh(g2, mats[i % mats.length]); b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.rotation.y = ARC.rnd(0, 6.28); scene.add(b);
  }
  // VEHÍCULOS del repo como cobertura (calle de guerra)
  try {
    const vs = await Promise.all(MDL.veh.map(u => ARC.loadGLB(u).then(g => g.scene).catch(() => null)));
    let idx = 0;
    for (let i = 0; i < 10; i++) { const src = vs[i % vs.length]; if (!src) continue;
      const v = src.clone(true); const vb = new T.Box3().setFromObject(v); const vsz = vb.getSize(new T.Vector3());
      const vk = 4.6 / (Math.max(vsz.x, vsz.z) || 1); v.scale.setScalar(vk);
      /* medir la caja EN EL ORIGEN (ya escalado) y apoyarlo en el piso */
      v.position.set(0, 0, 0); v.updateWorldMatrix(true, true);
      const nb = new T.Box3().setFromObject(v);
      const a = ARC.rnd(0, 6.28), rr = ARC.rnd(9, ARENA - 5);
      v.position.set(Math.cos(a) * rr, -nb.min.y, Math.sin(a) * rr); v.rotation.y = ARC.rnd(0, 6.28);
      scene.add(v); idx++; }
  } catch (e) { console.warn('veh', e); }
  // VIEWMODEL: manos + arma
  try {
    const wg = await ARC.loadGLB(MDL.gun); const gun = wg.scene;
    const gb = new T.Box3().setFromObject(gun); const gs = gb.getSize(new T.Vector3());
    const gk = 0.6 / (Math.max(gs.x, gs.y, gs.z) || 1); gun.scale.setScalar(gk);
    gun.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = 22; if (o.material) { o.material.depthTest = false; o.material.fog = false; } } });
    gun.position.set(.2, -.27, -.52); gun.rotation.set(.04, Math.PI + .08, 0); cam.add(gun); vm = gun;
    const fill = new T.PointLight(0xffd8a8, 1.1, 2.2); fill.position.set(.05, .12, -.25); cam.add(fill);
  } catch (e) { console.warn('vm', e); }
  scene.add(cam);
  // fogonazo
  muzzle = new T.Mesh(new T.SphereGeometry(.12, 6, 6), new T.MeshBasicMaterial({ color: 0xffd070 })); muzzle.position.set(.18, -.16, -.9); muzzle.visible = false; cam.add(muzzle);
  const ml = new T.PointLight(0xffb040, 0, 8); ml.position.copy(muzzle.position); cam.add(ml); muzzle.light = ml;
  // enemigo plantilla
  try { const eg = await ARC.loadGLB(MDL.enemy); tmplEnemy = eg.scene;
    const box = new T.Box3().setFromObject(tmplEnemy); const sz = box.getSize(new T.Vector3());
    const k = 2.2 / (sz.y || 1); tmplEnemy.scale.setScalar(k);
    tmplEnemy.traverse(o => { if (o.isMesh) { o.frustumCulled = false; } });
  } catch (e) { console.warn('enemy', e); tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.5, 1.2, 4, 8), new T.MeshStandardMaterial({ color: 0xff5470 })); }
  enemies = [];
}

function spawnEnemy() {
  const e = tmplEnemy.clone(true);
  const a = ARC.rnd(0, 6.28), r = ARENA - ARC.rnd(1, 5);
  e.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  e.userData = { hp: 3 + (wave / 3 | 0), spd: 1.6 + wave * .12, hitT: 0, atk: 0 };
  scene.add(e); enemies.push(e);
}

function startWave() { wave++; spawnLeft = 4 + wave * 2; spawnT = 0; ARC.toast('OLEADA ' + wave); ARC.sfx('power', { vol: .5 }); }

function start() {
  yaw = 0; pitch = 0; hp = 100; ammo = 20; mag = 20; reloadT = 0; score = 0; kills = 0; wave = 0;
  dead = false; tPlay = 0; fireCD = 0; recoil = 0; autoFire = false;
  for (const e of (enemies || [])) scene.remove(e); enemies = [];
  startWave();
}

function shoot() {
  if (dead || reloadT > 0) return;
  if (ammo <= 0) { reload(); return; }
  ammo--; fireCD = .09; recoil = 1; muzT = .05;
  ARC.sfx('shoot', { vol: .5, rate: ARC.rnd(.95, 1.08) }); ARC.shake(2); ARC.vib(12);
  muzzle.visible = true; muzzle.light.intensity = 3;
  // impacto por ángulo al enemigo más centrado
  const fwd = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  let best = null, bestDot = 0.988;
  for (const e of enemies) { const to = new T.Vector3(e.position.x - cam.position.x, e.position.y + 1 - cam.position.y, e.position.z - cam.position.z).normalize();
    const d = to.dot(fwd); if (d > bestDot) { bestDot = d; best = e; } }
  if (best) { best.userData.hp -= 1; best.userData.hitT = .12;
    const sp = worldToScreen(best.position.x, best.position.y + 1.4, best.position.z);
    if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd23f', 6, 4);
    if (best.userData.hp <= 0) { killEnemy(best); }
    else ARC.sfx('hit', { vol: .4 });
  }
  if (ammo <= 0) reload();
}
function reload() { if (reloadT > 0) return; reloadT = 1.1; ARC.sfx('reload', { vol: .5 }); }
function killEnemy(e) { const sp = worldToScreen(e.position.x, e.position.y + 1.2, e.position.z);
  if (sp) { ARC.fx.burst(sp.x, sp.y, '#ff5470', 14, 6); ARC.fx.ring(sp.x, sp.y, '#fff', 8); }
  scene.remove(e); enemies.splice(enemies.indexOf(e), 1); score += 25; kills++; ARC.sfx('boom', { vol: .4 }); ARC.shake(3); }

function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }

function hurt(d) { hp -= d; ARC.shake(6); ARC.vib(30); ARC.sfx('hurt', { vol: .5 });
  if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'CAÍSTE', sub: 'oleada ' + wave, coins: (score / 20 | 0) }); } }

function step(dt) {
  if (dead) return; tPlay += dt; bobT += dt;
  // cámara
  cam.rotation.y = yaw; cam.rotation.x = pitch;
  // viewmodel bob + recoil
  if (vm) { vm.position.y = -.26 + Math.sin(bobT * 8) * .006; }
  if (recoil > 0) recoil = Math.max(0, recoil - dt * 8);
  cam.rotation.x = pitch + recoil * .04;
  if (muzT > 0) { muzT -= dt; if (muzT <= 0) { muzzle.visible = false; muzzle.light.intensity = 0; } }
  if (autoFire) { fireCD -= dt; if (fireCD <= 0) shoot(); }
  else if (fireCD > 0) fireCD -= dt;
  if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) ammo = mag; }
  // enemigos
  for (const e of enemies) { const u = e.userData; if (u.hitT > 0) u.hitT -= dt;
    const dx = -e.position.x, dz = -e.position.z; const d = Math.hypot(dx, dz);
    e.rotation.y = Math.atan2(dx, dz);
    if (d > 2.2) { e.position.x += dx / d * u.spd * dt; e.position.z += dz / d * u.spd * dt;
      e.position.y = Math.abs(Math.sin(tPlay * 6 + e.position.x)) * .12; }
    else { u.atk -= dt; if (u.atk <= 0) { u.atk = 1; hurt(6 + wave); } }
    e.scale.setScalar(e.scale.x); // no-op keep
    if (u.hitT > 0) e.rotation.z = Math.sin(tPlay * 40) * .1; else e.rotation.z = 0;
  }
  // director
  if (spawnLeft > 0) { spawnT -= dt; if (spawnT <= 0 && enemies.length < 12) { spawnEnemy(); spawnLeft--; spawnT = Math.max(.4, 1.4 - wave * .06); } }
  else if (enemies.length === 0) { if (tPlay > 1) startWave(); }
  ARC.hud();
}

/* ---- HUD 2D ---- */
function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  // mira
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 12, H / 2); g.lineTo(W / 2 - 4, H / 2); g.moveTo(W / 2 + 4, H / 2); g.lineTo(W / 2 + 12, H / 2);
  g.moveTo(W / 2, H / 2 - 12); g.lineTo(W / 2, H / 2 - 4); g.moveTo(W / 2, H / 2 + 4); g.lineTo(W / 2, H / 2 + 12); g.stroke();
  g.fillStyle = 'rgba(255,80,80,.9)'; g.beginPath(); g.arc(W / 2, H / 2, 1.6, 0, 6.28); g.fill();
  // salud
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 46, 260, 20);
  g.fillStyle = hp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(24, H - 46, 260 * hp / 100, 20);
  g.fillStyle = '#fff'; g.font = '900 16px system-ui'; g.textAlign = 'left'; g.fillText('❤ ' + (hp | 0), 30, H - 31);
  // munición
  g.textAlign = 'right'; g.font = '900 30px system-ui'; g.fillStyle = ammo > 0 ? '#fff' : '#ff5470';
  g.fillText(reloadT > 0 ? 'RECARGA…' : (ammo + ' / ' + mag), W - 24, H - 28);
  // oleada + puntaje
  g.textAlign = 'center'; g.font = '900 22px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('OLEADA ' + wave, W / 2, 34);
  g.textAlign = 'left'; g.font = '900 24px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 40);
  g.font = '700 13px system-ui'; g.fillStyle = '#9fb0d8'; g.fillText('enemigos: ' + enemies.length, 24, 60);
  // botón pausa (táctil): esquina sup der
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

/* ---- menú vivo: la cámara gira sola sobre la arena ---- */
let menuA = 0;
function attract3d(dt) { menuA += dt * .5; if (cam) { cam.position.set(Math.cos(menuA) * 9, 3.4 + Math.sin(menuA * .7) * 1.2, Math.sin(menuA) * 9); cam.lookAt(0, 1.4, 0); } }

/* ---- input ---- */
function look(dx, dy) { yaw -= dx * .0032; pitch = ARC.clamp(pitch - dy * .0032, -1.2, 1.2); }
function down(p) {
  // toque en la esquina de pausa
  if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (ARC.renderer && !document.pointerLockElement && ARC.renderer.domElement.requestPointerLock) { /* PC: pedir lock */ }
  shoot();
}
function key(code, dn) { if (code === 'KeyR' && dn) reload(); if (code === 'Space' && dn) shoot(); if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'horda', name: 'HORDA', sub: 'sobreviví las oleadas', acc: '#ff5470', three: true, sky: '#121a2a',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, look, down, up() {}, move() {}, key,
  aimMove() {},
  dbg: {
    state: () => ({ score, kills, hp: hp | 0, wave, enemies: enemies ? enemies.length : 0, dead }),
    autoPlay() {
      if (dead) return;
      if (enemies && enemies.length) {
        let n = enemies[0], bd = 1e9;
        for (const e of enemies) { const d = e.position.length(); if (d < bd) { bd = d; n = e; } }
        const dx = n.position.x - cam.position.x, dy = (n.position.y + 1) - cam.position.y, dz = n.position.z - cam.position.z;
        const L = Math.hypot(dx, dy, dz) || 1;
        yaw = Math.atan2(-dx / L, -dz / L);
        pitch = ARC.clamp(Math.asin(dy / L), -1.2, 1.2);
        shoot();
      }
    }
  }
};
})();

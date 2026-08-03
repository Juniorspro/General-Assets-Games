/* ===== HORDA — survivors-like en 3ª persona ================================
   El personaje (char.glb, anims idle/run, SMG en la mano derecha) corre por
   una ciudad en guerra y dispara SOLO al enemigo más cercano. Vos lo movés:
   joystick táctil o WASD. Oleadas cada vez más densas + botiquines. */
window.GAME = (function () {
const ARENA = 40;
let T, scene, cam, ren, ch;
let px = 0, pz = 0, pyaw = 0, camYaw = 0, camPit = .34;
let enemies, tmplEnemy, tracers, meds, hp, score, kills, wave, spawnLeft, spawnT, dead, tPlay, fireT, moving;
let joy = null, keys = {};

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0x3a2836, 44, 150);
  scene.add(new T.HemisphereLight(0xffc48a, 0x2a2030, 1.15));
  scene.add(new T.AmbientLight(0xffe6c8, .35));
  const sun = new T.DirectionalLight(0xffd0a0, 2.3); sun.position.set(2, 10, -46); scene.add(sun);
  const rim = new T.DirectionalLight(0x9a7cff, .8); rim.position.set(-20, 8, 20); scene.add(rim);
  ren.toneMappingExposure = 1.12;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  const ground = new T.Mesh(new T.CircleGeometry(ARENA + 30, 56), new T.MeshStandardMaterial({ map: load(TEX.ground, 26), color: 0x8a7f86, roughness: .96 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const facade = load(TEX.facade, 1), brick = load(TEX.brick, 1), roof = load(TEX.roof, 1);
  const mats = [new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0xbfc8de }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xc89a80 }),
    new T.MeshStandardMaterial({ map: roof, roughness: .9, color: 0x9aa4b8 }),
    new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0x8892b0 }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0x7a6a62 })];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * 6.28 + ARC.rnd(-.1, .1), r = ARENA + ARC.rnd(4, 28), h = ARC.rnd(12, 42), w = ARC.rnd(6, 12), dp = ARC.rnd(6, 12);
    const g2 = new T.BoxGeometry(w, h, dp); const uv = g2.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    const b = new T.Mesh(g2, mats[i % mats.length]); b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.rotation.y = ARC.rnd(0, 6.28); scene.add(b);
  }
  // autos de cobertura
  try {
    const vs = await Promise.all(MDL.veh.map(u => ARC.loadGLB(u).then(g => g.scene).catch(() => null)));
    for (let i = 0; i < 10; i++) { const src = vs[i % vs.length]; if (!src) continue;
      const v = src.clone(true); const vb = new T.Box3().setFromObject(v); const vsz = vb.getSize(new T.Vector3());
      const vk = 4.6 / (Math.max(vsz.x, vsz.z) || 1); v.scale.setScalar(vk);
      v.position.set(0, 0, 0); v.updateWorldMatrix(true, true);
      const nb = new T.Box3().setFromObject(v);
      const a = ARC.rnd(0, 6.28), rr = ARC.rnd(10, ARENA - 6);
      v.position.set(Math.cos(a) * rr, -nb.min.y, Math.sin(a) * rr); v.rotation.y = ARC.rnd(0, 6.28);
      scene.add(v); }
  } catch (e) {}
  // PERSONAJE con la SMG en la mano (patrón del sux)
  ch = await CHAR.load(T, { alto: 1.8, clips: { idle: MDL.aIdle, run: MDL.aRun } });
  scene.add(ch.root);
  // sombra de contacto (bloque al personaje al piso visualmente)
  const blob = new T.Mesh(new T.CircleGeometry(.55, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .02; ch.root.add(blob);
  await ch.equip(MDL.gun, { esc: .55, ry: Math.PI / 2, rz: -Math.PI / 2, py: .05, pz: .02 });
  ch.play('idle', 0);
  // enemigo plantilla
  try { const eg = await ARC.loadGLB(MDL.enemy); tmplEnemy = eg.scene;
    const box = new T.Box3().setFromObject(tmplEnemy); const sz = box.getSize(new T.Vector3());
    tmplEnemy.scale.setScalar(2.1 / (sz.y || 1));
    tmplEnemy.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  } catch (e) { tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.5, 1.2, 4, 8), new T.MeshStandardMaterial({ color: 0xff5470 })); }
  enemies = []; tracers = []; meds = [];
}

function spawnEnemy() {
  const e = tmplEnemy.clone(true);
  const a = ARC.rnd(0, 6.28), r = ARENA - ARC.rnd(0, 4);
  e.position.set(px + Math.cos(a) * r, 0, pz + Math.sin(a) * r);
  const L = Math.hypot(e.position.x, e.position.z);
  if (L > ARENA) { e.position.x *= ARENA / L; e.position.z *= ARENA / L; }
  e.userData = { hp: 3 + (wave / 2 | 0), spd: 1.9 + wave * .14 + ARC.rnd(-.2, .3), atk: 0 };
  scene.add(e); enemies.push(e);
}
function spawnMed() { const m = new T.Mesh(new T.BoxGeometry(.55, .55, .55), new T.MeshBasicMaterial({ color: 0x7dff9e }));
  m.position.set(ARC.rnd(-ARENA + 8, ARENA - 8), .5, ARC.rnd(-ARENA + 8, ARENA - 8)); scene.add(m); meds.push(m); }
function startWave() { wave++; spawnLeft = 5 + wave * 3; spawnT = 0; ARC.toast('OLEADA ' + wave); ARC.sfx('power', { vol: .5 });
  if (wave % 2 === 0) spawnMed(); }

function start() {
  px = 0; pz = 0; pyaw = 0; camYaw = 0; hp = 100; score = 0; kills = 0; wave = 0; dead = false; tPlay = 0; fireT = 0;
  for (const e of (enemies || [])) scene.remove(e); enemies = [];
  for (const m of (meds || [])) scene.remove(m); meds = [];
  for (const t2 of (tracers || [])) scene.remove(t2.m); tracers = [];
  if (ch) { ch.root.position.set(0, 0, 0); ch.play('idle', 0); }
  startWave();
}

function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }

function shootAt(e) {
  fireT = .16;
  ARC.sfx('shoot', { vol: .4, rate: ARC.rnd(.95, 1.1) }); ARC.vib(8);
  // trazadora desde la mano del personaje
  const from = new T.Vector3(); (ch.bones.rHand || ch.root).getWorldPosition(from);
  const to = new T.Vector3(e.position.x, e.position.y + 1.1, e.position.z);
  const m = new T.Mesh(new T.SphereGeometry(.07, 5, 5), new T.MeshBasicMaterial({ color: 0xffd070 }));
  m.position.copy(from); scene.add(m);
  tracers.push({ m, to, v: to.clone().sub(from).normalize().multiplyScalar(46), e });
  // giro del personaje hacia el objetivo
  pyaw = Math.atan2(e.position.x - px, e.position.z - pz);
}
function hitEnemy(e, dmg) {
  e.userData.hp -= dmg;
  const sp = worldToScreen(e.position.x, e.position.y + 1.4, e.position.z);
  if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd23f', 5, 4);
  if (e.userData.hp <= 0) { const sp2 = worldToScreen(e.position.x, e.position.y + 1, e.position.z);
    if (sp2) { ARC.fx.burst(sp2.x, sp2.y, '#ff5470', 14, 6); ARC.fx.ring(sp2.x, sp2.y, '#fff', 8); }
    scene.remove(e); enemies.splice(enemies.indexOf(e), 1);
    score += 25; kills++; ARC.sfx('boom', { vol: .35 }); ARC.shake(2); }
  else ARC.sfx('hit', { vol: .3 });
}
function hurt(d) { hp -= d; ARC.shake(5); ARC.vib(30); ARC.sfx('hurt', { vol: .5 });
  if (hp <= 0) { hp = 0; dead = true; ch.play('idle', .1);
    ARC.over({ win: false, score, title: 'TE ATRAPARON', sub: 'oleada ' + wave, coins: (score / 20 | 0) }); } }

function step(dt) {
  if (dead) return; tPlay += dt;
  // ---- movimiento
  let mx = 0, mz = 0;
  if (joy) { mx = joy.x; mz = joy.y; }
  if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  const mv = Math.min(1, Math.hypot(mx, mz));
  moving = mv > .1;
  if (moving) {
    const a = Math.atan2(mx, mz) + camYaw;      // relativo a la cámara
    const spd = 5.6;
    px += Math.sin(a) * spd * mv * dt; pz += Math.cos(a) * spd * mv * dt;
    const L = Math.hypot(px, pz); if (L > ARENA - 1) { px *= (ARENA - 1) / L; pz *= (ARENA - 1) / L; }
    if (fireT <= 0) pyaw = a;                    // mira adonde corre si no dispara
    ch.play('run');
  } else ch.play('idle');
  ch.root.position.set(px, 0, pz);
  // giro suave del personaje
  let dy = pyaw - ch.root.rotation.y;
  while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
  ch.root.rotation.y += dy * Math.min(1, dt * 10);
  ch.update(dt, moving ? 1.15 : 1);
  // ---- cámara: detrás del personaje con órbita
  const cd = 6.4, chh = 3.1;
  cam.position.set(px - Math.sin(camYaw) * cd, chh, pz - Math.cos(camYaw) * cd);
  cam.lookAt(px, 1.4, pz);
  // ---- disparo automático al más cercano
  fireT -= dt;
  if (fireT <= 0 && enemies.length) {
    let best = null, bd = 24 * 24;
    for (const e of enemies) { const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2; if (d < bd) { bd = d; best = e; } }
    if (best) shootAt(best);
  }
  // ---- trazadoras
  for (let i = tracers.length - 1; i >= 0; i--) { const t2 = tracers[i];
    t2.m.position.addScaledVector(t2.v, dt);
    if (t2.m.position.distanceToSquared(t2.to) < 1.2) { scene.remove(t2.m); tracers.splice(i, 1);
      if (enemies.includes(t2.e)) hitEnemy(t2.e, 1); }
    else if (t2.m.position.length() > 200) { scene.remove(t2.m); tracers.splice(i, 1); } }
  // ---- enemigos: van al jugador
  for (const e of enemies) { const u = e.userData;
    const dx = px - e.position.x, dz = pz - e.position.z, d = Math.hypot(dx, dz);
    e.rotation.y = Math.atan2(dx, dz);
    if (d > 1.6) { e.position.x += dx / d * u.spd * dt; e.position.z += dz / d * u.spd * dt;
      e.position.y = Math.abs(Math.sin(tPlay * 7 + e.position.x)) * .1; }
    else { u.atk -= dt; if (u.atk <= 0) { u.atk = .9; hurt(7 + wave); } }
  }
  // ---- botiquines
  for (let i = meds.length - 1; i >= 0; i--) { const m = meds[i]; m.rotation.y += dt * 2;
    if ((m.position.x - px) ** 2 + (m.position.z - pz) ** 2 < 2.3) { scene.remove(m); meds.splice(i, 1);
      hp = Math.min(100, hp + 35); ARC.sfx('coin', { vol: .6 }); ARC.toast('+35 ❤'); ARC.vib(20); } }
  // ---- director
  if (spawnLeft > 0) { spawnT -= dt; if (spawnT <= 0 && enemies.length < 14) { spawnEnemy(); spawnLeft--; spawnT = Math.max(.3, 1.2 - wave * .05); } }
  else if (enemies.length === 0) startWave();
  score += dt * 2 | 0 ? 0 : 0;
}

/* ---- HUD ---- */
function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  // vida
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 44, 240, 18);
  g.fillStyle = hp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(24, H - 44, 240 * hp / 100, 18);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.textAlign = 'left'; g.fillText('❤ ' + (hp | 0), 30, H - 30);
  // oleada / puntos / kills
  g.textAlign = 'center'; g.font = '900 24px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('OLEADA ' + wave, W / 2, 36);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '700 13px system-ui'; g.fillStyle = '#9fb0d8'; g.fillText('bajas: ' + kills + ' · enemigos: ' + enemies.length, 24, 62);
  // joystick visual
  if (joy && joy.cx != null) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
    g.beginPath(); g.arc(joy.cx, joy.cy, 52, 0, 6.28); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(joy.cx + joy.x * 44, joy.cy + joy.y * 44, 20, 0, 6.28); g.fill(); }
  // pausa
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

/* ---- menú vivo ---- */
let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (cam) { cam.position.set(Math.cos(menuA) * 8, 3 + Math.sin(menuA * .7), Math.sin(menuA) * 8); cam.lookAt(0, 1.3, 0); }
  if (ch) ch.update(dt, 1); }

/* ---- input ---- */
function down(p) {
  if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (p.x < ARC.W * .55) joy = { cx: p.x, cy: p.y, x: 0, y: 0, id: 1 };
  else joy2 = { x0: p.x };
}
let joy2 = null, lastLX = null;
function move(p) {
  if (joy && p.x < ARC.W * .72) { const dx = p.x - joy.cx, dy2 = p.y - joy.cy;
    const d = Math.hypot(dx, dy2), k = d > 52 ? 52 / d : 1;
    joy.x = dx * k / 52; joy.y = dy2 * k / 52; }
  else if (lastLX != null) { camYaw -= (p.x - lastLX) * .008; }
  lastLX = p.x;
}
function up() { joy = null; lastLX = null; }
function look(dx) { if (!joy) camYaw -= dx * .004; }
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'horda', name: 'HORDA', sub: 'sobreviví las oleadas', acc: '#ff5470', three: true, sky: '#241826',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look, key,
  dbg: {
    state: () => ({ score, kills, hp: hp | 0, wave, enemies: enemies ? enemies.length : 0, dead, x: +px.toFixed(1), z: +pz.toFixed(1) }),
    autoPlay() {
      if (dead) return;
      // correr lejos del enemigo más cercano (kitear) — el disparo es automático
      if (enemies && enemies.length) { let n = enemies[0], bd = 1e9;
        for (const e of enemies) { const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2; if (d < bd) { bd = d; n = e; } }
        const away = Math.atan2(px - n.position.x, pz - n.position.z);
        const wx = Math.sin(away), wz = Math.cos(away);
        // en coords de joystick (relativas a cámara)
        const rel = away - camYaw;
        joy = { cx: 120, cy: ARC.H - 120, x: Math.sin(rel), y: Math.cos(rel), id: 9 };
      } else joy = null;
    }
  }
};
})();

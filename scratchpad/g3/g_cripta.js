/* ===== CRIPTA — roguelike en primera persona =============================
   Bajás por salas de una cripta: matá a todos los golems y se abre la puerta
   a la siguiente sala. Espada 3D en mano, antorchas con luz y SOMBRAS en
   tiempo real, oleadas, jefe cada 5 salas, mejoras al subir de sala.
   Controles: joystick izq = caminar · arrastrar der = mirar · ATACAR.
   CÁMARA: una sola fuente de mirada (look), posición interpolada, shake real
   sobre la cámara 3D y transición con fundido al pasar de sala. */
window.GAME = (function () {
let T, scene, cam, ren;
let px = 0, pz = 0, yaw = Math.PI, pitch = 0, hp = 0, hpMax = 100, score = 0, dead = false, won = false, tPlay = 0;
let sala = 1, salaMax = 10, kills = 0, killNeed = 0, puerta = null, puertaOpen = false, bossAlive = false;
let sword = null, swingT = 0, atkCD = 0, dmg = 12, spd = 6.2;
let enemies = [], pool = [], tmplEnemy = null, EY = 0, walls = [], torches = [];
let keys = {}, joy = null, look = null, atkHeld = false, atkTid = -1, hurtFlash = 0, iFrame = 0;
let dbgAuto = false, playing = false, touchAct = false;
let camX = 0, camZ = 0, camY = 2.6, shk = 0, shkR = 0, bobT = 0, fade = 0, fadePend = false;

const ROOM = 26, WALLH = 9, FADE = .55;
const CAMH = 2.6, NEARZ = .3;
/* HUD: joystick, botón de ataque y pausa (mismos números para dibujo y toque) */
const JX = 112, JY = 124, JR = 60, JK = 26, JD = 42;   // JY/JR se miden desde abajo
const AX = 96, AY = 104, AR = 56;
const LOOK_T = .0048, PIT_T = .0035;                   // sensibilidad táctil (unidades lógicas)
const LOOK_M = .0032, PIT_M = .0028;                   // sensibilidad de mouse (px CSS)

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  scene.background = new T.Color(0x1d1730);
  scene.fog = new T.Fog(0x241c3a, 24, 90);
  scene.add(new T.HemisphereLight(0xcfd8f5, 0x3a3040, 2.4));   // el "suelo" del hemi es lo que pinta el techo
  scene.add(new T.AmbientLight(0xdce6ff, 1.35));
  const key = new T.DirectionalLight(0xffe9c8, 1.5); key.position.set(12, 30, 8);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  { const c = key.shadow.camera; c.left = -32; c.right = 32; c.top = 32; c.bottom = -32; c.near = 1; c.far = 70; key.shadow.bias = -0.0008; }
  scene.add(key);
  ren.toneMappingExposure = 1.75;                       // sin esto la cripta se ve NEGRA (ESTADO.md)
  cam.near = NEARZ; cam.updateProjectionMatrix();       // que la geometría cercana no se recorte fea
  const tl = new T.TextureLoader();
  const rep = (u, n, m) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, m || n); t.colorSpace = T.SRGBColorSpace; return t; };
  const matWall = new T.MeshStandardMaterial({ map: rep(TEX.wall, 4, 2), roughness: .88, color: 0xffffff });
  const matFloor = new T.MeshStandardMaterial({ map: rep(TEX.floor, 7), roughness: .9, color: 0xf2eef8 });
  // piso + techo (el techo con más emisivo: si no, la bóveda queda negra)
  const floor = new T.Mesh(new T.PlaneGeometry(ROOM * 2, ROOM * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(ROOM * 2, ROOM * 2), new T.MeshStandardMaterial({ map: rep(TEX.wall, 8), roughness: 1, color: 0x4a4256, emissive: 0x161122, emissiveIntensity: 1.1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = WALLH; scene.add(ceil);
  // 4 paredes con hueco de puerta al norte
  walls = [];
  const mkWall = (x, z, w, d) => { const m = new T.Mesh(new T.BoxGeometry(w, WALLH, d), matWall);
    m.position.set(x, WALLH / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    walls.push({ x, z, rx: w / 2 + .45, rz: d / 2 + .45 }); };
  const R = ROOM;
  mkWall(0, R, R * 2, 1.4);            // sur
  mkWall(-R, 0, 1.4, R * 2);           // oeste
  mkWall(R, 0, 1.4, R * 2);            // este
  mkWall(-R / 2 - 3, -R, R - 6, 1.4);  // norte izq
  mkWall(R / 2 + 3, -R, R - 6, 1.4);   // norte der
  // PUERTA (bloquea el hueco hasta limpiar la sala)
  puerta = new T.Mesh(new T.BoxGeometry(12, WALLH, 1.4), new T.MeshStandardMaterial({ map: rep(TEX.wall, 2, 1), color: 0x8a7454, roughness: .9, emissive: 0x241608, emissiveIntensity: 1 }));
  puerta.position.set(0, WALLH / 2, -R); puerta.castShadow = true; scene.add(puerta);
  walls.push({ x: 0, z: -R, rx: 6.4, rz: 1.15, door: true });
  // columnas (colisión REDONDA: con AABB frenaban 1.1 m antes en la diagonal)
  for (const s of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const c = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, WALLH, 10), matWall);
    c.position.set(s[0] * R * .5, WALLH / 2, s[1] * R * .5); c.castShadow = true; c.receiveShadow = true; scene.add(c);
    walls.push({ x: c.position.x, z: c.position.z, rx: 1.75, rz: 1.75, round: true, r: 1.75 });
  }
  // ANTORCHAS con luz + sombra (1 castea, el resto solo ilumina: perf)
  torches = [];
  const tp = [[-R + 3, -R + 6], [R - 3, -R + 6], [-R + 3, R - 6], [R - 3, R - 6]];
  tp.forEach((p, i) => {
    const holder = new T.Mesh(new T.CylinderGeometry(.12, .16, 1.5, 6), new T.MeshStandardMaterial({ color: 0x3a3038, roughness: .9 }));
    holder.position.set(p[0], 3, p[1]); scene.add(holder);
    const fl = new T.Mesh(new T.ConeGeometry(.28, .7, 7), new T.MeshBasicMaterial({ color: 0xffa646 }));
    fl.position.set(p[0], 4.1, p[1]); scene.add(fl);
    const li = new T.PointLight(0xffb468, 7.5, 70);
    li.position.set(p[0], 4.3, p[1]);
    if (i < 1) { li.castShadow = true; li.shadow.mapSize.set(512, 512); li.shadow.bias = -0.004; li.shadow.camera.far = 40; }
    scene.add(li); torches.push({ li, fl, ph: i * 1.97 });
  });
  // ESPADA en primera persona (modelo generado) enganchada a la cámara
  try { const g = await ARC.loadGLB(MDL.sword); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(0.34 / (Math.max(s.x, s.y, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; if (o.material) o.material.envMapIntensity = .5; } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    sword = new T.Group(); sword.add(m);
    m.rotation.set(.28, -.55, .62);
    sword.add(mkArm());
    sword.position.set(.5, -.34, -.8); cam.add(sword); scene.add(cam);
  } catch (e) {
    sword = new T.Group();
    const bl = new T.Mesh(new T.BoxGeometry(.05, .8, .12), new T.MeshStandardMaterial({ color: 0xdfe6f0, metalness: .7, roughness: .3 })); bl.position.y = .4; sword.add(bl);
    const gd = new T.Mesh(new T.BoxGeometry(.26, .06, .09), new T.MeshStandardMaterial({ color: 0xd8a63a, metalness: .8, roughness: .35 })); sword.add(gd);
    sword.add(mkArm());
    sword.rotation.set(.24, 0, .34); sword.position.set(.5, -.34, -.8); cam.add(sword); scene.add(cam);
  }
  sword.visible = false;
  // plantilla de enemigo (golem generado) — envuelta en un Group apoyado en y=0
  try { const g = await ARC.loadGLB(MDL.monster); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(3.3 / (s.y || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); m.position.y -= nb.min.y;   // los pies en y=0 del padre
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
      if (o.material) { const mm = o.material; if (mm.emissive) mm.emissive.setRGB(0, 0, 0); mm.specularIntensity = 0; mm.envMapIntensity = .45; } } });
    EY = m.position.y;
    tmplEnemy = new T.Group(); tmplEnemy.add(m);
  } catch (e) {
    const cap = new T.Mesh(new T.CapsuleGeometry(.6, 1.3, 4, 8), new T.MeshStandardMaterial({ color: 0x8a4a5a, roughness: .8 }));
    cap.position.y = 1.25; cap.castShadow = true; EY = 1.25;
    tmplEnemy = new T.Group(); tmplEnemy.add(cap);
  }
  bindTouch();
  setupMenu();
}

/* antebrazo para que la espada no flote sola */
function mkArm() {
  const arm = new T.Mesh(new T.CapsuleGeometry(.043, .42, 3, 10), new T.MeshStandardMaterial({ color: 0xb98663, roughness: .75 }));
  arm.rotation.set(1.12, 0, -.24); arm.position.set(.10, -.30, -.05); arm.frustumCulled = false;
  const cuff = new T.Mesh(new T.CylinderGeometry(.047, .053, .085, 10), new T.MeshStandardMaterial({ color: 0x54391f, roughness: .85 }));
  cuff.rotation.copy(arm.rotation); cuff.position.set(.062, -.165, .035); cuff.frustumCulled = false;
  const g = new T.Group(); g.add(arm); g.add(cuff); return g;
}

const LABELS = { dif: 'DIFICULTAD' };
const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('cripta_dif') || 'normal'; } catch (e) {}
const DIF = { facil: { hp: 140, dmg: 16, ed: 7 }, normal: { hp: 110, dmg: 12, ed: 11 }, brutal: { hp: 85, dmg: 11, ed: 16 } };
function setupMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:40%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.8vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#e8c9a0;opacity:.92}' +
    '#mOpts .row{display:flex;gap:1.5vmin;flex-wrap:wrap;justify-content:center}' +
    '#mOpts .op{padding:1.4vmin 3vmin;border-radius:2.2vmin;font-size:2.4vmin;font-weight:800;color:#f4e4cf;background:rgba(0,0,0,.45);border:.4vmin solid rgba(255,220,180,.22);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#e0a33a;color:#241304;border-color:#fff;box-shadow:0 0 22px #e0a33a}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = LABELS.dif; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['facil', 'NOVATO'], ['normal', 'GUERRERO'], ['brutal', 'BRUTAL']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', ev => { ev.stopPropagation(); cfg.dif = val; try { localStorage.setItem('cripta_dif', val); } catch (e) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); });
    row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

/* ---------- colisión ---------- */
function solid(x, z) {
  for (const w of walls) {
    if (w.door && puertaOpen) continue;
    if (w.round) { if (Math.hypot(x - w.x, z - w.z) < w.r) return true; continue; }
    if (Math.abs(x - w.x) < w.rx && Math.abs(z - w.z) < w.rz) return true;
  }
  return false;
}
/* línea de vista corta: que la espada no pegue a través de columnas ni de la puerta */
function los(x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / .45));
  for (let i = 1; i < n; i++) { const t = i / n; if (solid(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
  return true;
}

function spawnWave() {
  const boss = sala % 5 === 0;
  bossAlive = boss;
  killNeed = boss ? 1 : Math.min(3 + Math.floor(sala * .6), 6);
  const d = DIF[cfg.dif] || DIF.normal;
  for (let i = 0; i < killNeed; i++) {
    const e = pool.pop() || tmplEnemy.clone(true);
    const a = Math.random() * 6.28, r = ROOM * .3 + Math.random() * 5;
    let ex = Math.cos(a) * r, ez = Math.sin(a) * r;
    if (Math.hypot(ex - px, ez - pz) < 8) { ex = -ex; ez = -ez; }
    e.scale.setScalar(boss ? 1.85 : 1);
    e.position.set(ex, 0, ez); e.visible = true;
    scene.add(e);
    enemies.push({ m: e, x: ex, z: ez, r: boss ? 1.8 : 1.0,
      hp: boss ? 90 + sala * 12 : 30 + sala * 7, atk: .6, boss,
      sp: boss ? 3.4 : 2.9 + Math.random() * .7, dmg: boss ? d.ed * 1.7 : d.ed });
  }
  ARC.toast(boss ? '☠ JEFE DE LA CRIPTA' : 'SALA ' + sala + ' · matá ' + killNeed);
}

function despawn(e) { scene.remove(e.m); pool.push(e.m); }

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; dmg = d.dmg;
  score = 0; dead = false; won = false; tPlay = 0; sala = 1; salaMax = 10; kills = 0;
  swingT = 0; atkCD = 0; hurtFlash = 0; iFrame = 0; spd = 6.2;
  // estado de entrada: si no se limpia, la partida siguiente arranca caminando sola
  keys = {}; joy = null; look = null; atkHeld = false; atkTid = -1; dbgAuto = false;
  shk = 0; shkR = 0; bobT = 0; fade = 0; fadePend = false;
  for (const e of enemies) despawn(e); enemies = [];
  puertaOpen = false; puerta.visible = true;
  playing = true; if (sword) sword.visible = true;
  place(0, ROOM * .6, Math.PI);
  spawnWave();
}

/* reubica al jugador y SNAPEA la cámara (si no, la cámara cruza la sala volando) */
function place(x, z, ya) { px = x; pz = z; yaw = ya; pitch = 0; camX = x; camZ = z; camY = CAMH; aimCam(); }

function nextSala() {
  sala++;
  if (sala > salaMax) { won = true; dead = true; playing = false;
    ARC.over({ win: true, score, title: '¡CRIPTA PURGADA!', sub: salaMax + ' salas · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; }
  const r = Math.random();
  if (r < .4) { hpMax += 12; hp = Math.min(hpMax, hp + 30); ARC.toast('+VIDA MÁXIMA'); }
  else if (r < .75) { dmg += 3; ARC.toast('+DAÑO DE ESPADA'); }
  else { spd += .5; ARC.toast('+VELOCIDAD'); }
  puertaOpen = false; puerta.visible = true;
  place(0, ROOM * .6, Math.PI);           // entrás por el sur mirando la sala nueva
  spawnWave();
}

function abrirPuerta() {
  if (puertaOpen) return;
  puertaOpen = true; puerta.visible = false;
  ARC.toast('¡SALA LIMPIA! → la puerta se abrió'); ARC.sfx('power', { vol: .6 });
}

function attack() {
  if (!playing || dead || fade > 0 || atkCD > 0) return;
  atkCD = .42; swingT = .42; ARC.sfx('swipe', { vol: .5, rate: 1.1 });
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  // candidatos: adelante (cono de ~90°), a 3.6 m, con línea de vista; máximo 3 por golpe
  const cand = [];
  for (const e of enemies) {
    const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz);
    if (d > 3.6 + e.r * .5) continue;
    if ((dx / (d || 1)) * fx + (dz / (d || 1)) * fz < .7) continue;
    if (!los(px, pz, e.x, e.z)) continue;
    cand.push({ e, d });
  }
  cand.sort((a, b) => a.d - b.d);
  const hit = cand.slice(0, 3);
  if (hit.length) { ARC.shake(3); ARC.vib(18); ARC.sfx('boom', { vol: .35, rate: 1.5 }); }
  for (const c of hit) {
    const e = c.e; e.hp -= dmg;
    ARC.fx.burst(ARC.W / 2 + 30, ARC.H / 2 + 10, '#ffd06a', 8, 4);
    if (e.hp <= 0) {
      despawn(e); e.dead = true; kills++; score += e.boss ? 400 : 60;
      ARC.fx.text(ARC.W / 2, ARC.H / 2 - 40, e.boss ? '¡JEFE CAÍDO!' : '+' + (e.boss ? 400 : 60), '#ffd06a');
      ARC.sfx('coin', { vol: .5 });
    }
  }
  if (hit.length) enemies = enemies.filter(e => !e.dead);
  bossAlive = enemies.some(e => e.boss);
  if (enemies.length === 0) abrirPuerta();
}

/* orienta la cámara (posición ya interpolada) + shake propio sobre la cámara 3D */
function aimCam() {
  cam.position.set(camX, camY, camZ);
  cam.rotation.set(0, 0, 0); cam.rotateY(yaw + Math.PI); cam.rotateX(pitch); cam.rotateZ(shkR);
}

function step(dt) {
  if (dead) return; tPlay += dt;
  if (atkCD > 0) atkCD -= dt; if (swingT > 0) swingT -= dt;
  if (hurtFlash > 0) hurtFlash -= dt; if (iFrame > 0) iFrame -= dt;
  // antorchas: dos senos desfasados (con Math.random() saltaba en vez de titilar)
  for (const t of torches) { const f = .85 + Math.sin(tPlay * 9 + t.ph) * .1 + Math.sin(tPlay * 23 + t.ph * 2) * .04;
    t.li.intensity = 7.5 * f; t.fl.scale.setScalar(.9 + f * .18); }
  // fundido de transición de sala
  if (fade > 0) { fade -= dt;
    if (fadePend && fade <= FADE / 2) { fadePend = false; nextSala(); if (dead) return; }
    if (fade < 0) fade = 0; }
  // ---- caminar ----
  let mx = 0, mz = 0;
  if (fade <= 0) {
    if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (joy) { mx += joy.dx; mz += -joy.dy; }
    if (atkHeld || keys.Space || keys.KeyJ) attack();
  }
  if (dbgAuto && fade <= 0) { // ir al enemigo más cercano (o a la puerta si está limpia)
    let tx = 0, tz = -ROOM + .4, bestD = 1e9;
    if (enemies.length) { for (const e of enemies) { const d = (e.x - px) ** 2 + (e.z - pz) ** 2; if (d < bestD) { bestD = d; tx = e.x; tz = e.z; } } }
    const ty = Math.atan2(tx - px, tz - pz); let dy = ty - yaw;
    while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
    yaw += ARC.clamp(dy, -3 * dt, 3 * dt) * 2.5; mz = 1; mx = 0;
    if (enemies.length && Math.abs(dy) < .7 && Math.sqrt(bestD) < 3.6) attack();
  }
  const ml = Math.hypot(mx, mz);
  if (ml > 0) { mx /= ml; mz /= ml;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    // derecha real de la cámara = (-fz, fx) ⇒ el strafe suma (+fx*? ) con este signo
    const wx = fx * mz - fz * mx, wz = fz * mz + fx * mx;
    const nx = px + wx * spd * dt, nz = pz + wz * spd * dt;
    if (!solid(nx, pz)) px = nx; if (!solid(px, nz)) pz = nz;
    bobT += dt * ml * spd * 1.15;
  }
  // el jugador no puede meterse DENTRO de un golem (ni la cámara)
  for (const e of enemies) {
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1, mn = e.r + .55;
    if (d < mn) { const nx = e.x + dx / d * mn, nz = e.z + dz / d * mn;
      if (!solid(nx, pz)) px = nx; if (!solid(px, nz)) pz = nz; }
  }
  // pasar de sala al cruzar la puerta abierta (con fundido, no teleport seco)
  if (puertaOpen && pz < -ROOM + 1.2 && fade <= 0) { fade = FADE; fadePend = true; }
  // ---- enemigos: se separan, persiguen y pegan ----
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; let dx = b.x - a.x, dz = b.z - a.z; const mn = a.r + b.r + .3;
      let d = Math.hypot(dx, dz);
      if (d < .001) { dx = Math.cos(i * 2.4 + j); dz = Math.sin(i * 2.4 + j); d = 1; }
      if (d < mn) { const s = (mn - d) * .5, ux = dx / d * s, uz = dz / d * s;
        if (!solid(a.x - ux, a.z - uz)) { a.x -= ux; a.z -= uz; }
        if (!solid(b.x + ux, b.z + uz)) { b.x += ux; b.z += uz; } }
    }
  }
  for (const e of enemies) {
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1;
    const stop = 1.1 + e.r;
    if (d > stop) { const nx = e.x + dx / d * e.sp * dt, nz = e.z + dz / d * e.sp * dt;
      if (!solid(nx, e.z)) e.x = nx; if (!solid(e.x, nz)) e.z = nz; }
    e.m.position.set(e.x, 0, e.z);   // el offset de apoyo vive en el hijo del Group
    e.m.rotation.y = Math.atan2(dx, dz);
    e.atk -= dt;
    if (d < 1.5 + e.r && e.atk <= 0 && iFrame <= 0 && fade <= 0) {
      e.atk = 1.25; iFrame = .45; hp -= e.dmg; hurtFlash = .35;
      shk = Math.max(shk, .42); ARC.shake(3); ARC.vib(40); ARC.sfx('hurt', { vol: .5 });
      if (hp <= 0) { hp = 0; dead = true; playing = false;
        ARC.over({ win: false, score, title: 'CAÍSTE', sub: 'sala ' + sala + ' · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; }
    }
  }
  // ---- cámara primera persona: posición INTERPOLADA + shake real ----
  const k = 1 - Math.exp(-17 * dt);
  camX += (px - camX) * k; camZ += (pz - camZ) * k;
  const bob = Math.sin(bobT * 6.1) * .045 + Math.sin(bobT * 12.2) * .012;
  let ty = CAMH + bob;
  if (shk > 0) { shk = Math.max(0, shk - dt * 2.6);
    const s = shk * shk * .5;
    ty += (Math.random() * 2 - 1) * s; camX += (Math.random() * 2 - 1) * s * .6; camZ += (Math.random() * 2 - 1) * s * .6;
    shkR = (Math.random() * 2 - 1) * shk * .035;
  } else shkR *= .85;
  camY += (ty - camY) * Math.min(1, k * 1.6);
  aimCam();
  // swing de espada (parte del rincón y barre hacia el centro)
  if (sword) { const s = swingT > 0 ? Math.sin((1 - swingT / .42) * Math.PI) : 0;
    sword.position.set(.5 - s * .32, -.34 + s * .16, -.8 + s * .06);
    sword.rotation.set(-s * 1.35, s * .35, s * .8); }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  if (hurtFlash > 0) { g.fillStyle = 'rgba(190,20,40,' + (hurtFlash * .7).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  // mira
  g.strokeStyle = 'rgba(255,235,200,.75)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 9, H / 2); g.lineTo(W / 2 - 3, H / 2); g.moveTo(W / 2 + 3, H / 2); g.lineTo(W / 2 + 9, H / 2);
  g.moveTo(W / 2, H / 2 - 9); g.lineTo(W / 2, H / 2 - 3); g.moveTo(W / 2, H / 2 + 3); g.lineTo(W / 2, H / 2 + 9); g.stroke();
  // vida
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, H - 58, 250, 22);
  g.fillStyle = hp / hpMax > .35 ? '#4fd97a' : '#ff5470'; g.fillRect(24, H - 56, 246 * Math.max(0, hp / hpMax), 18);
  g.fillStyle = '#fff'; g.font = '900 15px system-ui'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('♥ ' + Math.ceil(hp) + '/' + hpMax, 30, H - 41);
  // sala / objetivo
  g.font = '900 22px system-ui'; g.fillStyle = '#ffd89a'; g.fillText('SALA ' + sala + '/' + salaMax, 24, 40);
  g.font = '900 15px system-ui'; g.fillStyle = enemies.length ? '#ffb0b0' : '#9cffbe';
  g.fillText(enemies.length ? (bossAlive ? '☠ JEFE VIVO' : 'quedan ' + enemies.length) : '¡puerta abierta! ↑ avanzá', 24, 62);
  g.textAlign = 'right'; g.font = '900 22px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 66, 40);
  // joystick: dibujado DONDE está el dedo
  const jx = joy ? joy.x0 : JX, jy = joy ? joy.y0 : H - JY;
  g.strokeStyle = 'rgba(255,255,255,' + (joy ? .5 : .3) + ')'; g.lineWidth = 3;
  g.beginPath(); g.arc(jx, jy, JR, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(255,235,200,' + (joy ? .42 : .26) + ')'; g.beginPath();
  g.arc(jx + (joy ? joy.dx * JD : 0), jy + (joy ? joy.dy * JD : 0), JK, 0, 6.28); g.fill();
  // botón atacar (mismo radio que la zona de toque)
  const ax = W - AX, ay = H - AY;
  g.fillStyle = atkCD > 0 ? 'rgba(90,70,40,.6)' : 'rgba(224,163,58,.85)';
  g.beginPath(); g.arc(ax, ay, AR, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#241304'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', ax, ay + 1);
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
  // fundido de sala
  if (fade > 0) { const a = Math.max(0, 1 - Math.abs(1 - fade / (FADE / 2)));
    g.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')'; g.fillRect(0, 0, W, H);
    if (a > .5) { g.fillStyle = 'rgba(255,216,154,' + ((a - .5) * 1.6).toFixed(3) + ')'; g.font = '900 30px system-ui'; g.textAlign = 'center';
      g.fillText('SALA ' + (fadePend ? sala + 1 : sala), W / 2, H / 2); } }
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .35;
  if (sword) sword.visible = false;
  if (cam) { cam.position.set(Math.cos(menuA) * 12, 3.4, Math.sin(menuA) * 12);
    cam.rotation.set(0, 0, 0); cam.rotateY(Math.atan2(-cam.position.x, -cam.position.z)); }
  for (const t of torches) { t.li.intensity = 7.5 * (.85 + Math.sin(menuA * 8 + t.ph) * .15); }
}

/* ---- entrada ------------------------------------------------------------
   Táctil: listeners propios con identifier ⇒ caminar + mirar + atacar a la vez.
   Mouse: los callbacks del shell (que ignoran los eventos táctiles).        */
function inGame() {
  if (!playing || dead) return false;
  try { if (window.__ARC && window.__ARC.state() !== 'game') return false; } catch (e) {}
  return true;
}
function toLog(cx0, cy0) {
  const vw = innerWidth, vh = innerHeight, rot = vh > vw;
  const S = (rot ? Math.min(vh / ARC.W, vw / ARC.H) : Math.min(vw / ARC.W, vh / ARC.H)) || 1;
  const dx = cx0 - vw / 2, dy = cy0 - vh / 2;
  const lx = rot ? dy / S : dx / S, ly = rot ? -dx / S : dy / S;
  return { x: lx + ARC.W / 2, y: ly + ARC.H / 2, s: S, rot };
}
const hitPause = p => p.x > ARC.W - 60 && p.y < 56;
const hitAtk = p => Math.hypot(p.x - (ARC.W - AX), p.y - (ARC.H - AY)) < AR;
const hitJoy = p => p.x < ARC.W * .46 && p.y > ARC.H * .3;

function bindTouch() {
  const st = document.getElementById('stage') || document.body;
  st.addEventListener('touchstart', e => {
    touchAct = true; if (!inGame()) return; e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i];
      const p = toLog(t.clientX, t.clientY);
      if (hitPause(p)) { window.ARC_pause(); continue; }
      if (hitAtk(p)) { atkHeld = true; atkTid = t.identifier; attack(); continue; }
      if (!joy && hitJoy(p)) { joy = { id: t.identifier, x0: p.x, y0: p.y, dx: 0, dy: 0 }; continue; }
      if (!look) look = { id: t.identifier, x: p.x, y: p.y };
    }
  }, { passive: false });
  st.addEventListener('touchmove', e => {
    touchAct = true; if (!inGame()) return; e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i];
      const p = toLog(t.clientX, t.clientY);
      if (joy && joy.id === t.identifier) { joy.dx = ARC.clamp((p.x - joy.x0) / 55, -1, 1); joy.dy = ARC.clamp((p.y - joy.y0) / 55, -1, 1); continue; }
      if (look && look.id === t.identifier) {
        yaw -= (p.x - look.x) * LOOK_T; pitch = ARC.clamp(pitch - (p.y - look.y) * PIT_T, -.85, .85);
        look.x = p.x; look.y = p.y;
      }
    }
  }, { passive: false });
  const end = e => { touchAct = true;
    for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i];
      if (joy && joy.id === t.identifier) joy = null;
      if (look && look.id === t.identifier) look = null;
      if (atkTid === t.identifier) { atkHeld = false; atkTid = -1; }
    } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
}

function down(p, e) {
  if (e && e.touches) return;                 // el táctil lo maneja bindTouch()
  if (!inGame()) return;
  if (hitPause(p)) { window.ARC_pause(); return; }
  if (hitAtk(p)) { atkHeld = true; attack(); return; }
  if (hitJoy(p)) { joy = { id: 'm', x0: p.x, y0: p.y, dx: 0, dy: 0 }; return; }
  look = { id: 'm', x: p.x, y: p.y };
}
function move(p, e) {
  if (e && e.touches) return;
  if (joy && joy.id === 'm') { joy.dx = ARC.clamp((p.x - joy.x0) / 55, -1, 1); joy.dy = ARC.clamp((p.y - joy.y0) / 55, -1, 1); }
  // la mirada la aplica lookFn (una SOLA fuente de yaw/pitch)
}
function up(p, e) {
  if (e && e.touches) return;
  joy = null; look = null; atkHeld = false;
}
/* única fuente de rotación por arrastre de mouse: no dispara con el joystick */
function lookFn(dx, dy) {
  if (touchAct || joy || atkHeld || !inGame()) return;
  yaw -= dx * LOOK_M; pitch = ARC.clamp(pitch - dy * PIT_M, -.85, .85);
}
function key(code, dn) {
  if (!inGame()) { if (dn) keys = {}; return; }
  keys[code] = dn;
  if (code === 'Escape' && dn) { window.ARC_pause(); return; }
  if (dn && (code === 'Space' || code === 'KeyJ')) attack();
}

return {
  slug: 'cripta', name: 'CRIPTA', sub: 'roguelike de mazmorra', acc: '#e0a33a', three: true, sky: '#0a0810', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look: lookFn, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), sala, kills, enemies: enemies.length, puerta: puertaOpen, dead, won,
      x: Math.round(px), z: Math.round(pz), t: +(tPlay || 0).toFixed(1),
      yaw: +yaw.toFixed(3), pitch: +pitch.toFixed(3), cy: +camY.toFixed(2) }),
    autoPlay() { dbgAuto = true; },
    minDist() { let m = 99; for (const e of enemies) m = Math.min(m, Math.hypot(px - e.x, pz - e.z) - e.r); return m; },
    tp(x, z) { place(x, z, yaw); },
    matar() { for (const e of enemies) { despawn(e); e.dead = true; kills++; } enemies = []; bossAlive = false; abrirPuerta(); }
  }
};
})();

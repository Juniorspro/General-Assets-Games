/* ===== CRIPTA — roguelike en primera persona =============================
   Bajás por salas de una cripta: matá a todos los golems y se abre la puerta
   a la siguiente sala. Espada 3D en mano, antorchas con luz y SOMBRAS en
   tiempo real, oleadas, jefe cada 5 salas, mejoras al subir de sala.
   Controles: joystick izq = caminar · arrastrar der = mirar · ATACAR. */
window.GAME = (function () {
let T, scene, cam, ren;
let px, pz, yaw, pitch, hp, hpMax, score, dead, won, tPlay;
let sala, salaMax, kills, killNeed, puerta = null, puertaOpen, bossAlive;
let sword = null, swingT = 0, atkCD = 0, dmg = 12, spd = 6.2;
let enemies = [], tmplEnemy = null, walls = [], torches = [];
let keys = {}, joy = null, look = null, atkHeld = false, hurtFlash = 0;
let dbgAuto = false;

const ROOM = 26, WALLH = 7;

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  scene.background = new T.Color(0x0a0810);
  scene.fog = new T.Fog(0x171226, 16, 72);
  scene.add(new T.HemisphereLight(0x9fb0d8, 0x3a2c40, 1.5));
  scene.add(new T.AmbientLight(0xbfd0f0, .85));
  ren.toneMappingExposure = 1.75;
  const tl = new T.TextureLoader();
  const rep = (u, n, m) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, m || n); t.colorSpace = T.SRGBColorSpace; return t; };
  const matWall = new T.MeshStandardMaterial({ map: rep(TEX.wall, 4, 2), roughness: .9, color: 0xe8e2f0 });
  const matFloor = new T.MeshStandardMaterial({ map: rep(TEX.floor, 7), roughness: .92, color: 0xd8d2e0 });
  // piso + techo
  const floor = new T.Mesh(new T.PlaneGeometry(ROOM * 2, ROOM * 2), matFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(ROOM * 2, ROOM * 2), new T.MeshStandardMaterial({ map: rep(TEX.wall, 6), roughness: 1, color: 0x4a4652 }));
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
  puerta = new T.Mesh(new T.BoxGeometry(12, WALLH, 1.4), new T.MeshStandardMaterial({ map: rep(TEX.wall, 2, 1), color: 0x6a5a44, roughness: .9, emissive: 0x120a04, emissiveIntensity: 1 }));
  puerta.position.set(0, WALLH / 2, -R); puerta.castShadow = true; scene.add(puerta);
  walls.push({ x: 0, z: -R, rx: 6.4, rz: 1.15, door: true });
  // columnas
  for (const s of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const c = new T.Mesh(new T.CylinderGeometry(1.1, 1.3, WALLH, 10), matWall);
    c.position.set(s[0] * R * .5, WALLH / 2, s[1] * R * .5); c.castShadow = true; c.receiveShadow = true; scene.add(c);
    walls.push({ x: c.position.x, z: c.position.z, rx: 1.7, rz: 1.7 });
  }
  // ANTORCHAS con luz + sombra (2 castean, el resto solo iluminan: perf)
  torches = [];
  const tp = [[-R + 3, -R + 6], [R - 3, -R + 6], [-R + 3, R - 6], [R - 3, R - 6]];
  tp.forEach((p, i) => {
    const holder = new T.Mesh(new T.CylinderGeometry(.12, .16, 1.5, 6), new T.MeshStandardMaterial({ color: 0x3a3038, roughness: .9 }));
    holder.position.set(p[0], 3, p[1]); scene.add(holder);
    const fl = new T.Mesh(new T.ConeGeometry(.28, .7, 7), new T.MeshBasicMaterial({ color: 0xffa646 }));
    fl.position.set(p[0], 4.1, p[1]); scene.add(fl);
    const li = new T.PointLight(0xffb060, 5.5, 60);
    li.position.set(p[0], 4.3, p[1]);
    if (i < 2) { li.castShadow = true; li.shadow.mapSize.set(512, 512); li.shadow.bias = -0.004; li.shadow.camera.far = 40; }
    scene.add(li); torches.push({ li, fl, ph: Math.random() * 6.28 });
  });
  // ESPADA en primera persona (modelo generado) enganchada a la cámara
  try { const g = await ARC.loadGLB(MDL.sword); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(0.34 / (Math.max(s.x, s.y, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; if (o.material) o.material.envMapIntensity = .5; } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    sword = new T.Group(); sword.add(m);
    m.rotation.set(.15, -.4, .35);
    sword.position.set(.3, -.26, -.85); cam.add(sword); scene.add(cam);
  } catch (e) {
    sword = new T.Group();
    const bl = new T.Mesh(new T.BoxGeometry(.06, .9, .14), new T.MeshStandardMaterial({ color: 0xdfe6f0, metalness: .7, roughness: .3 })); bl.position.y = .45; sword.add(bl);
    const gd = new T.Mesh(new T.BoxGeometry(.3, .07, .1), new T.MeshStandardMaterial({ color: 0xd8a63a, metalness: .8, roughness: .35 })); sword.add(gd);
    sword.rotation.set(.2, 0, .3); sword.position.set(.42, -.5, -.75); cam.add(sword); scene.add(cam);
  }
  // plantilla de enemigo (golem generado)
  try { const g = await ARC.loadGLB(MDL.monster); tmplEnemy = g.scene;
    const b = new T.Box3().setFromObject(tmplEnemy); const s = b.getSize(new T.Vector3());
    tmplEnemy.scale.setScalar(3.3 / (s.y || 1)); tmplEnemy.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(tmplEnemy); tmplEnemy.position.y -= nb.min.y;
    tmplEnemy.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  } catch (e) {
    tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.6, 1.3, 4, 8), new T.MeshStandardMaterial({ color: 0x8a4a5a, roughness: .8 }));
    tmplEnemy.position.y = 1.2; tmplEnemy.castShadow = true;
  }
  joy = LIFE ? null : null;
  setupMenu();
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

function solid(x, z) { for (const w of walls) { if (w.door && puertaOpen) continue;
    if (Math.abs(x - w.x) < w.rx && Math.abs(z - w.z) < w.rz) return true; } return false; }

function spawnWave() {
  const boss = sala % 5 === 0;
  bossAlive = boss;
  killNeed = boss ? 1 : Math.min(3 + Math.floor(sala * .8), 8);
  for (let i = 0; i < killNeed; i++) {
    const e = tmplEnemy.clone(true);
    const a = Math.random() * 6.28, r = ROOM * .55 + Math.random() * 6;
    let ex = Math.cos(a) * r, ez = Math.sin(a) * r;
    if (Math.hypot(ex - px, ez - pz) < 12) { ex = -ex; ez = -ez; }
    e.position.set(ex, 0, ez);
    if (boss) e.scale.multiplyScalar(1.85);
    scene.add(e);
    const d = DIF[cfg.dif] || DIF.normal;
    enemies.push({ m: e, x: ex, z: ez, hp: boss ? 90 + sala * 12 : 26 + sala * 6, atk: 0, boss, sp: boss ? 2.5 : 2.9 + Math.random() * .7, dmg: boss ? d.ed * 1.8 : d.ed });
  }
  ARC.toast(boss ? '☠ JEFE DE LA CRIPTA' : 'SALA ' + sala + ' · matá ' + killNeed);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; dmg = d.dmg;
  px = 0; pz = ROOM * .6; yaw = Math.PI; pitch = 0;
  score = 0; dead = false; won = false; tPlay = 0; sala = 1; salaMax = 10; kills = 0;
  swingT = 0; atkCD = 0; hurtFlash = 0; spd = 6.2;
  for (const e of enemies) scene.remove(e.m); enemies = [];
  puertaOpen = false; puerta.visible = true;
  spawnWave();
}

function nextSala() {
  sala++;
  if (sala > salaMax) { won = true; dead = true;
    ARC.over({ win: true, score, title: '¡CRIPTA PURGADA!', sub: salaMax + ' salas · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; }
  // recompensa al pasar de sala
  const r = Math.random();
  if (r < .4) { hpMax += 12; hp = Math.min(hpMax, hp + 30); ARC.toast('+VIDA MÁXIMA'); }
  else if (r < .75) { dmg += 3; ARC.toast('+DAÑO DE ESPADA'); }
  else { spd += .5; ARC.toast('+VELOCIDAD'); }
  px = 0; pz = ROOM * .6; puertaOpen = false; puerta.visible = true;
  spawnWave();
}

function attack() {
  if (atkCD > 0 || dead) return;
  atkCD = .42; swingT = .42; ARC.sfx('swipe', { vol: .5, rate: 1.1 });
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (const e of enemies) {
    const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz);
    if (d > 3.6) continue;
    const dot = (dx / (d || 1)) * fx + (dz / (d || 1)) * fz;
    if (dot < .35) continue;                       // tiene que estar adelante
    e.hp -= dmg; ARC.shake(3); ARC.vib(18);
    ARC.fx.burst(ARC.W / 2 + 40, ARC.H / 2, '#ffd06a', 8, 4);
    ARC.sfx('boom', { vol: .35, rate: 1.5 });
    if (e.hp <= 0) {
      scene.remove(e.m); e.dead = true; kills++; score += e.boss ? 400 : 60;
      ARC.fx.text(ARC.W / 2, ARC.H / 2 - 40, e.boss ? '¡JEFE CAÍDO!' : '+' + (e.boss ? 400 : 60), '#ffd06a');
      ARC.sfx('coin', { vol: .5 });
    }
  }
  enemies = enemies.filter(e => !e.dead);
  if (enemies.length === 0 && !puertaOpen) {
    puertaOpen = true; puerta.visible = false;
    ARC.toast('¡SALA LIMPIA! → la puerta se abrió'); ARC.sfx('power', { vol: .6 });
  }
}

function step(dt) {
  if (dead) return; tPlay += dt;
  if (atkCD > 0) atkCD -= dt; if (swingT > 0) swingT -= dt; if (hurtFlash > 0) hurtFlash -= dt;
  // antorchas titilan
  for (const t of torches) { const f = .8 + Math.sin(tPlay * 9 + t.ph) * .12 + Math.random() * .06;
    t.li.intensity = 5.5 * f; t.fl.scale.setScalar(.9 + f * .18); }
  // caminar
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (joy) { mx += joy.dx; mz += -joy.dy; }
  if (dbgAuto) { // ir al enemigo más cercano (o a la puerta si está limpia)
    let tx = 0, tz = -ROOM + 2, bestD = 1e9;
    if (enemies.length) { for (const e of enemies) { const d = (e.x - px) ** 2 + (e.z - pz) ** 2; if (d < bestD) { bestD = d; tx = e.x; tz = e.z; } } }
    const ty = Math.atan2(tx - px, tz - pz); let dy = ty - yaw;
    while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
    yaw += ARC.clamp(dy, -3 * dt, 3 * dt) * 2.5; mz = 1; mx = 0;
    if (enemies.length && Math.sqrt(bestD) < 3.4) attack();   // pega al MÁS CERCANO
  }
  const ml = Math.hypot(mx, mz);
  if (ml > 0) { mx /= ml; mz /= ml;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const wx = fx * mz + fz * mx, wz = fz * mz - fx * mx;
    const nx = px + wx * spd * dt, nz = pz + wz * spd * dt;
    if (!solid(nx, pz)) px = nx; if (!solid(px, nz)) pz = nz;
  }
  // pasar de sala al cruzar la puerta abierta
  if (puertaOpen && pz < -ROOM + .6) { nextSala(); return; }
  // enemigos: persiguen y pegan
  for (const e of enemies) {
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1;
    if (d > 2.1) { const nx = e.x + dx / d * e.sp * dt, nz = e.z + dz / d * e.sp * dt;
      if (!solid(nx, e.z)) e.x = nx; if (!solid(e.x, nz)) e.z = nz; }
    e.m.position.set(e.x, 0, e.z);
    e.m.rotation.y = Math.atan2(dx, dz);
    e.atk -= dt;
    if (d < 2.5 && e.atk <= 0) { e.atk = 1.25; hp -= e.dmg; hurtFlash = .35; ARC.shake(6); ARC.vib(40); ARC.sfx('hurt', { vol: .5 });
      if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'CAÍSTE', sub: 'sala ' + sala + ' · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; } }
  }
  // cámara primera persona
  cam.position.set(px, 2.6, pz);
  cam.rotation.set(0, 0, 0); cam.rotateY(yaw + Math.PI); cam.rotateX(pitch);
  // swing de espada
  if (sword) { const s = swingT > 0 ? Math.sin((1 - swingT / .42) * Math.PI) : 0;
    sword.position.set(.3 - s * .22, -.26 + s * .18, -.85 - s * .2);
    sword.rotation.set(-s * 1.5, 0, s * .7); }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  if (hurtFlash > 0) { g.fillStyle = 'rgba(190,20,40,' + (hurtFlash * .7).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  // mira
  g.strokeStyle = 'rgba(255,235,200,.75)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 9, H / 2); g.lineTo(W / 2 - 3, H / 2); g.moveTo(W / 2 + 3, H / 2); g.lineTo(W / 2 + 9, H / 2);
  g.moveTo(W / 2, H / 2 - 9); g.lineTo(W / 2, H / 2 - 3); g.moveTo(W / 2, H / 2 + 3); g.lineTo(W / 2, H / 2 + 9); g.stroke();
  // vida
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, H - 46, 250, 22);
  g.fillStyle = hp / hpMax > .35 ? '#4fd97a' : '#ff5470'; g.fillRect(24, H - 44, 246 * Math.max(0, hp / hpMax), 18);
  g.fillStyle = '#fff'; g.font = '900 15px system-ui'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('♥ ' + Math.ceil(hp) + '/' + hpMax, 30, H - 29);
  // sala / objetivo
  g.font = '900 22px system-ui'; g.fillStyle = '#ffd89a'; g.fillText('SALA ' + sala + '/' + salaMax, 24, 40);
  g.font = '900 15px system-ui'; g.fillStyle = enemies.length ? '#ffb0b0' : '#9cffbe';
  g.fillText(enemies.length ? (bossAlive ? '☠ JEFE VIVO' : 'quedan ' + enemies.length) : '¡puerta abierta! ↑ avanzá', 24, 62);
  g.textAlign = 'right'; g.font = '900 22px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 66, 40);
  // joystick
  const jx = 108, jy = H - 108;
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(jx, jy, 62, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(255,235,200,.3)'; g.beginPath();
  g.arc(jx + (joy ? joy.dx * 40 : 0), jy + (joy ? joy.dy * 40 : 0), 26, 0, 6.28); g.fill();
  // botón atacar
  const ax = W - 96, ay = H - 100;
  g.fillStyle = atkCD > 0 ? 'rgba(90,70,40,.6)' : 'rgba(224,163,58,.85)';
  g.beginPath(); g.arc(ax, ay, 52, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#241304'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', ax, ay + 1);
  g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .35;
  if (cam) { cam.position.set(Math.cos(menuA) * 12, 3.4, Math.sin(menuA) * 12);
    cam.rotation.set(0, 0, 0); cam.rotateY(Math.atan2(-cam.position.x, -cam.position.z)); }
  for (const t of torches) { t.li.intensity = 5.5 * (.85 + Math.sin(menuA * 8 + t.ph) * .15); }
}

/* ---- entrada táctil: izq = joystick, der = mirar, botón = atacar ---- */
function down(p) {
  if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (Math.hypot(p.x - (ARC.W - 96), p.y - (ARC.H - 100)) < 62) { atkHeld = true; attack(); return; }
  if (p.x < ARC.W * .42) { joy = { x0: p.x, y0: p.y, dx: 0, dy: 0 }; return; }
  look = { x: p.x, y: p.y };
}
function move(p) {
  if (joy) { joy.dx = ARC.clamp((p.x - joy.x0) / 55, -1, 1); joy.dy = ARC.clamp((p.y - joy.y0) / 55, -1, 1); return; }
  if (look) { yaw -= (p.x - look.x) * .006; pitch = ARC.clamp(pitch - (p.y - look.y) * .005, -.9, .9); look = { x: p.x, y: p.y }; }
}
function up() { joy = null; look = null; atkHeld = false; }
function lookFn(dx, dy) { yaw -= dx * .0032; pitch = ARC.clamp(pitch - dy * .0028, -.9, .9); }
function key(code, dn) { keys[code] = dn;
  if (dn && (code === 'Space' || code === 'KeyJ' || code === 'Enter')) attack();
  if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'cripta', name: 'CRIPTA', sub: 'roguelike de mazmorra', acc: '#e0a33a', three: true, sky: '#0a0810', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look: lookFn, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), sala, kills, enemies: enemies.length, puerta: puertaOpen, dead, won }),
    autoPlay() { dbgAuto = true; },
    tp(x, z) { px = x; pz = z; },
    matar() { for (const e of enemies) { scene.remove(e.m); e.dead = true; kills++; } enemies = [];
      if (!puertaOpen) { puertaOpen = true; puerta.visible = false; } }
  }
};
})();

/* ===== ARENA — supervivencia por oleadas ==================================
   Tercera persona en una arena de piedra: aguantá oleadas de esqueletos con la
   espada. Cada oleada suma enemigos; entre oleadas te curás un poco.
   Controles: joystick abajo-izq = mover (relativo a la cámara) · ATACAR (der)
              arrastrar en el resto de la pantalla = girar la cámara · Q/E también.
   NOTAS DE DISEÑO (no romper):
   · La cámara tiene su PROPIO yaw (camYaw) interpolado por el camino corto; el
     personaje gira con `yaw` (dirección de movimiento). Nunca se atan.
   · La cámara se queda SIEMPRE dentro del radio CAMR (< muro) acortando la
     distancia con la solución exacta de |P - D·cd| = CAMR, así no atraviesa el
     muro ni sale del piso.
   · El táctil lo maneja este archivo por `identifier` (shell.js pt() usa
     touches[0] y mezcla los dedos): joystick + ATACAR + cámara a la vez.
============================================================================ */
window.GAME = (function () {
let T, scene, cam, ren, sun;
let ch = null, hero = null, shadow = null, sword = null;
let px, pz, yaw, hp, hpMax, score, wave, kills, dead, won, tPlay, atkCD, atkAnim, dmg;
let camYaw = 0, camT = null, tDrag = 9, camSnap = true, mvL = 0;
let keys = {}, enemies = [], tmplEnemy = null, EY = 0, hurtFlash = 0, dbgAuto = false;
let torches = [], maxAtk = 3, hitDir = 0, hitDirT = 0, running = false;
let _v1 = null, _v2 = null;

const LW = 960, LH = 540;                 // espacio lógico del shell
const R = 30, WR = 34, PR = 26.5, CAMR = 31.5, WAVES = 6;
const SPD = 6.4, REACH = 3.4, CD0 = 8.6, CH0 = 4.5;
const SEPP = 1.85, SEPE = 1.7;            // separación jugador/enemigo y enemigo/enemigo
const BX = LW - 96, BY = LH - 100;        // botón ATACAR
const norm = a => { while (a > Math.PI) a -= 6.283185; while (a < -Math.PI) a += 6.283185; return a; };

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('arena_dif') || 'normal'; } catch (e) {}
const DIF = {
  facil:  { hp: 165, dmg: 30, ed: 7,  n: 3, sp: 2.1, maxatk: 2 },
  normal: { hp: 135, dmg: 24, ed: 10, n: 4, sp: 2.4, maxatk: 3 },
  brutal: { hp: 110, dmg: 20, ed: 13, n: 5, sp: 2.7, maxatk: 3 }
};

/* ---------------------------------------------------------------- escena --- */
async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  _v1 = new T.Vector3(); _v2 = new T.Vector3(); camT = new T.Vector3();
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping;
  sky.colorSpace = T.SRGBColorSpace; sky.wrapS = T.RepeatWrapping;
  scene.background = sky; scene.environment = sky;
  // niebla suave de verdad: la arena entera cabe en radio 36, el muro lejano está a ~65
  scene.fog = new T.Fog(0x2a2438, 46, 135);
  scene.add(new T.HemisphereLight(0xffdcc0, 0x4a3c58, 1.15));
  scene.add(new T.AmbientLight(0xffffff, .38));
  sun = new T.DirectionalLight(0xffe8c0, 2.35); sun.position.set(20, 60, 20);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -42; c.right = 42; c.top = 42; c.bottom = -42; c.near = 1; c.far = 140; sun.shadow.bias = -0.0008; }
  scene.add(sun); ren.toneMappingExposure = 1.26;
  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  // piso circular
  const floor = new T.Mesh(new T.CircleGeometry(R + 6, 48), new T.MeshStandardMaterial({ map: rep(TEX.floor, 10), roughness: .95, color: 0xa8a0b6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // círculo de combate marcado en el piso (referencia de dónde te clampea)
  const ringM = new T.MeshBasicMaterial({ color: 0x6a5a86, transparent: true, opacity: .5 });
  const ring = new T.Mesh(new T.RingGeometry(PR - .18, PR + .18, 72), ringM);
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03; scene.add(ring);
  // muro perimetral (bajo: 4.6 de alto, la cámara nunca lo cruza)
  const wm = new T.MeshStandardMaterial({ map: rep(TEX.wall, 3), roughness: .9, color: 0xcfc6dc });
  for (let i = 0; i < 34; i++) { const a = i / 34 * 6.283;
    const b = new T.Mesh(new T.BoxGeometry(6.3, 4.6, 2), wm);
    b.position.set(Math.cos(a) * WR, 2.3, Math.sin(a) * WR); b.rotation.y = -a + Math.PI / 2;
    b.castShadow = true; b.receiveShadow = true; scene.add(b); }
  // antorchas montadas: poste + llama + luz (parpadean)
  const postM = new T.MeshStandardMaterial({ color: 0x3a2f28, roughness: .85 });
  const flamM = new T.MeshBasicMaterial({ color: 0xffa646 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, rr = WR - 1.4;
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr;
    const po = new T.Mesh(new T.CylinderGeometry(.13, .19, 3.4, 7), postM);
    po.position.set(cx, 1.7, cz); po.castShadow = true; scene.add(po);
    const cup = new T.Mesh(new T.CylinderGeometry(.34, .16, .42, 8), postM);
    cup.position.set(cx, 3.55, cz); scene.add(cup);
    const fl = new T.Mesh(new T.ConeGeometry(.26, .8, 7), flamM);
    fl.position.set(cx, 4.05, cz); scene.add(fl);
    const li = new T.PointLight(0xffb060, 5.5, 44); li.position.set(cx, 4.3, cz); scene.add(li);
    torches.push({ li, fl, ph: i * 1.7, b: 5.5 }); }

  // ---- HÉROE: CHAR.load (arregla char.glb blanco/negro + mixer + huesos) ----
  try {
    ch = await CHAR.load(T, { url: MDL.hero, alto: 2, clips: { idle: MDL.aIdle, run: MDL.aRun, bat: MDL.aBat } });
    hero = ch.root; hero.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(hero); ch.play('idle', 0);
    sword = await equipSword();
  } catch (e) {
    hero = new T.Group();
    const b2 = new T.Mesh(new T.CapsuleGeometry(.42, 1.1, 4, 10), new T.MeshStandardMaterial({ color: 0x4a7fd0, roughness: .7 }));
    b2.position.y = 1.05; b2.castShadow = true; hero.add(b2); scene.add(hero);
  }
  // sombra de contacto: mesh aparte (hero está escalado, un hijo heredaría la escala)
  shadow = new T.Mesh(new T.CircleGeometry(.62, 20), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .34 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .025; scene.add(shadow);

  // ---- ENEMIGO: plantilla envuelta en Group (el Group se mueve, la malla
  //      guarda el apoyo en el piso; si no, los clones quedan enterrados) ----
  try { const g = await ARC.loadGLB(MDL.enemy); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(2.25 / (s.y || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); const c2 = nb.getCenter(new T.Vector3());
    m.position.x -= c2.x; m.position.z -= c2.z; m.position.y -= nb.min.y;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
      if (o.material) { const mm = o.material; mm.metalness = 0;
        if (mm.emissive && !mm.emissiveMap) mm.emissive.setRGB(0, 0, 0);
        if ('specularIntensity' in mm) mm.specularIntensity = 0; mm.envMapIntensity = .45; } } });
    EY = m.position.y; tmplEnemy = new T.Group(); tmplEnemy.add(m);
  } catch (e) {
    const cap = new T.Mesh(new T.CapsuleGeometry(.5, 1.2, 4, 8), new T.MeshStandardMaterial({ color: 0xc04a5a, roughness: .8 }));
    cap.position.y = 1.1; cap.castShadow = true; EY = 1.1;
    tmplEnemy = new T.Group(); tmplEnemy.add(cap);
  }
  bindTouch();
  mkMenu();
}

/* espada en el hueso de la mano derecha (no colgada del torso) */
async function equipSword() {
  const bone = ch.bones.rHand || ch.bones.rFore; if (!bone) return null;
  const g = await ARC.loadGLB(MDL.sword); const m = g.scene;
  m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
    if (o.material) { o.material.metalness = .35; o.material.roughness = .45; o.material.envMapIntensity = .6; } } });
  m.updateWorldMatrix(true, true);
  let bb = new T.Box3().setFromObject(m); let s = bb.getSize(new T.Vector3());
  m.scale.setScalar(1.35 / (Math.max(s.x, s.y, s.z) || 1));
  m.updateWorldMatrix(true, true);
  bb = new T.Box3().setFromObject(m); s = bb.getSize(new T.Vector3());
  // el eje largo del modelo pasa a +Y y el mango al origen
  if (s.x >= s.y && s.x >= s.z) m.rotation.z = Math.PI / 2;
  else if (s.z >= s.y) m.rotation.x = -Math.PI / 2;
  m.updateWorldMatrix(true, true);
  bb = new T.Box3().setFromObject(m); const c = bb.getCenter(new T.Vector3());
  m.position.x -= c.x; m.position.z -= c.z; m.position.y -= bb.min.y + .12;
  const grp = new T.Group(); grp.add(m);
  bone.updateWorldMatrix(true, false);
  const v = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
  bone.matrixWorld.decompose(v, q, sc);
  const k = 1 / Math.max(.0001, sc.x);
  grp.scale.set(k, k, k); grp.rotation.set(-Math.PI / 2, 0, 0);   // igual que el bate de NUDILLOS
  bone.add(grp);
  return grp;
}

function mkMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#e8d0ff}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#f4ecff;background:rgba(0,0,0,.42);border:.4vmin solid rgba(220,200,255,.25);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#b48aff;color:#1a0c2a;border-color:#fff;box-shadow:0 0 20px #b48aff}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['facil', 'NOVATO'], ['normal', 'GLADIADOR'], ['brutal', 'CAMPEÓN']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('arena_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

/* ------------------------------------------------- controles (multitáctil) - */
const IN = { joy: null, cam: null, atk: false };
const roles = {};
function zoneOf(p) {
  if (p.x > LW - 62 && p.y < 58) return 'P';                       // pausa
  if (Math.hypot(p.x - BX, p.y - BY) < 66) return 'B';             // atacar
  if (p.x < 250 && p.y > LH - 250) return 'J';                     // joystick (esquina)
  return 'C';                                                       // cámara
}
function ptDown(id, p) {
  if (!running) return;
  const z = zoneOf(p);
  if (z === 'P') { window.ARC_pause(); return; }
  roles[id] = z;
  if (z === 'B') { IN.atk = true; return; }
  if (z === 'J') { IN.joy = { x0: ARC.clamp(p.x, 72, 248), y0: ARC.clamp(p.y, LH - 248, LH - 72), dx: 0, dy: 0 }; return; }
  IN.cam = { x: p.x, y: p.y };
}
function ptMove(id, p) {
  const r = roles[id]; if (!r) return;
  if (r === 'J' && IN.joy) { IN.joy.dx = ARC.clamp((p.x - IN.joy.x0) / 58, -1, 1); IN.joy.dy = ARC.clamp((p.y - IN.joy.y0) / 58, -1, 1); return; }
  if (r === 'C' && IN.cam) { const dx = p.x - IN.cam.x; IN.cam.x = p.x; IN.cam.y = p.y;
    camYaw -= dx * .0068; tDrag = 0; }
}
function ptUp(id) { const r = roles[id]; delete roles[id];
  if (r === 'J') IN.joy = null; else if (r === 'C') IN.cam = null; else if (r === 'B') IN.atk = false; }

/* táctil propio por identifier: shell.js pt() usa touches[0] y mezcla los dedos */
function bindTouch() {
  const logi = (cx, cy) => { const vw = innerWidth, vh = innerHeight, rot = vh > vw ? 90 : 0;
    const S = rot ? Math.min(vh / LW, vw / LH) : Math.min(vw / LW, vh / LH);
    const ax = cx - vw / 2, ay = cy - vh / 2; let lx, ly;
    if (rot) { lx = ay / S; ly = -ax / S; } else { lx = ax / S; ly = ay / S; }
    return { x: lx + LW / 2, y: ly + LH / 2 }; };
  addEventListener('touchstart', e => { for (const t of e.changedTouches) ptDown('t' + t.identifier, logi(t.clientX, t.clientY)); }, { passive: true });
  addEventListener('touchmove', e => { for (const t of e.changedTouches) ptMove('t' + t.identifier, logi(t.clientX, t.clientY)); }, { passive: true });
  const end = e => { for (const t of e.changedTouches) ptUp('t' + t.identifier); };
  addEventListener('touchend', end, { passive: true }); addEventListener('touchcancel', end, { passive: true });
}

/* --------------------------------------------------------------- oleadas --- */
function spawnWave() {
  const d = DIF[cfg.dif] || DIF.normal, n = d.n + wave;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + Math.random() * .7, r = 19 + Math.random() * 6;
    const ex = Math.cos(a) * r, ez = Math.sin(a) * r;
    const m = tmplEnemy.clone(true); m.position.set(ex, EY, ez); scene.add(m);
    enemies.push({ m, x: ex, z: ez, hp: 22 + wave * 6, cd: .9 + Math.random() * .9, wind: 0,
      sp: d.sp + Math.random() * .8, dmg: d.ed, ph: Math.random() * 6.283, fy: 0, hit: 0 });
  }
  ARC.toast('OLEADA ' + wave + '/' + WAVES + ' · ' + n + ' enemigos');
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; dmg = d.dmg; maxAtk = d.maxatk;
  px = 0; pz = 0; yaw = 0; score = 0; wave = 1; kills = 0; dead = false; won = false; tPlay = 0;
  atkCD = 0; atkAnim = 0; hurtFlash = 0; hitDirT = 0;
  keys = {}; dbgAuto = false; running = true;                       // sin esto una tecla pegada / la sonda arruinan la partida siguiente
  for (const k in roles) delete roles[k];
  IN.joy = null; IN.cam = null; IN.atk = false;
  camYaw = 0; tDrag = 9; camSnap = true; mvL = 0;
  for (const e of enemies) scene.remove(e.m); enemies = [];
  if (ch) ch.play('idle', 0);
  spawnWave();
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * LW, y: (-p.y * .5 + .5) * LH }; }

/* ---------------------------------------------------------------- ataque --- */
function attack() {
  if (!running || atkCD > 0) return;   // running: sin esto Space en el menú dispara el swing
  atkCD = .5; atkAnim = .5; ARC.sfx('swipe', { vol: .45, rate: 1.1 });
  if (ch) { if (ch.playing() === 'bat' && ch.acts.bat) ch.acts.bat.reset().play(); else ch.play('bat', .07); }
  // auto-apuntado: girás hacia el enemigo más cercano del arco frontal amplio
  let best = null, bd = 1e9;
  for (const e of enemies) { const d = Math.hypot(e.x - px, e.z - pz);
    if (d <= REACH && d < bd) { bd = d; best = e; } }
  if (best) { const w = Math.atan2(best.x - px, best.z - pz); const dd = norm(w - yaw);
    if (Math.abs(dd) < 2.1) yaw = w; }
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let any = 0;
  for (const e of enemies) {
    const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz);
    if (d > REACH) continue;
    // pegado encima (d≈0) o dentro de 1.5: golpe radial, sin cono (el producto
    // punto ahí es basura y se comía el 95% de los espadazos)
    if (d > 1.5 && ((dx / d) * fx + (dz / d) * fz) < .05) continue;
    e.hp -= dmg; e.hit = .18; any++;
    // retroceso: te lo saca de encima, no lo atravesás
    if (d > .001) { const k = 1.1 / d; e.x += dx * k; e.z += dz * k; }
    e.wind = 0; e.cd = Math.max(e.cd, .55);
    const sp = w2s(e.x, 1.4, e.z); if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd06a', 8, 4.5);
    if (e.hp <= 0) { scene.remove(e.m); e.dead = true; kills++; score += 90;
      const sp2 = w2s(e.x, 1.4, e.z); if (sp2) ARC.fx.text(sp2.x, sp2.y - 24, '+90', '#ffd06a');
      ARC.sfx('coin', { vol: .5 }); }
  }
  if (any) { ARC.shake(3 + any); ARC.vib(16); ARC.sfx('hit', { vol: .4 }); enemies = enemies.filter(e => !e.dead); }
}

/* ----------------------------------------------------------------- cámara -- */
function updCam(dt) {
  // recentrado suave DETRÁS del movimiento, por el camino corto y con tope de
  // velocidad. Nunca se copia `yaw` de golpe (era el salto de 180° del bug).
  if (tDrag > 1.15 && mvL > .12) camYaw += ARC.clamp(norm(yaw - camYaw), -1, 1) * dt * 1.35;
  tDrag += dt;
  if (keys.KeyQ) { camYaw += dt * 1.9; tDrag = 0; }
  if (keys.KeyE) { camYaw -= dt * 1.9; tDrag = 0; }
  const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
  // distancia máxima que deja la cámara DENTRO del muro: |P - D·cd| = CAMR
  const b = px * sy + pz * cy;
  const lim = b + Math.sqrt(Math.max(0, b * b - (px * px + pz * pz) + CAMR * CAMR));
  const cd = ARC.clamp(Math.min(CD0, lim), 4.2, CD0);
  _v1.set(px - sy * cd, CH0 + (CD0 - cd) * .42, pz - cy * cd);
  const cl = Math.hypot(_v1.x, _v1.z);
  if (cl > CAMR) { _v1.x *= CAMR / cl; _v1.z *= CAMR / cl; }   // red de seguridad
  if (_v1.y < 1.6) _v1.y = 1.6;                                // nunca bajo el piso
  _v2.set(px + sy * 1.0, 1.55, pz + cy * 1.0);
  if (camSnap) { cam.position.copy(_v1); camT.copy(_v2); camSnap = false; }
  else { cam.position.lerp(_v1, 1 - Math.exp(-dt * 7)); camT.lerp(_v2, 1 - Math.exp(-dt * 9)); }
  cam.lookAt(camT);
}

/* ------------------------------------------------------------------ paso --- */
function step(dt) {
  if (dead) return; tPlay += dt;
  if (atkCD > 0) atkCD -= dt; if (atkAnim > 0) atkAnim -= dt;
  if (hurtFlash > 0) hurtFlash -= dt; if (hitDirT > 0) hitDirT -= dt;
  for (const t of torches) { const f = .8 + .2 * Math.sin(tPlay * 8.5 + t.ph) + .06 * Math.sin(tPlay * 21 + t.ph * 2);
    t.li.intensity = t.b * f; t.fl.scale.set(.9 + f * .2, .85 + f * .3, .9 + f * .2); }

  // --- dirección de movimiento en MUNDO ---
  let wx = 0, wz = 0, autoAtk = false;
  if (dbgAuto && enemies.length) {
    let bx = 0, bz = 0, bd = 1e9;
    for (const e of enemies) { const d = (e.x - px) ** 2 + (e.z - pz) ** 2; if (d < bd) { bd = d; bx = e.x; bz = e.z; } }
    const l = Math.hypot(bx - px, bz - pz) || 1; wx = (bx - px) / l; wz = (bz - pz) / l;
    autoAtk = Math.sqrt(bd) < 3.0;
  } else {
    let fwd = 0, side = 0;
    if (keys.KeyW || keys.ArrowUp) fwd += 1; if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyD || keys.ArrowRight) side += 1; if (keys.KeyA || keys.ArrowLeft) side -= 1;
    if (IN.joy) {
      const jl = Math.hypot(IN.joy.dx, IN.joy.dy);
      if (jl > .2) { const mag = Math.min(1, (jl - .2) / .62);   // ZONA MUERTA + velocidad proporcional
        fwd += (-IN.joy.dy / jl) * mag; side += (IN.joy.dx / jl) * mag; }
    }
    const fl = Math.hypot(fwd, side);
    if (fl > 1) { fwd /= fl; side /= fl; }
    // el movimiento es relativo a la cámara (3ª persona clásica)
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    wx = sy * fwd - cy * side; wz = cy * fwd + sy * side;
  }
  mvL = Math.min(1, Math.hypot(wx, wz));
  if (mvL > .02) { const ux = wx / Math.hypot(wx, wz), uz = wz / Math.hypot(wx, wz);
    yaw = Math.atan2(ux, uz);
    px += ux * SPD * mvL * dt; pz += uz * SPD * mvL * dt;
    const L = Math.hypot(px, pz); if (L > PR) { px *= PR / L; pz *= PR / L; } }

  if (IN.atk || keys.Space || keys.KeyJ || autoAtk) attack();

  // --- héroe ---
  if (hero) { hero.position.set(px, 0, pz);
    let dy = norm(yaw - hero.rotation.y);
    hero.rotation.y += dy * Math.min(1, dt * 14); }
  if (shadow) shadow.position.set(px, .025, pz);
  if (ch) { if (atkAnim > 0) ch.play('bat'); else if (mvL > .12) ch.play('run'); else ch.play('idle');
    ch.update(dt, atkAnim > 0 ? 1.25 : (mvL > .12 ? .9 + mvL * .5 : 1)); }

  updCam(dt);

  // --- separación (para que no se te metan adentro ni se apilen) ---
  for (let i = 0; i < enemies.length; i++) { const a = enemies[i];
    let dx = a.x - px, dz = a.z - pz, d = Math.hypot(dx, dz);
    if (d < SEPP) { if (d < 1e-3) { dx = Math.sin(a.ph); dz = Math.cos(a.ph); d = 1; }
      const k = (SEPP - d) / d; a.x += dx * k; a.z += dz * k; }
    for (let j = i + 1; j < enemies.length; j++) { const b = enemies[j];
      let ex = b.x - a.x, ez = b.z - a.z, dd = Math.hypot(ex, ez);
      if (dd < SEPE) { if (dd < 1e-3) { ex = Math.sin(i * 2.3 + j); ez = Math.cos(i * 2.3 + j); dd = 1; }
        const k = (SEPE - dd) / dd * .5; a.x -= ex * k; a.z -= ez * k; b.x += ex * k; b.z += ez * k; } }
    const L = Math.hypot(a.x, a.z); if (L > PR + 1) { a.x *= (PR + 1) / L; a.z *= (PR + 1) / L; }
  }

  // --- IA: perseguir, telegrafiar y pegar (máximo maxAtk a la vez) ---
  let winding = 0; for (const e of enemies) if (e.wind > 0) winding++;
  for (const e of enemies) {
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1e-4;
    e.fy = Math.atan2(dx, dz);
    if (e.hit > 0) e.hit -= dt;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) {
        e.cd = 1.45;
        if (d < 3.0) { hp -= e.dmg; hurtFlash = .32; hitDir = e.fy + Math.PI; hitDirT = .8;
          ARC.shake(6); ARC.vib(40); ARC.sfx('hurt', { vol: .45 });
          if (hp <= 0) { hp = 0; dead = true; running = false;
            ARC.over({ win: false, score, title: 'CAÍSTE', sub: 'oleada ' + wave + ' · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; } }
      }
    } else {
      if (e.cd > 0) e.cd -= dt; else if (e.cd < 0) e.cd = 0;
      if (d > 2.05) { e.x += dx / d * e.sp * dt; e.z += dz / d * e.sp * dt; }
      else if (e.cd <= 0 && winding < maxAtk) { e.wind = .45; winding++;
        const sp = w2s(e.x, 1.9, e.z); if (sp) ARC.fx.ring(sp.x, sp.y, '#ff7a90', 8);
        ARC.sfx('swipe', { vol: .2, rate: .65 }); }
    }
    // pose: anticipación (se echa atrás) + bamboleo al caminar + flash al recibir
    const w = e.wind > 0 ? Math.sin((1 - e.wind / .45) * 1.5708) : 0;
    const bob = d > 2.05 ? Math.sin(tPlay * 8 + e.ph) * .06 : 0;
    e.m.position.set(e.x, EY + Math.abs(bob) - (e.hit > 0 ? .05 : 0), e.z);
    e.m.rotation.set(-w * .34, e.fy, bob * .9);
    const sc = (1 + w * .1) * (e.hit > 0 ? .94 : 1);
    e.m.scale.set(sc, sc, sc);
  }

  if (enemies.length === 0) {
    if (wave >= WAVES) { won = true; dead = true; running = false;
      ARC.over({ win: true, score: score + hp * 5, title: '¡INVICTO!', sub: WAVES + ' oleadas · ' + kills + ' bajas', coins: (score / 20 | 0) }); return; }
    wave++; hp = Math.min(hpMax, hp + 34); ARC.toast('+VIDA'); spawnWave();
  }
}

/* -------------------------------------------------------------------- HUD -- */
function draw2d(g) {
  const W = LW, H = LH;
  if (hurtFlash > 0) { g.fillStyle = 'rgba(190,20,40,' + (hurtFlash * .6).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  // vida ARRIBA a la izquierda (abajo se cruzaba con el joystick)
  g.textAlign = 'left'; g.font = '900 22px system-ui'; g.fillStyle = '#e8d0ff'; g.fillText('OLEADA ' + wave + '/' + WAVES, 24, 32);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, 42, 244, 22);
  g.fillStyle = hp / hpMax > .35 ? '#4fd97a' : '#ff5470'; g.fillRect(24, 44, 240 * Math.max(0, hp / hpMax), 18);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.fillText('♥ ' + Math.ceil(hp) + '/' + hpMax, 30, 58);
  g.font = '900 15px system-ui'; g.fillStyle = '#ffb0c0'; g.fillText('enemigos ' + enemies.length, 24, 82);
  g.textAlign = 'right'; g.font = '900 24px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 128, 32);
  g.textAlign = 'left';

  // radar: los que te vienen por atrás (el campo visual es un cono, si no morís ciego)
  const rcx = W - 70, rcy = 110, rr = 42;
  g.fillStyle = 'rgba(10,8,18,.45)'; g.beginPath(); g.arc(rcx, rcy, rr, 0, 6.28); g.fill();
  g.fillStyle = 'rgba(180,138,255,.16)'; g.beginPath(); g.moveTo(rcx, rcy);
  g.arc(rcx, rcy, rr, -Math.PI / 2 - .62, -Math.PI / 2 + .62); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(220,200,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(rcx, rcy, rr, 0, 6.28); g.stroke();
  { const sy = Math.sin(camYaw), cy = Math.cos(camYaw), k = rr / (PR + 2);
    for (const e of enemies) { const ax = e.x - px, az = e.z - pz;
      let dx = (-ax * cy + az * sy) * k, dy = -(ax * sy + az * cy) * k;
      const l = Math.hypot(dx, dy) || 1; const edge = l > rr - 4;
      if (edge) { dx *= (rr - 4) / l; dy *= (rr - 4) / l; }
      g.fillStyle = e.wind > 0 ? '#ff5470' : (edge ? '#ffd0dc' : '#ffd06a');
      g.beginPath(); g.arc(rcx + dx, rcy + dy, e.wind > 0 ? 4.2 : 3, 0, 6.28); g.fill(); } }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(rcx, rcy, 2.6, 0, 6.28); g.fill();

  // de dónde vino el último golpe
  if (hitDirT > 0) { const a = norm(hitDir - camYaw);
    g.save(); g.translate(W / 2, H / 2); g.rotate(a); g.globalAlpha = Math.min(1, hitDirT);
    g.fillStyle = '#ff5470'; g.beginPath(); g.moveTo(0, -178); g.lineTo(-16, -152); g.lineTo(16, -152); g.closePath(); g.fill();
    g.restore(); g.globalAlpha = 1; }

  // joystick: se dibuja DONDE está el dedo (antes dibujaba fijo y el control era flotante)
  const jx = IN.joy ? IN.joy.x0 : 112, jy = IN.joy ? IN.joy.y0 : H - 104;
  g.strokeStyle = IN.joy ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.2)';
  g.lineWidth = 3; g.beginPath(); g.arc(jx, jy, 62, 0, 6.28); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.beginPath(); g.arc(jx, jy, 13, 0, 6.28); g.stroke();
  g.fillStyle = IN.joy ? 'rgba(230,210,255,.4)' : 'rgba(230,210,255,.2)';
  g.beginPath(); g.arc(jx + (IN.joy ? IN.joy.dx * 40 : 0), jy + (IN.joy ? IN.joy.dy * 40 : 0), 26, 0, 6.28); g.fill();

  g.fillStyle = atkCD > 0 ? 'rgba(80,60,110,.6)' : 'rgba(180,138,255,.9)';
  g.beginPath(); g.arc(BX, BY, 52, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#1a0c2a'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', BX, BY + 1); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

/* ------------------------------------------------------------------ menú --- */
let ma = 0;
function attract3d(dt) { ma += dt * .4;
  for (const t of torches) { const f = .8 + .2 * Math.sin(ma * 12 + t.ph); t.li.intensity = t.b * f; }
  if (hero) { hero.position.set(0, 0, 0); hero.rotation.set(0, ma, 0); }
  if (shadow) shadow.position.set(0, .025, 0);
  if (ch) ch.update(dt, 1);
  if (cam) { cam.position.set(Math.cos(ma) * 9, 4.6, Math.sin(ma) * 9); cam.lookAt(0, 1.25, 0); }
}

/* ---- shell: sólo el mouse (el táctil lo maneja bindTouch por identifier) --- */
function down(p, e) { if (e && e.touches) return; ptDown('m', p); }
function move(p, e) { if (e && e.touches) return; ptMove('m', p); }
function up(p, e) { if (e && e.touches) return; ptUp('m'); }
function key(code, dn) { keys[code] = dn;
  if (dn && (code === 'Space' || code === 'KeyJ')) attack();
  if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'arena', name: 'ARENA', sub: 'supervivencia por oleadas', acc: '#b48aff', three: true, sky: '#2a2438', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), wave, kills, enemies: enemies.length, dead, won, x: px | 0, z: pz | 0,
      cy: +camYaw.toFixed(2), cr: cam ? +Math.hypot(cam.position.x, cam.position.z).toFixed(1) : 0,
      j: IN.joy ? +Math.hypot(IN.joy.dx, IN.joy.dy).toFixed(2) : -1, atk: IN.atk ? 1 : 0, cd: +(atkCD || 0).toFixed(2) }),
    autoPlay() { dbgAuto = true; },
    /* pruebas de cámara: te pone en un punto con un camYaw dado (sin interpolar) */
    tp(x, z, cy) { px = x; pz = z; const L = Math.hypot(px, pz);
      if (L > PR) { px *= PR / L; pz *= PR / L; }
      if (cy != null) camYaw = cy; camSnap = true; tDrag = 0; }
  }
};
})();

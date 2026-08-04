/* ===== ARENA — supervivencia por oleadas ==================================
   Tercera persona en una arena de piedra: aguantá oleadas de esqueletos con la
   espada. Cada oleada suma enemigos; entre oleadas te curás un poco.
   Controles: joystick izq = mover · ATACAR (der). */
window.GAME = (function () {
let T, scene, cam, ren;
let hero, px, pz, yaw, hp, hpMax, score, wave, kills, dead, won, tPlay, atkCD, swingT, dmg;
let keys = {}, joy = null, enemies = [], tmplEnemy = null, sword = null, hurtFlash = 0, dbgAuto = false;
const R = 30, WAVES = 6;

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('arena_dif') || 'normal'; } catch (e) {}
const DIF = { facil: { hp: 150, dmg: 18, ed: 8, n: 3 }, normal: { hp: 115, dmg: 14, ed: 12, n: 4 }, brutal: { hp: 90, dmg: 12, ed: 17, n: 5 } };

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0x2a2438, 40, 150);
  scene.add(new T.HemisphereLight(0xdcd0ff, 0x3a3048, 1.6)); scene.add(new T.AmbientLight(0xffffff, .55));
  const sun = new T.DirectionalLight(0xffe8c0, 2.2); sun.position.set(20, 60, 20);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 140; sun.shadow.bias = -0.0008; }
  scene.add(sun); ren.toneMappingExposure = 1.3;
  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  // piso circular
  const floor = new T.Mesh(new T.CircleGeometry(R + 6, 48), new T.MeshStandardMaterial({ map: rep(TEX.floor, 10), roughness: .95, color: 0xf0ecf6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // muro perimetral
  const wm = new T.MeshStandardMaterial({ map: rep(TEX.wall, 3), roughness: .9, color: 0xe8e2f0 });
  for (let i = 0; i < 34; i++) { const a = i / 34 * 6.283;
    const b = new T.Mesh(new T.BoxGeometry(6.2, 5, 2), wm);
    b.position.set(Math.cos(a) * (R + 4), 2.5, Math.sin(a) * (R + 4)); b.rotation.y = -a + Math.PI / 2;
    b.castShadow = true; b.receiveShadow = true; scene.add(b); }
  // antorchas
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283;
    const li = new T.PointLight(0xffb060, 5, 55); li.position.set(Math.cos(a) * (R - 2), 5, Math.sin(a) * (R - 2)); scene.add(li);
    const fl = new T.Mesh(new T.ConeGeometry(.3, .8, 7), new T.MeshBasicMaterial({ color: 0xffa646 }));
    fl.position.copy(li.position); scene.add(fl); }
  // HÉROE (GLB del repo con anim) + espada
  hero = new T.Group();
  try { const g = await ARC.loadGLB(MDL.hero); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(2 / (s.y || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); const c2 = nb.getCenter(new T.Vector3());
    m.position.x -= c2.x; m.position.z -= c2.z; m.position.y -= nb.min.y;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) { const mm = o.material; mm.emissive && mm.emissive.setRGB(0,0,0); if (mm.specularIntensity != null) mm.specularIntensity = 0; mm.envMapIntensity = .4; } } });
    hero.add(m);
  } catch (e) {
    const b2 = new T.Mesh(new T.CapsuleGeometry(.42, 1.1, 4, 10), new T.MeshStandardMaterial({ color: 0x4a7fd0, roughness: .7 }));
    b2.position.y = 1.05; b2.castShadow = true; hero.add(b2); }
  try { const g = await ARC.loadGLB(MDL.sword); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(1.5 / (Math.max(s.x, s.y, s.z) || 1));
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
    sword = new T.Group(); sword.add(m); sword.position.set(.55, 1.1, .3); hero.add(sword);
  } catch (e) { sword = null; }
  scene.add(hero);
  const blob = new T.Mesh(new T.CircleGeometry(.6, 18), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .32 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .02; hero.add(blob);
  // enemigo
  try { const g = await ARC.loadGLB(MDL.enemy); tmplEnemy = g.scene;
    const b = new T.Box3().setFromObject(tmplEnemy); const s = b.getSize(new T.Vector3());
    tmplEnemy.scale.setScalar(2.4 / (s.y || 1)); tmplEnemy.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(tmplEnemy); tmplEnemy.position.y -= nb.min.y;
    tmplEnemy.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  } catch (e) { tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.5, 1.2, 4, 8), new T.MeshStandardMaterial({ color: 0xc04a5a })); tmplEnemy.position.y = 1.1; }
  mkMenu();
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

function spawnWave() {
  const d = DIF[cfg.dif] || DIF.normal, n = d.n + wave;
  for (let i = 0; i < n; i++) {
    const m = tmplEnemy.clone(true); const a = Math.random() * 6.283, r = R - 3;
    const ex = Math.cos(a) * r, ez = Math.sin(a) * r;
    m.position.set(ex, 0, ez); scene.add(m);
    enemies.push({ m, x: ex, z: ez, hp: 24 + wave * 7, atk: Math.random(), sp: 2.6 + Math.random() * .9, dmg: d.ed });
  }
  ARC.toast('OLEADA ' + wave + '/' + WAVES + ' · ' + n + ' enemigos');
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  hpMax = d.hp; hp = hpMax; dmg = d.dmg;
  px = 0; pz = 0; yaw = 0; score = 0; wave = 1; kills = 0; dead = false; won = false; tPlay = 0;
  atkCD = 0; swingT = 0; hurtFlash = 0;
  for (const e of enemies) scene.remove(e.m); enemies = [];
  spawnWave();
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function attack() {
  if (atkCD > 0 || dead) return; atkCD = .45; swingT = .45; ARC.sfx('swipe', { vol: .45, rate: 1.1 });
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (const e of enemies) {
    const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz) || 1;
    if (d > 3.8) continue;
    if ((dx / d) * fx + (dz / d) * fz < .3) continue;
    e.hp -= dmg; ARC.shake(3); ARC.vib(16);
    const sp = w2s(e.x, 1.4, e.z); if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd06a', 7, 4);
    if (e.hp <= 0) { scene.remove(e.m); e.dead = true; kills++; score += 90;
      const sp2 = w2s(e.x, 1.4, e.z); if (sp2) ARC.fx.text(sp2.x, sp2.y - 24, '+90', '#ffd06a');
      ARC.sfx('coin', { vol: .5 }); }
  }
  enemies = enemies.filter(e => !e.dead);
}

function step(dt) {
  if (dead) return; tPlay += dt;
  if (atkCD > 0) atkCD -= dt; if (swingT > 0) swingT -= dt; if (hurtFlash > 0) hurtFlash -= dt;
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (joy) { mx += joy.dx; mz += -joy.dy; }
  if (dbgAuto && enemies.length) { let bx = enemies[0].x, bz = enemies[0].z, bd = 1e9;
    for (const e of enemies) { const d = (e.x - px) ** 2 + (e.z - pz) ** 2; if (d < bd) { bd = d; bx = e.x; bz = e.z; } }
    mx = bx - px; mz = bz - pz; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
    if (Math.sqrt(bd) < 3.4) attack(); }
  const ml = Math.hypot(mx, mz);
  if (ml > 0) { mx /= ml; mz /= ml; yaw = Math.atan2(mx, mz);
    px += mx * 6.4 * dt; pz += mz * 6.4 * dt;
    const L = Math.hypot(px, pz); if (L > R - 1) { px *= (R - 1) / L; pz *= (R - 1) / L; } }
  hero.position.set(px, 0, pz); hero.rotation.set(0, yaw, 0);
  if (sword) { const s = swingT > 0 ? Math.sin((1 - swingT / .45) * Math.PI) : 0;
    sword.rotation.set(-s * 1.8, 0, .3 - s * .8); sword.position.set(.55 - s * .2, 1.1, .3 + s * .5); }
  const cd = 11; cam.position.set(px - Math.sin(yaw) * cd, 7.2, pz - Math.cos(yaw) * cd);
  cam.lookAt(px + Math.sin(yaw) * 3, 1.3, pz + Math.cos(yaw) * 3);
  for (const e of enemies) {
    const dx = px - e.x, dz = pz - e.z, d = Math.hypot(dx, dz) || 1;
    if (d > 2.2) { e.x += dx / d * e.sp * dt; e.z += dz / d * e.sp * dt; }
    e.m.position.set(e.x, 0, e.z); e.m.rotation.y = Math.atan2(dx, dz);
    e.atk -= dt;
    if (d < 2.6 && e.atk <= 0) { e.atk = 1.3; hp -= e.dmg; hurtFlash = .32; ARC.shake(6); ARC.vib(40); ARC.sfx('hurt', { vol: .45 });
      if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'CAÍSTE', sub: 'oleada ' + wave + ' · ' + kills + ' bajas', coins: (score / 25 | 0) }); return; } }
  }
  if (enemies.length === 0) {
    if (wave >= WAVES) { won = true; dead = true;
      ARC.over({ win: true, score: score + hp * 5, title: '¡INVICTO!', sub: WAVES + ' oleadas · ' + kills + ' bajas', coins: (score / 20 | 0) }); return; }
    wave++; hp = Math.min(hpMax, hp + 28); ARC.toast('+VIDA'); spawnWave();
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  if (hurtFlash > 0) { g.fillStyle = 'rgba(190,20,40,' + (hurtFlash * .6).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  g.textAlign = 'left'; g.font = '900 24px system-ui'; g.fillStyle = '#e8d0ff'; g.fillText('OLEADA ' + wave + '/' + WAVES, 24, 40);
  g.font = '900 15px system-ui'; g.fillStyle = '#ffb0c0'; g.fillText('enemigos ' + enemies.length, 24, 62);
  g.textAlign = 'right'; g.font = '900 24px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 66, 40);
  g.textAlign = 'left';
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(22, H - 46, 250, 22);
  g.fillStyle = hp / hpMax > .35 ? '#4fd97a' : '#ff5470'; g.fillRect(24, H - 44, 246 * Math.max(0, hp / hpMax), 18);
  g.fillStyle = '#fff'; g.font = '900 15px system-ui'; g.fillText('♥ ' + Math.ceil(hp) + '/' + hpMax, 30, H - 29);
  const jx = 108, jy = H - 108;
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(jx, jy, 62, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(230,210,255,.32)'; g.beginPath(); g.arc(jx + (joy ? joy.dx * 40 : 0), jy + (joy ? joy.dy * 40 : 0), 26, 0, 6.28); g.fill();
  const ax = W - 96, ay = H - 100;
  g.fillStyle = atkCD > 0 ? 'rgba(80,60,110,.6)' : 'rgba(180,138,255,.9)';
  g.beginPath(); g.arc(ax, ay, 52, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#1a0c2a'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚔', ax, ay + 1); g.textBaseline = 'alphabetic';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * .4;
  if (hero) { hero.position.set(0, 0, 0); hero.rotation.set(0, ma, 0); }
  if (cam) { cam.position.set(Math.cos(ma) * 11, 5.5, Math.sin(ma) * 11); cam.lookAt(0, 1.2, 0); } }

function down(p) { if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (Math.hypot(p.x - (ARC.W - 96), p.y - (ARC.H - 100)) < 62) { attack(); return; }
  if (p.x < ARC.W * .45) joy = { x0: p.x, y0: p.y, dx: 0, dy: 0 }; }
function move(p) { if (joy) { joy.dx = ARC.clamp((p.x - joy.x0) / 55, -1, 1); joy.dy = ARC.clamp((p.y - joy.y0) / 55, -1, 1); } }
function up() { joy = null; }
function key(code, dn) { keys[code] = dn;
  if (dn && (code === 'Space' || code === 'KeyJ')) attack();
  if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'arena', name: 'ARENA', sub: 'supervivencia por oleadas', acc: '#b48aff', three: true, sky: '#2a2438', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, hp: Math.ceil(hp), wave, kills, enemies: enemies.length, dead, won, x: px | 0, z: pz | 0 }),
    autoPlay() { dbgAuto = true; }
  }
};
})();

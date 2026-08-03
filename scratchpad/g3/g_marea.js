/* ===== MAREA — moto de agua al atardecer ==================================
   CIRCUITO cerrado de boyas sobre un océano dorado con olas reales y reflejo
   del cielo. Cruzá las boyas en orden, completá vueltas. 3 modos + menú con
   opciones. Arrastrá (o A/D · flechas) para virar. */
window.GAME = (function () {
let T, scene, cam, ren;
let craft, sx, sz, yaw, v, bank, timeLeft, score, streak, dead, tPlay, won;
let keys = {}, water = null, waterGeo = null, baseY = null, sprayT = 0;
let GATES = [], gGroups = [], gi = 0, laps = 0, mark = null;
let pad = null, ISL = [], vCruise = 18, vMax = 34, autoIx = null, autoBoost = false;

/* config elegida en el menú */
const cfg = { modo: 'circuito', dif: 'normal' };
try { cfg.modo = localStorage.getItem('marea_modo') || 'circuito'; cfg.dif = localStorage.getItem('marea_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 25, t: 45, laps: 2 }, normal: { v: 31, t: 38, laps: 3 }, pro: { v: 39, t: 32, laps: 3 } };
const NG = 12, TARGET = null;               // 12 boyas en el circuito

function waveH(x, z, t) {
  return Math.sin(x * .06 + t * 1.6) * .5 + Math.sin(z * .045 - t * 1.1) * .6 + Math.sin((x + z) * .03 + t * .8) * .35;
}

function buildCircuit() {
  GATES = [];
  for (let i = 0; i < NG; i++) { const a = i / NG * 6.283; const r = 150 * (.82 + .26 * Math.sin(a * 3 + .6));
    GATES.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
}

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xf0c890, 140, 480);
  scene.add(new T.HemisphereLight(0xffe6c0, 0x20406a, 1.3));
  scene.add(new T.AmbientLight(0xffffff, .35));
  const sun = new T.DirectionalLight(0xffdca6, 2.6); sun.position.set(-40, 22, -60); scene.add(sun);
  ren.toneMappingExposure = 1.18;
  // OCÉANO
  const aguaTex = tl.load(TEX.agua); aguaTex.wrapS = aguaTex.wrapT = T.RepeatWrapping; aguaTex.repeat.set(28, 28); aguaTex.colorSpace = T.SRGBColorSpace;
  waterGeo = new T.PlaneGeometry(900, 900, 60, 60); waterGeo.rotateX(-Math.PI / 2);
  baseY = Float32Array.from(waterGeo.attributes.position.array);
  water = new T.Mesh(waterGeo, new T.MeshStandardMaterial({ map: aguaTex, color: 0x40899e, roughness: .08, metalness: .18, envMap: sky, envMapIntensity: 1.5 }));
  scene.add(water);
  const glint = new T.PointLight(0xffe0a0, 2.2, 120); glint.position.set(-30, 8, -40); scene.add(glint);
  // MOTO DE AGUA (modelo generado; respaldo procedural)
  let m = null;
  try { const g = await ARC.loadGLB(MDL.craft); m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(3.6 / (Math.max(s.x, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.metalness = Math.min(o.material.metalness || 0, .4); o.material.envMapIntensity = .6; } } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2; m.updateWorldMatrix(true, true);
    m.position.y -= new T.Box3().setFromObject(m).min.y;
  } catch (e) {}
  if (!m) { m = new T.Group();
    const hull = new T.Mesh(new T.BoxGeometry(1.5, .7, 3.6), new T.MeshStandardMaterial({ color: 0xd83a3a, roughness: .5, metalness: .2 })); hull.geometry.translate(0, .35, 0); m.add(hull);
    const nose = new T.Mesh(new T.ConeGeometry(.7, 1.3, 4), new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: .4 })); nose.rotation.x = Math.PI / 2; nose.position.set(0, .55, 2.1); m.add(nose); }
  craft = new T.Group(); craft.add(m); scene.add(craft);
  // CIRCUITO: una boya-puerta por punto (todas visibles)
  buildCircuit();
  const buoy = (col, dx) => { const gg = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(.9, 1.1, 2.2, 10), new T.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: .4 })); body.position.y = 1; gg.add(body);
    const top = new T.Mesh(new T.SphereGeometry(.5, 8, 8), new T.MeshBasicMaterial({ color: col })); top.position.y = 2.3; gg.add(top);
    gg.position.x = dx; return gg; };
  gGroups = [];
  for (let i = 0; i < NG; i++) { const grp = new T.Group();
    grp.add(buoy(0xff4455, -5.5)); grp.add(buoy(0x35e0c0, 5.5));
    const arcm = new T.Mesh(new T.TorusGeometry(5.5, .28, 8, 24, Math.PI), new T.MeshBasicMaterial({ color: 0xffe6a0 })); arcm.position.y = 3.4; arcm.rotation.z = Math.PI; grp.add(arcm);
    // apunta la puerta hacia la siguiente boya
    const nx = GATES[(i + 1) % NG], cur = GATES[i];
    grp.position.set(cur.x, 0, cur.z); grp.lookAt(nx.x, 0, nx.z);
    scene.add(grp); gGroups.push(grp); }
  // marcador flotante sobre la boya activa
  mark = new T.Mesh(new T.OctahedronGeometry(1.4), new T.MeshBasicMaterial({ color: 0x2fd1e0 })); scene.add(mark);
  // ---- VIDA: islas tropicales con palmeras + gente, y pájaros ----
  LIFE.setup(T);
  let palmRoot = null; try { const pg = await ARC.loadGLB(MDL.palm); palmRoot = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palmRoot);
  ISL = [{ x: 0, z: 0, r: 24 }, { x: -52, z: 34, r: 15 }, { x: 46, z: -40, r: 14 }, { x: 24, z: 58, r: 12 }, { x: -58, z: -50, r: 13 },
    { x: 255, z: 70, r: 42 }, { x: -260, z: -40, r: 46 }, { x: 70, z: 285, r: 40 }, { x: -130, z: -275, r: 42 }, { x: 300, z: -190, r: 48 }];
  for (const s of ISL) LIFE.island(scene, s.x, s.z, s.r, mkPalm);
  LIFE.flock(scene, { count: 16, area: 260, ylo: 16, yhi: 52 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  setupMenu();
}

/* ------- menú con opciones (inyectado sobre la portada) ------- */
function setupMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:46%;z-index:4;display:flex;flex-direction:column;gap:2.2vmin;align-items:center;padding:0 4%}' +
    '#mOpts .lab{font-size:2.2vmin;font-weight:800;letter-spacing:.18em;color:#bfe9f2;opacity:.9}' +
    '#mOpts .row{display:flex;gap:1.6vmin;flex-wrap:wrap;justify-content:center}' +
    '#mOpts .op{padding:1.5vmin 3.2vmin;border-radius:2.4vmin;font-size:2.5vmin;font-weight:800;color:#dff6fb;' +
    'background:rgba(0,0,0,.4);border:.4vmin solid rgba(255,255,255,.18);cursor:pointer;backdrop-filter:blur(3px)}' +
    '#mOpts .op.on{background:#2fd1e0;color:#052027;border-color:#fff;box-shadow:0 0 22px #2fd1e0}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const mk = (key, opts) => { const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = key === 'modo' ? 'MODO' : 'DIFICULTAD'; box.appendChild(lab);
    const row = document.createElement('div'); row.className = 'row';
    opts.forEach(([val, txt]) => { const b = document.createElement('div'); b.className = 'op' + (cfg[key] === val ? ' on' : ''); b.textContent = txt;
      b.addEventListener('click', ev => { ev.stopPropagation(); cfg[key] = val; try { localStorage.setItem('marea_' + key, val); } catch (e) {}
        row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); });
      row.appendChild(b); });
    box.appendChild(row); };
  mk('modo', [['circuito', '🏁 CIRCUITO'], ['contra', '⏱️ CONTRARRELOJ'], ['libre', '🌅 LIBRE']]);
  mk('dif', [['chill', 'CHILL'], ['normal', 'NORMAL'], ['pro', 'PRO']]);
  menu.appendChild(box);
}

function placeGateAhead() {   // modo contrarreloj: boya al frente al azar
  const a = yaw + ARC.rnd(-.6, .6), d = ARC.rnd(58, 88);
  const x = sx + Math.sin(a) * d, z = sz + Math.cos(a) * d;
  const L = Math.hypot(x, z); GATES[gi] = { x: L > 300 ? x * 300 / L : x, z: L > 300 ? z * 300 / L : z };
  gGroups[gi].position.set(GATES[gi].x, 0, GATES[gi].z); gGroups[gi].lookAt(sx, 0, sz);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  buildCircuit();
  won = false; dead = false; score = 0; streak = 0; tPlay = 0; laps = 0; bank = 0;
  vCruise = d.v * .6; vMax = d.v * 1.18; v = vCruise;
  gGroups.forEach((g, i) => { g.visible = true; g.position.set(GATES[i].x, 0, GATES[i].z);
    const nx = GATES[(i + 1) % NG]; g.lookAt(nx.x, 0, nx.z); });
  if (cfg.modo === 'contra') {
    // arranca en el centro; las boyas van apareciendo al frente
    sx = 0; sz = 0; yaw = 0; gi = 0; for (let i = 1; i < NG; i++) gGroups[i].visible = false;
    timeLeft = d.t; placeGateAhead();
  } else {
    // circuito / libre: arranca en la boya 0 mirando a la 1
    sx = GATES[0].x; sz = GATES[0].z; yaw = Math.atan2(GATES[1].x - GATES[0].x, GATES[1].z - GATES[0].z);
    gi = 1; timeLeft = cfg.modo === 'libre' ? 999 : d.t;
  }
}

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function endWin() { won = true; dead = true; const bonus = Math.round(timeLeft * 6);
  ARC.over({ win: true, score: score + bonus, title: '¡CAMPEÓN!', sub: laps + ' vueltas · +' + bonus + ' por tiempo', coins: ((score + bonus) / 30 | 0) }); }

function step(dt) {
  if (dead) return; tPlay += dt;
  if (cfg.modo !== 'libre') { timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; dead = true; ARC.over({ win: score >= 500, score, title: score >= 500 ? '¡BUENA!' : 'SE ACABÓ', coins: (score / 30 | 0) }); return; } }
  // olas
  const p = waterGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(baseY[i], baseY[i + 2], tPlay);
  waterGeo.attributes.position.needsUpdate = true; waterGeo.computeVertexNormals();
  // dirección (flechas en pantalla / teclado) + acelerador
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const boosting = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space || keys.ShiftLeft;
  v += ((boosting ? vMax : vCruise) - v) * Math.min(1, dt * 2.2);
  yaw -= ix * dt * 1.7; bank += (ix * .5 - bank) * Math.min(1, dt * 6);
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(sx, sz); if (L > 300) { sx *= 300 / L; sz *= 300 / L; }
  // choque suave contra islas
  for (const s of ISL) { const dx = sx - s.x, dz = sz - s.z, dd = Math.hypot(dx, dz), rr = s.r + 2.5;
    if (dd < rr && dd > .001) { sx = s.x + dx / dd * rr; sz = s.z + dz / dd * rr; v *= .6; ARC.shake(3); } }
  const wy = waveH(sx, sz, tPlay);
  craft.position.set(sx, wy + .2 + Math.sin(tPlay * 3) * .08, sz);
  craft.rotation.set(0, 0, 0); craft.rotateY(yaw + Math.PI); craft.rotateZ(-bank); craft.rotateX(-.06 + Math.sin(tPlay * 2) * .03);
  const cd = 10; cam.position.set(sx - Math.sin(yaw) * cd, wy + 4.2, sz - Math.cos(yaw) * cd);
  cam.lookAt(sx + Math.sin(yaw) * 8, wy + 1.2, sz + Math.cos(yaw) * 8);
  // boyas flotan con la ola
  for (let i = 0; i < NG; i++) if (gGroups[i].visible) gGroups[i].position.y = waveH(GATES[i].x, GATES[i].z, tPlay);
  // marcador sobre la activa
  const g = GATES[gi]; const gy = waveH(g.x, g.z, tPlay);
  mark.position.set(g.x, gy + 5 + Math.sin(tPlay * 3) * .4, g.z); mark.rotation.y += dt * 2;
  LIFE.update(dt);
  // estela/spray de agua al andar (más fuerte con acelerador / al virar)
  sprayT -= dt; if (sprayT <= 0) { sprayT = .035;
    const bp = worldToScreen(sx - Math.sin(yaw) * 2, wy + .35, sz - Math.cos(yaw) * 2);
    if (bp) { const n = boosting ? 5 : 3, sp2 = boosting ? 3.4 : 2.4;
      ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.92)', n, sp2);
      if (Math.abs(bank) > .2) ARC.fx.burst(bp.x, bp.y, 'rgba(205,238,255,.85)', 3, 3.6); } }
  // ¿cruzó la boya activa?
  const d2 = (sx - g.x) ** 2 + (sz - g.z) ** 2;
  if (d2 < 34) {
    streak++; const bonus = 3 + Math.min(3, streak * .4); if (cfg.modo !== 'libre') timeLeft += bonus;
    score += 40 * Math.min(4, streak);
    const sp = worldToScreen(g.x, gy + 3, g.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#ffe6a0', 16); ARC.fx.text(sp.x, sp.y - 26, cfg.modo === 'libre' ? '+' + (40 * Math.min(4, streak)) : '+' + bonus.toFixed(1) + 's', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20); ARC.shake(2);
    if (cfg.modo === 'contra') { gGroups[gi].visible = false; placeGateAhead(); gGroups[gi].visible = true; }
    else { const prev = gi; gi = (gi + 1) % NG;
      if (gi === 0) { laps++; ARC.toast('VUELTA ' + laps); const d = DIF[cfg.dif] || DIF.normal;
        if (cfg.modo === 'circuito' && laps >= d.laps) { endWin(); return; } } }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.textAlign = 'center';
  if (cfg.modo !== 'libre') { g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44); }
  else { g.font = '900 22px system-ui'; g.fillStyle = '#bfe9f2'; g.fillText('LIBRE', W / 2, 40); }
  g.font = '900 18px system-ui'; g.fillStyle = '#2fd1e0';
  if (cfg.modo === 'circuito') { const d = DIF[cfg.dif] || DIF.normal; g.fillText('vuelta ' + Math.min(laps + 1, d.laps) + '/' + d.laps, W / 2, 68); }
  else g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 68);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText((v * 3.6 | 0) + ' km/h', 24, 62);
  // flecha/círculo a la boya activa
  const gg = GATES[gi]; const gy = waveH(gg.x, gg.z, tPlay) + 3; const sp = worldToScreen(gg.x, gy, gg.z);
  if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) { g.strokeStyle = '#ffe6a0'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 22 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke(); }
  else { const ang = Math.atan2(gg.x - sx, gg.z - sz) - yaw; g.save(); g.translate(W / 2, 116); g.rotate(-ang);
    g.fillStyle = '#ffe6a0'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill(); g.restore(); }
  // MINIMAPA del circuito
  if (cfg.modo !== 'contra') {
    const cxp = W - 66, cyp = 116, R = 44, k = R / 200;
    g.fillStyle = 'rgba(6,20,28,.55)'; g.beginPath(); g.arc(cxp, cyp, R + 8, 0, 6.28); g.fill();
    g.strokeStyle = 'rgba(120,220,240,.5)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= NG; i++) { const q = GATES[i % NG]; const mx = cxp + q.x * k, my = cyp + q.z * k; i ? g.lineTo(mx, my) : g.moveTo(mx, my); } g.closePath(); g.stroke();
    for (let i = 0; i < NG; i++) { const q = GATES[i]; g.fillStyle = i === gi ? '#ffe6a0' : 'rgba(180,230,245,.5)'; g.beginPath(); g.arc(cxp + q.x * k, cyp + q.z * k, i === gi ? 4 : 2.4, 0, 6.28); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp + sx * k, cyp + sz * k, 3.4, 0, 6.28); g.fill();
  }
  if (pad) pad.draw(g, '#2fd1e0');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .4; tPlay = (tPlay || 0) + dt;
  if (waterGeo) { const p = waterGeo.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(baseY[i], baseY[i + 2], tPlay); waterGeo.attributes.position.needsUpdate = true; }
  if (craft) { const wy = waveH(0, 0, tPlay); craft.position.set(0, wy + .2, 0); craft.rotation.set(0, menuA, 0); }
  if (cam) { cam.position.set(Math.cos(menuA) * 13, 4.5 + Math.sin(menuA * .7) * 1.2, Math.sin(menuA) * 13); cam.lookAt(0, 1.2, 0); }
  if (window.LIFE) LIFE.update(dt);
}

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'marea', name: 'MAREA', sub: 'olas al atardecer', acc: '#2fd1e0', three: true, sky: '#e9b06a', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), laps, gi, dead, won, x: sx | 0, z: sz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; return; } const g = GATES[gi]; const ty = Math.atan2(g.x - sx, g.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; autoIx = ARC.clamp(-dy * 2.2, -1, 1); autoBoost = true; }
  }
};
})();

/* ===== MAREA — moto de agua (laguna tropical de día) =======================
   CIRCUITO de boyas sobre un océano con OLAS REALES (malla desplazada +
   espuma en las crestas + reflejo del cielo). La moto FLOTA con físicas:
   rebota, cabecea y se inclina según el oleaje. Islas 3D grandes. 3 modos.
   Controles: ◀ ▶ + acelerador (multitáctil) / A-D + W. */
window.GAME = (function () {
let T, scene, cam, ren;
let craft, sx, sz, yaw, v, bank, timeLeft, score, streak, dead, tPlay, won;
let craftY, cvy, pitchP, rollP;
let keys = {}, water = null, waterGeo = null, baseXZ = null, colAttr = null, sprayT = 0;
let GATES = [], gGroups = [], gi = 0, laps = 0, mark = null;
let pad = null, ISL = [], vCruise = 18, vMax = 34, autoIx = null, autoBoost = false;

const cfg = { modo: 'circuito', dif: 'normal' };
try { cfg.modo = localStorage.getItem('marea_modo') || 'circuito'; cfg.dif = localStorage.getItem('marea_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 25, t: 45, laps: 2 }, normal: { v: 31, t: 38, laps: 3 }, pro: { v: 39, t: 32, laps: 3 } };
const NG = 12;

/* olas: suma de senos multi-octava (oleaje grande + chop fino) */
function waveH(x, z, t) {
  return Math.sin(x * .05 + t * 1.4) * .7
       + Math.sin(z * .043 - t * 1.0) * .8
       + Math.sin((x + z) * .09 + t * 1.8) * .68
       + Math.sin((x * .9 - z * .6) * .16 + t * 2.4) * .5
       + Math.sin((x * 1.5 + z * 1.1) * .24 - t * 3.2) * .3;
}
// color por altura: cresta blanca (espuma), valle turquesa profundo → NO flat
function foamCol(h, c, i) {
  const f = h > .8 ? Math.min(1, (h - .8) / .8) : 0;      // espuma en crestas
  const d = h < 0 ? Math.min(1, -h / 1.6) : 0;            // profundidad en valles
  c[i] = .035 * (1 - d * .4) + f * .965;
  c[i + 1] = (.30 - d * .15) + f * .70;
  c[i + 2] = (.44 - d * .18) + f * .56;
}

function buildCircuit() {
  GATES = [];
  for (let i = 0; i < NG; i++) { const a = i / NG * 6.283; const r = 155 * (.82 + .26 * Math.sin(a * 3 + .6));
    GATES.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
}

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xbfe4ee, 180, 560);
  scene.add(new T.HemisphereLight(0xffffff, 0x2a6a8a, 1.35));
  scene.add(new T.AmbientLight(0xffffff, .35));
  const sun = new T.DirectionalLight(0xfff4e0, 2.7); sun.position.set(-40, 40, -30); scene.add(sun);
  ren.toneMappingExposure = 1.16;
  // OCÉANO con olas reales + espuma (color por vértice) + reflejo del cielo
  waterGeo = new T.PlaneGeometry(1100, 1100, 96, 96); waterGeo.rotateX(-Math.PI / 2);
  const pos = waterGeo.attributes.position; baseXZ = Float32Array.from(pos.array);
  colAttr = new T.Float32BufferAttribute(new Float32Array(pos.count * 3), 3); waterGeo.setAttribute('color', colAttr);
  water = new T.Mesh(waterGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: .26, metalness: .1, envMap: sky, envMapIntensity: .6 }));
  scene.add(water);
  const glint = new T.PointLight(0xffffff, 1.6, 140); glint.position.set(-30, 10, -40); scene.add(glint);
  // MOTO DE AGUA
  let m = null;
  try { const g = await ARC.loadGLB(MDL.craft); m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(3.6 / (Math.max(s.x, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.metalness = Math.min(o.material.metalness || 0, .4); o.material.envMapIntensity = .6; } } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2; m.updateWorldMatrix(true, true); m.position.y -= new T.Box3().setFromObject(m).min.y;
  } catch (e) {}
  if (!m) { m = new T.Group();
    const hull = new T.Mesh(new T.BoxGeometry(1.5, .7, 3.6), new T.MeshStandardMaterial({ color: 0xd83a3a, roughness: .5, metalness: .2 })); hull.geometry.translate(0, .35, 0); m.add(hull);
    const nose = new T.Mesh(new T.ConeGeometry(.7, 1.3, 4), new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: .4 })); nose.rotation.x = Math.PI / 2; nose.position.set(0, .55, 2.1); m.add(nose); }
  craft = new T.Group(); craft.add(m); scene.add(craft);
  // CIRCUITO de boyas
  buildCircuit();
  const buoy = (col, dx) => { const gg = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(.9, 1.1, 2.2, 10), new T.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: .4 })); body.position.y = 1; gg.add(body);
    const top = new T.Mesh(new T.SphereGeometry(.5, 8, 8), new T.MeshBasicMaterial({ color: col })); top.position.y = 2.3; gg.add(top); gg.position.x = dx; return gg; };
  gGroups = [];
  for (let i = 0; i < NG; i++) { const grp = new T.Group();
    grp.add(buoy(0xff4455, -5.5)); grp.add(buoy(0x35e0c0, 5.5));
    const arcm = new T.Mesh(new T.TorusGeometry(5.5, .28, 8, 24, Math.PI), new T.MeshBasicMaterial({ color: 0xffe6a0 })); arcm.position.y = 3.4; arcm.rotation.z = Math.PI; grp.add(arcm);
    const nx = GATES[(i + 1) % NG], cur = GATES[i]; grp.position.set(cur.x, 0, cur.z); grp.lookAt(nx.x, 0, nx.z); scene.add(grp); gGroups.push(grp); }
  mark = new T.Mesh(new T.OctahedronGeometry(1.4), new T.MeshBasicMaterial({ color: 0x2fd1e0 })); scene.add(mark);
  // ---- ISLAS GRANDES (GLB si cargó; procedural de respaldo) + gente + pájaros ----
  LIFE.setup(T);
  let palmRoot = null; try { const pg = await ARC.loadGLB(MDL.palm); palmRoot = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palmRoot);
  let islTpl = null; try { const ig = await ARC.loadGLB(MDL.island); islTpl = ig.scene;
    islTpl.traverse(o => { if (o.isMesh) { o.frustumCulled = true; if (o.material) o.material.metalness = 0; } }); } catch (e) {}
  ISL = [{ x: 0, z: 0, r: 40 }, { x: -84, z: 62, r: 30 }, { x: 74, z: -64, r: 30 }, { x: 44, z: 96, r: 26 }, { x: -96, z: -84, r: 28 },
    { x: 290, z: 90, r: 78 }, { x: -310, z: -60, r: 82 }, { x: 96, z: 330, r: 76 }, { x: -160, z: -330, r: 80 }];
  for (const s of ISL) {
    if (islTpl) { const m2 = islTpl.clone(true); const b = new T.Box3().setFromObject(m2); const sz = b.getSize(new T.Vector3());
      const k = (s.r * 2) / (Math.max(sz.x, sz.z) || 1); m2.scale.setScalar(k); m2.updateWorldMatrix(true, true);
      const b2 = new T.Box3().setFromObject(m2); m2.position.set(s.x, -b2.min.y - 1.4, s.z); m2.rotation.y = Math.random() * 6.28; scene.add(m2); }
    else LIFE.island(scene, s.x, s.z, s.r, mkPalm);
  }
  // gente saludando en la isla central
  scene.add(LIFE.npc(10, ISL[0].r * .32, 6, 0x3a7bd5)); scene.add(LIFE.npc(-8, ISL[0].r * .32, -10, 0xffd23f));
  LIFE.flock(scene, { count: 18, area: 300, ylo: 18, yhi: 60 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  setupMenu();
}

function setupMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:46%;z-index:4;display:flex;flex-direction:column;gap:2.2vmin;align-items:center;padding:0 4%}' +
    '#mOpts .lab{font-size:2.2vmin;font-weight:800;letter-spacing:.18em;color:#bfe9f2;opacity:.9}' +
    '#mOpts .row{display:flex;gap:1.6vmin;flex-wrap:wrap;justify-content:center}' +
    '#mOpts .op{padding:1.5vmin 3.2vmin;border-radius:2.4vmin;font-size:2.5vmin;font-weight:800;color:#dff6fb;background:rgba(0,0,0,.4);border:.4vmin solid rgba(255,255,255,.18);cursor:pointer;backdrop-filter:blur(3px)}' +
    '#mOpts .op.on{background:#2fd1e0;color:#052027;border-color:#fff;box-shadow:0 0 22px #2fd1e0}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const mk = (key, opts) => { const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = key === 'modo' ? 'MODO' : 'DIFICULTAD'; box.appendChild(lab);
    const row = document.createElement('div'); row.className = 'row';
    opts.forEach(([val, txt]) => { const b = document.createElement('div'); b.className = 'op' + (cfg[key] === val ? ' on' : ''); b.textContent = txt;
      b.addEventListener('click', ev => { ev.stopPropagation(); cfg[key] = val; try { localStorage.setItem('marea_' + key, val); } catch (e) {}
        row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
    box.appendChild(row); };
  mk('modo', [['circuito', '🏁 CIRCUITO'], ['contra', '⏱️ CONTRARRELOJ'], ['libre', '🌅 LIBRE']]);
  mk('dif', [['chill', 'CHILL'], ['normal', 'NORMAL'], ['pro', 'PRO']]);
  menu.appendChild(box);
}

function placeGateAhead() {
  const a = yaw + ARC.rnd(-.6, .6), d = ARC.rnd(58, 88);
  const x = sx + Math.sin(a) * d, z = sz + Math.cos(a) * d;
  const L = Math.hypot(x, z); GATES[gi] = { x: L > 300 ? x * 300 / L : x, z: L > 300 ? z * 300 / L : z };
  gGroups[gi].position.set(GATES[gi].x, 0, GATES[gi].z); gGroups[gi].lookAt(sx, 0, sz);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal; buildCircuit();
  won = false; dead = false; score = 0; streak = 0; tPlay = 0; laps = 0; bank = 0;
  vCruise = d.v * .6; vMax = d.v * 1.18; v = vCruise; cvy = 0; pitchP = 0; rollP = 0;
  gGroups.forEach((g, i) => { g.visible = true; g.position.set(GATES[i].x, 0, GATES[i].z); const nx = GATES[(i + 1) % NG]; g.lookAt(nx.x, 0, nx.z); });
  if (cfg.modo === 'contra') { sx = 0; sz = 0; yaw = 0; gi = 0; for (let i = 1; i < NG; i++) gGroups[i].visible = false; timeLeft = d.t; placeGateAhead(); }
  else { sx = GATES[0].x; sz = GATES[0].z; yaw = Math.atan2(GATES[1].x - GATES[0].x, GATES[1].z - GATES[0].z); gi = 1; timeLeft = cfg.modo === 'libre' ? 999 : d.t; }
  craftY = waveH(sx, sz, 0) + .25;
}

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function endWin() { won = true; dead = true; const bonus = Math.round(timeLeft * 6);
  ARC.over({ win: true, score: score + bonus, title: '¡CAMPEÓN!', sub: laps + ' vueltas · +' + bonus + ' por tiempo', coins: ((score + bonus) / 30 | 0) }); }

function step(dt) {
  if (dead) return; tPlay += dt;
  if (cfg.modo !== 'libre') { timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; dead = true; ARC.over({ win: score >= 500, score, title: score >= 500 ? '¡BUENA!' : 'SE ACABÓ', coins: (score / 30 | 0) }); return; } }
  // olas: desplazar vértices + espuma en las crestas (color por vértice)
  const p = waterGeo.attributes.position.array, c = colAttr.array;
  for (let i = 0; i < p.length; i += 3) { const h = waveH(baseXZ[i], baseXZ[i + 2], tPlay); p[i + 1] = h; foamCol(h, c, i); }
  waterGeo.attributes.position.needsUpdate = true; colAttr.needsUpdate = true; waterGeo.computeVertexNormals();
  // dirección + acelerador
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const boosting = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space || keys.ShiftLeft;
  v += ((boosting ? vMax : vCruise) - v) * Math.min(1, dt * 2.2);
  yaw -= ix * dt * 1.7; bank += (ix * .5 - bank) * Math.min(1, dt * 6);
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(sx, sz); if (L > 300) { sx *= 300 / L; sz *= 300 / L; }
  for (const s of ISL) { const dx = sx - s.x, dz = sz - s.z, dd = Math.hypot(dx, dz), rr = s.r + 2.5;
    if (dd < rr && dd > .001) { sx = s.x + dx / dd * rr; sz = s.z + dz / dd * rr; v *= .55; ARC.shake(4); } }
  // ---- FÍSICA en el agua: flota (resorte), cabecea y rola con el oleaje ----
  const wy = waveH(sx, sz, tPlay), tgt = wy + .25, preVy = cvy;
  cvy += (tgt - craftY) * dt * 42 - cvy * dt * 6.5; craftY += cvy * dt;
  const e = 2.2, hx = waveH(sx + e, sz, tPlay) - waveH(sx - e, sz, tPlay), hz = waveH(sx, sz + e, tPlay) - waveH(sx, sz - e, tPlay);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const slopeF = (hx * fx + hz * fz) / (2 * e), slopeS = (hx * fz - hz * fx) / (2 * e);
  pitchP += (ARC.clamp(slopeF * 1.3, -.5, .5) - pitchP) * Math.min(1, dt * 5); rollP += (ARC.clamp(-slopeS * 1.3, -.5, .5) - rollP) * Math.min(1, dt * 5);
  craft.position.set(sx, craftY, sz);
  craft.rotation.set(0, 0, 0); craft.rotateY(yaw + Math.PI); craft.rotateZ(-bank + rollP); craft.rotateX(-pitchP - .04);
  const cd = 10; cam.position.set(sx - Math.sin(yaw) * cd, craftY + 4.2, sz - Math.cos(yaw) * cd);
  cam.lookAt(sx + Math.sin(yaw) * 8, craftY + 1.2, sz + Math.cos(yaw) * 8);
  // boyas flotan, marcador sobre la activa
  for (let i = 0; i < NG; i++) if (gGroups[i].visible) gGroups[i].position.y = waveH(GATES[i].x, GATES[i].z, tPlay);
  const g = GATES[gi], gy = waveH(g.x, g.z, tPlay);
  mark.position.set(g.x, gy + 5 + Math.sin(tPlay * 3) * .4, g.z); mark.rotation.y += dt * 2;
  LIFE.update(dt);
  // spray de agua: al andar, más al acelerar/virar, y SALPICÓN al caer de una cresta
  sprayT -= dt; if (sprayT <= 0) { sprayT = .035; const bp = worldToScreen(sx - Math.sin(yaw) * 2, craftY - .1, sz - Math.cos(yaw) * 2);
    if (bp) { const n = boosting ? 5 : 3, sp2 = boosting ? 3.4 : 2.4; ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.92)', n, sp2);
      if (Math.abs(bank) > .2) ARC.fx.burst(bp.x, bp.y, 'rgba(205,238,255,.85)', 3, 3.6); } }
  if (preVy < -5 && cvy > preVy + 2) { const bp = worldToScreen(sx, craftY - .2, sz); if (bp) { ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.95)', 10, 5); ARC.shake(3); ARC.sfx('tap', { vol: .2, rate: .6 }); } }
  // ¿cruzó la boya activa?
  const d2 = (sx - g.x) ** 2 + (sz - g.z) ** 2;
  if (d2 < 34) {
    streak++; const bonus = 3 + Math.min(3, streak * .4); if (cfg.modo !== 'libre') timeLeft += bonus; score += 40 * Math.min(4, streak);
    const sp = worldToScreen(g.x, gy + 3, g.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#ffe6a0', 16); ARC.fx.text(sp.x, sp.y - 26, cfg.modo === 'libre' ? '+' + (40 * Math.min(4, streak)) : '+' + bonus.toFixed(1) + 's', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20); ARC.shake(2);
    if (cfg.modo === 'contra') { gGroups[gi].visible = false; placeGateAhead(); gGroups[gi].visible = true; }
    else { gi = (gi + 1) % NG; if (gi === 0) { laps++; ARC.toast('VUELTA ' + laps); const d = DIF[cfg.dif] || DIF.normal; if (cfg.modo === 'circuito' && laps >= d.laps) { endWin(); return; } } }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  if (cfg.modo !== 'libre') { g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44); }
  else { g.font = '900 22px system-ui'; g.fillStyle = '#bfe9f2'; g.fillText('LIBRE', W / 2, 40); }
  g.font = '900 18px system-ui'; g.fillStyle = '#2fd1e0';
  if (cfg.modo === 'circuito') { const d = DIF[cfg.dif] || DIF.normal; g.fillText('vuelta ' + Math.min(laps + 1, d.laps) + '/' + d.laps, W / 2, 68); }
  else g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 68);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText((v * 3.6 | 0) + ' km/h', 24, 62);
  const gg = GATES[gi], gy = waveH(gg.x, gg.z, tPlay) + 3, sp = worldToScreen(gg.x, gy, gg.z);
  if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) { g.strokeStyle = '#ffe6a0'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 22 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke(); }
  else { const ang = Math.atan2(gg.x - sx, gg.z - sz) - yaw; g.save(); g.translate(W / 2, 116); g.rotate(-ang); g.fillStyle = '#ffe6a0'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill(); g.restore(); }
  if (cfg.modo !== 'contra') {
    const cxp = W - 66, cyp = 116, R = 44, k = R / 210;
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
  if (waterGeo) { const p = waterGeo.attributes.position.array, c = colAttr.array;
    for (let i = 0; i < p.length; i += 3) { const h = waveH(baseXZ[i], baseXZ[i + 2], tPlay); p[i + 1] = h; foamCol(h, c, i); }
    waterGeo.attributes.position.needsUpdate = true; colAttr.needsUpdate = true; waterGeo.computeVertexNormals(); }
  if (craft) { const wy = waveH(0, 0, tPlay); craft.position.set(0, wy + .25, 0); craft.rotation.set(0, menuA, 0); }
  if (cam) { cam.position.set(Math.cos(menuA) * 13, 4.6 + Math.sin(menuA * .7) * 1.2, Math.sin(menuA) * 13); cam.lookAt(0, 1.2, 0); }
  if (window.LIFE) LIFE.update(dt);
}

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'marea', name: 'MAREA', sub: 'laguna tropical', acc: '#2fd1e0', three: true, sky: '#3fb9c9', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), laps, gi, dead, won, x: sx | 0, z: sz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; return; } const g = GATES[gi]; const ty = Math.atan2(g.x - sx, g.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; autoIx = ARC.clamp(-dy * 2.2, -1, 1); autoBoost = true; }
  }
};
})();

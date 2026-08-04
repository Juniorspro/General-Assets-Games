/* ===== MAREA — moto de agua (laguna tropical cristalina) ===================
   Agua de pileta (arena + cáusticas), sombras en tiempo real, PILOTO real sobre
   la moto, SKINS de piloto, RIVALES NPC para competir (posición de carrera) y
   3 CIRCUITOS reales con boyas de canal. Física de flotación. */
window.GAME = (function () {
let T, scene, cam, ren;
let craft, craftTpl = null, sx, sz, yaw, v, bank, timeLeft, score, streak, dead, tPlay, won;
let craftY, cvy, pitchP, rollP;
let keys = {}, water = null, caus1 = null, caus2 = null, sprayT = 0;
let GATES = [], gGroups = [], gi = 0, laps = 0, mark = null, LANE = [];
let pad = null, ISL = [], vCruise = 18, vMax = 34, autoIx = null, autoBoost = false;
let rivals = [], place = 1;

const cfg = { modo: 'circuito', dif: 'normal', pista: 'laguna', skin: '0' };
try { for (const k in cfg) cfg[k] = localStorage.getItem('marea_' + k) || cfg[k]; } catch (e) {}
const DIF = { chill: { v: 25, t: 45, laps: 2 }, normal: { v: 31, t: 38, laps: 3 }, pro: { v: 39, t: 32, laps: 3 } };
const SKINS = [{ name: 'ROJO', outfit: 0xff4455, helmet: 0xffffff }, { name: 'AZUL', outfit: 0x3a7bd5, helmet: 0xffe14d },
  { name: 'VERDE', outfit: 0x2fbf6b, helmet: 0x0a2e1b }, { name: 'FUCSIA', outfit: 0xff2f9e, helmet: 0x22113a }];
const NG = 14, RN = 4;

function waveH(x, z, t) {
  return Math.sin(x * .18 + t * 1.6) * .14 + Math.sin(z * .16 - t * 1.3) * .15
       + Math.sin((x + z) * .30 + t * 2.4) * .07 + Math.sin((x * 1.1 - z * .7) * .5 + t * 3.4) * .04;
}

function buildCircuit() { GATES = []; const p = cfg.pista;
  for (let i = 0; i < NG; i++) { const a = i / NG * 6.283; let r;
    if (p === 'atolon') r = 180 * (.92 + .1 * Math.sin(a * 2));
    else if (p === 'bahia') r = 150 * (.72 + .4 * Math.sin(a * 2 + .4)) * (1 + .16 * Math.sin(a * 5));
    else r = 155 * (.82 + .26 * Math.sin(a * 3 + .6));
    GATES.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); } }

/* piloto: modelo GLB real (generado). Cada skin le tiñe el traje. */
let riderTpl = null;
function makeRider(sk) {
  if (riderTpl) {
    const g = riderTpl.clone(true);
    g.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone();
      o.material.color = new T.Color(sk.outfit).lerp(new T.Color(0xffffff), .45); o.castShadow = true; } });
    g.position.set(0, 1.02, -.30); return g;
  }
  return makeRiderProc(sk);
}
/* respaldo procedural si el GLB no carga */
function makeRiderProc(sk) {
  const g = new T.Group(); const M = c => new T.MeshStandardMaterial({ color: c, roughness: .62 });
  const torso = new T.Mesh(new T.CapsuleGeometry(.26, .55, 4, 8), M(sk.outfit)); torso.position.set(0, 1.0, -.05); torso.rotation.x = .5; g.add(torso);
  const head = new T.Mesh(new T.SphereGeometry(.23, 10, 10), M(sk.helmet)); head.position.set(0, 1.42, .22); g.add(head);
  const vis = new T.Mesh(new T.BoxGeometry(.34, .13, .16), M(0x0e1622)); vis.position.set(0, 1.4, .4); g.add(vis);
  const arm = a => { const r = new T.Mesh(new T.CapsuleGeometry(.075, .5, 4, 6), M(sk.outfit)); r.position.set(a * .22, 1.08, .3); r.rotation.x = 1.15; return r; };
  g.add(arm(1)); g.add(arm(-1));
  const leg = a => { const r = new T.Mesh(new T.CapsuleGeometry(.1, .5, 4, 6), M(0x1c2733)); r.position.set(a * .16, .58, .08); r.rotation.x = -.35; return r; };
  g.add(leg(1)); g.add(leg(-1));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(0, .18, -.35); return g;   // sobre el asiento, mirando adelante (+Z local)
}
function buildSki(skIdx) {
  const grp = new T.Group();
  let m;
  if (craftTpl) m = craftTpl.clone(true);
  else { m = new T.Group(); const hull = new T.Mesh(new T.BoxGeometry(1.5, .7, 3.6), new T.MeshStandardMaterial({ color: 0xd83a3a, roughness: .5 })); hull.geometry.translate(0, .35, 0); hull.castShadow = true; m.add(hull);
    const nose = new T.Mesh(new T.ConeGeometry(.7, 1.3, 4), new T.MeshStandardMaterial({ color: 0xf0f0f0 })); nose.rotation.x = Math.PI / 2; nose.position.set(0, .55, 2.1); m.add(nose); }
  grp.add(m); grp.add(makeRider(SKINS[skIdx % SKINS.length])); return grp;
}

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xbfe8f0, 220, 620);
  scene.add(new T.HemisphereLight(0xffffff, 0x3aa0c0, 1.2)); scene.add(new T.AmbientLight(0xffffff, .3));
  const sun = new T.DirectionalLight(0xfff6e6, 2.6); sun.position.set(-50, 95, -35);
  sun.castShadow = true; sun.shadow.mapSize.set(512, 512); sun.shadow.autoUpdate = true;
  { const c = sun.shadow.camera; c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 1; c.far = 200; sun.shadow.bias = -0.0009; } scene.add(sun);
  ren.toneMappingExposure = 1.16;
  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  const sand = new T.Mesh(new T.PlaneGeometry(1300, 1300), new T.MeshStandardMaterial({ map: rep(TEX.sand, 34), color: 0x9ec3b8, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -6; sand.receiveShadow = true; scene.add(sand);
  const cauMat = (n, o) => new T.MeshBasicMaterial({ map: rep(TEX.caustics, n), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: o });
  caus1 = new T.Mesh(new T.PlaneGeometry(1300, 1300), cauMat(16, .3)); caus1.rotation.x = -Math.PI / 2; caus1.position.y = -5.7; scene.add(caus1);
  caus2 = new T.Mesh(new T.PlaneGeometry(1300, 1300), cauMat(11, .2)); caus2.rotation.x = -Math.PI / 2; caus2.position.y = -5.55; scene.add(caus2);
  const bump = rep(TEX.caustics, 60);
  water = new T.Mesh(new T.PlaneGeometry(1300, 1300, 1, 1), new T.MeshStandardMaterial({ color: 0x0a86c4, transparent: true, opacity: .74, roughness: .1, metalness: .06, envMap: sky, envMapIntensity: .45, bumpMap: bump, bumpScale: .16, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.receiveShadow = true; scene.add(water);
  // plantilla de moto (orientación CORREGIDA: proa adelante)
  try { const g = await ARC.loadGLB(MDL.craft); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(3.6 / (Math.max(s.x, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) { o.material.metalness = Math.min(o.material.metalness || 0, .4); o.material.envMapIntensity = .6; } } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2; m.updateWorldMatrix(true, true); m.position.y -= new T.Box3().setFromObject(m).min.y; craftTpl = m;
  } catch (e) { craftTpl = null; }
  // PILOTO GLB real (generado): escalado a ~1.5 y apoyado en el asiento
  try { const rg = await ARC.loadGLB(MDL.rider); const r = rg.scene;
    const rb = new T.Box3().setFromObject(r); const rs = rb.getSize(new T.Vector3());
    r.scale.setScalar(1.75 / (rs.y || 1)); r.updateWorldMatrix(true, true);
    const nb2 = new T.Box3().setFromObject(r); const ctr2 = nb2.getCenter(new T.Vector3());
    r.position.x -= ctr2.x; r.position.z -= ctr2.z; r.position.y -= nb2.min.y;
    r.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) o.material.envMapIntensity = .5; } });
    riderTpl = r;
  } catch (e) { riderTpl = null; }
  craft = buildSki(+cfg.skin || 0); scene.add(craft);
  rivals = []; for (let i = 0; i < RN; i++) { const grp = buildSki(i + 1);
    grp.traverse(o => { if (o.isMesh) o.castShadow = false; });   // rivales no castean (perf)
    scene.add(grp); rivals.push({ grp, x: 0, z: 0, yaw: 0, v: 0, gi: 1, laps: 0 }); }
  // circuito + boyas de canal (pool reutilizable)
  buildCircuit();
  const buoy = (col, dx) => { const gg = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(.9, 1.1, 2.2, 10), new T.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: .4 })); body.position.y = 1; gg.add(body);
    const top = new T.Mesh(new T.SphereGeometry(.5, 8, 8), new T.MeshBasicMaterial({ color: col })); top.position.y = 2.3; gg.add(top); gg.position.x = dx; return gg; };
  gGroups = [];
  for (let i = 0; i < NG; i++) { const grp = new T.Group();
    grp.add(buoy(0xff4455, -10.6)); grp.add(buoy(0x35e0c0, 10.6));
    const arcm = new T.Mesh(new T.TorusGeometry(10.6, .3, 8, 28, Math.PI), new T.MeshBasicMaterial({ color: 0xffe6a0 })); arcm.position.y = 3.4; arcm.rotation.z = Math.PI; grp.add(arcm);
    scene.add(grp); gGroups.push(grp); }
  // CINTAS AZULES: dos bordes continuos que delimitan la pista (no puntos)
  const tapeMat = new T.MeshBasicMaterial({ color: 0x1f6fe0, transparent: true, opacity: .95, side: T.DoubleSide });
  const tapeMat2 = new T.MeshBasicMaterial({ color: 0x0d3f96, transparent: true, opacity: .8, side: T.DoubleSide });
  LANE = [];
  for (let side = 0; side < 2; side++) {
    const seg = NG * 8;                                  // subdividido: curvas suaves
    const geo = new T.PlaneGeometry(1, 1, seg, 1);        // se deforma en layoutTrack
    const m = new T.Mesh(geo, side ? tapeMat2 : tapeMat);
    m.frustumCulled = false; scene.add(m); LANE.push({ m, geo, seg, side });
  }
  mark = new T.Mesh(new T.OctahedronGeometry(1.4), new T.MeshBasicMaterial({ color: 0x2fd1e0 })); scene.add(mark);
  layoutTrack();
  // islas + gente + pájaros
  LIFE.setup(T);
  let palmRoot = null; try { const pg = await ARC.loadGLB(MDL.palm); palmRoot = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palmRoot);
  let islTpl = null; try { const ig = await ARC.loadGLB(MDL.island); islTpl = ig.scene; islTpl.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; if (o.material) o.material.metalness = 0; } }); } catch (e) {}
  ISL = [{ x: 0, z: 0, r: 40 }, { x: -84, z: 62, r: 30 }, { x: 74, z: -64, r: 30 }, { x: 44, z: 96, r: 26 }, { x: -96, z: -84, r: 28 },
    { x: 290, z: 90, r: 78 }, { x: -310, z: -60, r: 82 }, { x: 96, z: 330, r: 76 }, { x: -160, z: -330, r: 80 }];
  for (const s of ISL) {
    if (islTpl) { const m2 = islTpl.clone(true); const b = new T.Box3().setFromObject(m2); const sz = b.getSize(new T.Vector3());
      const k = (s.r * 2) / (Math.max(sz.x, sz.z) || 1); m2.scale.setScalar(k); m2.updateWorldMatrix(true, true);
      const b2 = new T.Box3().setFromObject(m2); m2.position.set(s.x, -b2.min.y - 1.4, s.z); m2.rotation.y = Math.random() * 6.28; scene.add(m2); }
    else LIFE.island(scene, s.x, s.z, s.r, mkPalm);
  }
  scene.add(LIFE.npc(10, ISL[0].r * .32, 6, 0x3a7bd5)); scene.add(LIFE.npc(-8, ISL[0].r * .32, -10, 0xffd23f));
  LIFE.flock(scene, { count: 20, area: 300, ylo: 18, yhi: 60 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  setupMenu();
}

/* punto de la pista interpolado suave (Catmull-Rom cerrada sobre GATES) */
function trackPt(u) {
  const n = NG, f = u * n, i = Math.floor(f), t = f - i;
  const p0 = GATES[(i - 1 + n) % n], p1 = GATES[i % n], p2 = GATES[(i + 1) % n], p3 = GATES[(i + 2) % n];
  const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), z: cr(p0.z, p1.z, p2.z, p3.z) };
}
const TAPE_W = 11;                 // media anchura de la pista (borde a borde = 22)
function layoutTrack() {           // puertas + CINTAS azules continuas
  for (let i = 0; i < NG; i++) { const nx = GATES[(i + 1) % NG]; gGroups[i].position.set(GATES[i].x, 0, GATES[i].z); gGroups[i].lookAt(nx.x, 0, nx.z); gGroups[i].visible = true; }
  for (const L of LANE) {
    const pos = L.geo.attributes.position, seg = L.seg, sgn = L.side ? 1 : -1;
    for (let k = 0; k <= seg; k++) {
      const u = k / seg, a = trackPt(u), b = trackPt((u + 1 / seg / 2) % 1);
      const dx = b.x - a.x, dz = b.z - a.z, dl = Math.hypot(dx, dz) || 1;
      const nx2 = -dz / dl * sgn * TAPE_W, nz2 = dx / dl * sgn * TAPE_W;
      const cx = a.x + nx2, cz = a.z + nz2;
      pos.setXYZ(k, cx, 1.15, cz);              // borde alto de la cinta
      pos.setXYZ(seg + 1 + k, cx, .05, cz);     // borde bajo (al agua)
    }
    pos.needsUpdate = true; L.geo.computeVertexNormals();
    L.m.position.set(0, 0, 0); L.m.rotation.set(0, 0, 0);
  }
}

const LABELS = { modo: 'MODO', dif: 'DIFICULTAD', pista: 'CIRCUITO', skin: 'PILOTO' };
function setupMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:30%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center;padding:0 4%}' +
    '#mOpts .lab{font-size:2vmin;font-weight:800;letter-spacing:.18em;color:#bfe9f2;opacity:.9}' +
    '#mOpts .row{display:flex;gap:1.4vmin;flex-wrap:wrap;justify-content:center}' +
    '#mOpts .op{padding:1.2vmin 2.8vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#dff6fb;background:rgba(0,0,0,.4);border:.4vmin solid rgba(255,255,255,.18);cursor:pointer;pointer-events:auto;backdrop-filter:blur(3px)}' +
    '#mOpts .op.on{background:#2fd1e0;color:#052027;border-color:#fff;box-shadow:0 0 22px #2fd1e0}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const mk = (key, opts) => { const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = LABELS[key]; box.appendChild(lab);
    const row = document.createElement('div'); row.className = 'row';
    opts.forEach(([val, txt]) => { const b = document.createElement('div'); b.className = 'op' + (cfg[key] === val ? ' on' : ''); b.textContent = txt;
      b.addEventListener('click', ev => { ev.stopPropagation(); cfg[key] = val; try { localStorage.setItem('marea_' + key, val); } catch (e) {} row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
    box.appendChild(row); };
  mk('modo', [['circuito', '🏁 CIRCUITO'], ['contra', '⏱️ CONTRA'], ['libre', '🌅 LIBRE']]);
  mk('pista', [['laguna', '🏝️ LAGUNA'], ['atolon', '🌀 ATOLÓN'], ['bahia', '⚓ BAHÍA']]);
  mk('dif', [['chill', 'CHILL'], ['normal', 'NORMAL'], ['pro', 'PRO']]);
  mk('skin', [['0', '🔴'], ['1', '🔵'], ['2', '🟢'], ['3', '🟣']]);
  menu.appendChild(box);
}

function placeGateAhead() { const a = yaw + ARC.rnd(-.6, .6), d = ARC.rnd(58, 88);
  const x = sx + Math.sin(a) * d, z = sz + Math.cos(a) * d; const L = Math.hypot(x, z);
  GATES[gi] = { x: L > 300 ? x * 300 / L : x, z: L > 300 ? z * 300 / L : z }; gGroups[gi].position.set(GATES[gi].x, 0, GATES[gi].z); gGroups[gi].lookAt(sx, 0, sz); }

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  if (craft) scene.remove(craft); craft = buildSki(+cfg.skin || 0); scene.add(craft);   // aplica skin elegido
  buildCircuit(); layoutTrack();
  won = false; dead = false; score = 0; streak = 0; tPlay = 0; laps = 0; bank = 0;
  vCruise = d.v * .6; vMax = d.v * 1.18; v = vCruise; cvy = 0; pitchP = 0; rollP = 0;
  const showRiv = cfg.modo !== 'contra';
  if (cfg.modo === 'contra') { sx = 0; sz = 0; yaw = 0; gi = 0; for (let i = 1; i < NG; i++) gGroups[i].visible = false; timeLeft = d.t; placeGateAhead(); }
  else { sx = GATES[0].x; sz = GATES[0].z; yaw = Math.atan2(GATES[1].x - GATES[0].x, GATES[1].z - GATES[0].z); gi = 1; timeLeft = cfg.modo === 'libre' ? 999 : d.t; }
  rivals.forEach((r, i) => { r.gi = 1; r.laps = 0; r.v = vCruise * (.96 + i * .05);
    const off = (i - (RN - 1) / 2) * 6; r.x = GATES[0].x + off; r.z = GATES[0].z; r.yaw = yaw; r.grp.visible = showRiv; });
  place = 1; craftY = waveH(sx, sz, 0) + .25;
}

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }
function endWin() { won = true; dead = true; const bonus = Math.round(timeLeft * 6) + (RN + 1 - place) * 120;
  ARC.over({ win: place <= 1, score: score + bonus, title: place <= 1 ? '¡1º · CAMPEÓN!' : place + 'º PUESTO', sub: laps + ' vueltas · P' + place + '/' + (RN + 1), coins: ((score + bonus) / 30 | 0) }); }

function step(dt) {
  if (dead) return; tPlay += dt; const t = tPlay;
  if (cfg.modo !== 'libre') { timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; dead = true; ARC.over({ win: false, score, title: 'SE ACABÓ', sub: 'P' + place + '/' + (RN + 1), coins: (score / 30 | 0) }); return; } }
  caus1.material.map.offset.set(t * .012, t * .009); caus2.material.map.offset.set(-t * .009, t * .013); water.material.bumpMap.offset.set(t * .02, t * .016);
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
  const wy = waveH(sx, sz, t), tgt = wy + .22, preVy = cvy;
  cvy += (tgt - craftY) * dt * 42 - cvy * dt * 6.5; craftY += cvy * dt;
  const e = 2.2, hx = waveH(sx + e, sz, t) - waveH(sx - e, sz, t), hz = waveH(sx, sz + e, t) - waveH(sx, sz - e, t);
  const fx = Math.sin(yaw), fz = Math.cos(yaw), slopeF = (hx * fx + hz * fz) / (2 * e), slopeS = (hx * fz - hz * fx) / (2 * e);
  pitchP += (ARC.clamp(slopeF * 2.4, -.4, .4) - pitchP) * Math.min(1, dt * 5); rollP += (ARC.clamp(-slopeS * 2.4, -.4, .4) - rollP) * Math.min(1, dt * 5);
  craft.position.set(sx, craftY, sz); craft.rotation.set(0, 0, 0); craft.rotateY(yaw); craft.rotateZ(-bank + rollP); craft.rotateX(-pitchP - .04);
  const cd = 10; cam.position.set(sx - Math.sin(yaw) * cd, craftY + 4.2, sz - Math.cos(yaw) * cd); cam.lookAt(sx + Math.sin(yaw) * 8, craftY + 1.2, sz + Math.cos(yaw) * 8);
  // rivales
  if (cfg.modo !== 'contra') { for (const r of rivals) {
      const g2 = GATES[r.gi]; const ty = Math.atan2(g2.x - r.x, g2.z - r.z); let dy = ty - r.yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      r.yaw += ARC.clamp(dy, -1, 1) * dt * 2; r.x += Math.sin(r.yaw) * r.v * dt; r.z += Math.cos(r.yaw) * r.v * dt;
      const ry = waveH(r.x, r.z, t); r.grp.position.set(r.x, ry + .22, r.z); r.grp.rotation.set(0, 0, 0); r.grp.rotateY(r.yaw);
      if ((r.x - g2.x) ** 2 + (r.z - g2.z) ** 2 < 42) { r.gi = (r.gi + 1) % NG; if (r.gi === 0) r.laps++; } }
    const prog = e2 => e2.laps * 1000 + e2.gi * 20 - Math.hypot(GATES[e2.gi].x - e2.x, GATES[e2.gi].z - e2.z) * .01;
    const me = laps * 1000 + gi * 20 - Math.hypot(GATES[gi].x - sx, GATES[gi].z - sz) * .01;
    place = 1; for (const r of rivals) if (prog(r) > me) place++;
  }
  for (let i = 0; i < NG; i++) if (gGroups[i].visible) gGroups[i].position.y = waveH(GATES[i].x, GATES[i].z, t);
  const g = GATES[gi], gy = waveH(g.x, g.z, t);
  mark.position.set(g.x, gy + 5 + Math.sin(t * 3) * .4, g.z); mark.rotation.y += dt * 2;
  LIFE.update(dt);
  sprayT -= dt; if (sprayT <= 0) { sprayT = .035; const bp = worldToScreen(sx - Math.sin(yaw) * 2, craftY - .1, sz - Math.cos(yaw) * 2);
    if (bp) { const n = boosting ? 5 : 3, sp2 = boosting ? 3.4 : 2.4; ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.92)', n, sp2); if (Math.abs(bank) > .2) ARC.fx.burst(bp.x, bp.y, 'rgba(205,238,255,.85)', 3, 3.6); } }
  if (preVy < -4 && cvy > preVy + 2) { const bp = worldToScreen(sx, craftY - .2, sz); if (bp) { ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.95)', 9, 5); ARC.shake(2); } }
  const d2 = (sx - g.x) ** 2 + (sz - g.z) ** 2;
  if (d2 < 34) {
    streak++; const bonus = 3 + Math.min(3, streak * .4); if (cfg.modo !== 'libre') timeLeft += bonus; score += 40 * Math.min(4, streak);
    const sp = worldToScreen(g.x, gy + 3, g.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#ffe6a0', 16); ARC.fx.text(sp.x, sp.y - 26, cfg.modo === 'libre' ? '+' + (40 * Math.min(4, streak)) : '+' + bonus.toFixed(1) + 's', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20); ARC.shake(2);
    if (cfg.modo === 'contra') { gGroups[gi].visible = false; placeGateAhead(); gGroups[gi].visible = true; }
    else { gi = (gi + 1) % NG; if (gi === 0) { laps++; ARC.toast('VUELTA ' + laps + ' · P' + place); const d = DIF[cfg.dif] || DIF.normal; if (cfg.modo === 'circuito' && laps >= d.laps) { endWin(); return; } } }
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
  if (cfg.modo !== 'contra') { g.font = '900 24px system-ui'; g.fillStyle = place <= 1 ? '#ffe6a0' : '#fff'; g.fillText('P' + place + '/' + (RN + 1), 24, 96); }
  const gg = GATES[gi], gy = waveH(gg.x, gg.z, tPlay) + 3, sp = worldToScreen(gg.x, gy, gg.z);
  if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) { g.strokeStyle = '#ffe6a0'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 22 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke(); }
  else { const ang = Math.atan2(gg.x - sx, gg.z - sz) - yaw; g.save(); g.translate(W / 2, 130); g.rotate(-ang); g.fillStyle = '#ffe6a0'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill(); g.restore(); }
  if (cfg.modo !== 'contra') {
    const cxp = W - 66, cyp = 116, R = 44, k = R / 210;
    g.fillStyle = 'rgba(6,20,28,.55)'; g.beginPath(); g.arc(cxp, cyp, R + 8, 0, 6.28); g.fill();
    g.strokeStyle = 'rgba(120,220,240,.5)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= NG; i++) { const q = GATES[i % NG]; const mx = cxp + q.x * k, my = cyp + q.z * k; i ? g.lineTo(mx, my) : g.moveTo(mx, my); } g.closePath(); g.stroke();
    for (const r of rivals) { g.fillStyle = 'rgba(255,90,110,.9)'; g.beginPath(); g.arc(cxp + r.x * k, cyp + r.z * k, 2.4, 0, 6.28); g.fill(); }
    g.fillStyle = '#ffe6a0'; g.beginPath(); g.arc(cxp + GATES[gi].x * k, cyp + GATES[gi].z * k, 4, 0, 6.28); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cxp + sx * k, cyp + sz * k, 3.4, 0, 6.28); g.fill();
  }
  if (pad) pad.draw(g, '#2fd1e0');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .4; tPlay = (tPlay || 0) + dt;
  if (caus1) { caus1.material.map.offset.set(tPlay * .012, tPlay * .009); caus2.material.map.offset.set(-tPlay * .009, tPlay * .013); water.material.bumpMap.offset.set(tPlay * .02, tPlay * .016); }
  if (craft) { const wy = waveH(0, 0, tPlay); craft.position.set(0, wy + .22, 0); craft.rotation.set(0, menuA, 0); }
  if (cam) { cam.position.set(Math.cos(menuA) * 12, 4.4 + Math.sin(menuA * .7) * 1.1, Math.sin(menuA) * 12); cam.lookAt(0, 1.1, 0); }
  if (window.LIFE) LIFE.update(dt);
}

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'marea', name: 'MAREA', sub: 'laguna tropical', acc: '#2fd1e0', three: true, sky: '#3fb9c9', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), laps, gi, place, dead, won, x: sx | 0, z: sz | 0 }),
    autoPlay() { if (dead) { autoIx = 0; autoBoost = false; return; } const g = GATES[gi]; const ty = Math.atan2(g.x - sx, g.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; autoIx = ARC.clamp(-dy * 2.2, -1, 1); autoBoost = true; }
  }
};
})();

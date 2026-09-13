/* ===== MAREA — moto de agua (laguna tropical cristalina) ===================
   Agua de pileta (arena + cáusticas), sombras en tiempo real que SIGUEN al
   jugador, PILOTO real sobre la moto, SKINS, RIVALES NPC que corren de verdad
   (colisionan, aceleran y pueden ganar) y 3 CIRCUITOS con boyas de canal
   TRAZADOS FUERA DE LAS ISLAS. Cámara de 3ª persona interpolada, con anti
   oclusión contra las islas y altura filtrada (la ola mueve la moto, no la
   vista). Física de flotación con resorte bien amortiguado. */
window.GAME = (function () {
let T, scene, cam, ren, sun, sunT;
let craft, craftTpl = null, sx, sz, yaw, v, bank, timeLeft, score, streak, dead, tPlay, won;
let craftY, cvy, pitchP, rollP;
let keys = {}, water = null, caus1 = null, caus2 = null, sprayT = 0;
let GATES = [], gGroups = [], gi = 0, laps = 0, mark = null, LANE = [], WP = [];
let pad = null, vCruise = 18, vMax = 34, autoIx = null, autoBoost = false;
let rivals = [], place = 1, tintOutfit = [], tintHelmet = [];
let camPx = 0, camPy = 6, camPz = 0, camLx = 0, camLy = 1, camLz = 0, camYs = 4.3, camDA = 0;
let hitI = false, hitT = 0, offT = 0, sinceGate = 0, optsBox = null;

const cfg = { modo: 'circuito', dif: 'normal', pista: 'laguna', skin: '0' };
try { for (const k in cfg) cfg[k] = localStorage.getItem('marea_' + k) || cfg[k]; } catch (e) {}
const DIF = { chill: { v: 25, t: 46, laps: 2 }, normal: { v: 31, t: 40, laps: 3 }, pro: { v: 39, t: 34, laps: 3 } };
const SKINS = [{ name: 'ROJO', outfit: 0xff4455, helmet: 0xffffff }, { name: 'AZUL', outfit: 0x3a7bd5, helmet: 0xffe14d },
  { name: 'VERDE', outfit: 0x2fbf6b, helmet: 0x0a2e1b }, { name: 'FUCSIA', outfit: 0xff2f9e, helmet: 0x22113a }];
const NG = 14, RN = 4, WPN = NG * 3;

/* ISLAS: definidas a nivel de módulo porque el trazado de la pista las esquiva.
   Central (r40) + 2 chicas en el hueco interior + 2 medianas y 4 grandes AFUERA
   del corredor de carrera (radio de pista 100..190). */
const ISL = [{ x: 0, z: 0, r: 40 },
  { x: -58, z: 34, r: 16 }, { x: 52, z: -44, r: 15 },
  { x: -143, z: 205, r: 28 }, { x: 143, z: -205, r: 26 },
  { x: 290, z: 90, r: 78 }, { x: -310, z: -60, r: 82 }, { x: 96, z: 330, r: 76 }, { x: -160, z: -330, r: 80 }];
const R_CLAMP = 300, GATE_CLR = 15;   // margen mínimo puerta/corredor ↔ orilla

function waveH(x, z, t) {
  return Math.sin(x * .18 + t * 1.6) * .14 + Math.sin(z * .16 - t * 1.3) * .15
       + Math.sin((x + z) * .30 + t * 2.4) * .07 + Math.sin((x * 1.1 - z * .7) * .5 + t * 3.4) * .04;
}

/* ---- circuito: anillo limpio (radio 100..190) + red de seguridad que empuja
   cualquier tramo que quede dentro de una isla --------------------------- */
function buildCircuit() { GATES = []; const p = cfg.pista;
  for (let i = 0; i < NG; i++) { const a = i / NG * 6.283185; let r;
    if (p === 'atolon') r = 175 * (1 + .07 * Math.sin(a * 2));
    else if (p === 'bahia') r = 145 * (1 + .30 * Math.sin(a * 2 + .4));
    else r = 150 * (1 + .22 * Math.sin(a * 3 + .6));
    GATES.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  separateTrack();
}
/* relaja las puertas hasta que NINGÚN punto de la línea central quede a menos
   de (radio de isla + GATE_CLR): así ni las puertas ni las cintas pisan arena */
function separateTrack() {
  const SAMP = NG * 8;
  for (let it = 0; it < 140; it++) {
    const ax = new Array(NG).fill(0), az = new Array(NG).fill(0), aw = new Array(NG).fill(0);
    let worst = 0;
    for (let k = 0; k < SAMP; k++) {
      const u = k / SAMP, p = trackPt(u), f = u * NG, i0 = Math.floor(f) % NG, i1 = (i0 + 1) % NG, t = f - Math.floor(f);
      for (const s of ISL) {
        let dx = p.x - s.x, dz = p.z - s.z, dd = Math.hypot(dx, dz); const need = s.r + GATE_CLR;
        if (dd < need) { if (dd < .001) { dx = 1; dz = 0; dd = 1; }
          const push = need - dd; if (push > worst) worst = push;
          const ux = dx / dd, uz = dz / dd, w0 = 1 - t, w1 = t;
          ax[i0] += ux * push * w0; az[i0] += uz * push * w0; aw[i0] += w0;
          ax[i1] += ux * push * w1; az[i1] += uz * push * w1; aw[i1] += w1; } }
    }
    if (worst < .08) break;
    for (let i = 0; i < NG; i++) if (aw[i] > 0) { GATES[i].x += ax[i] / aw[i] * .6; GATES[i].z += az[i] / aw[i] * .6; }
    const sm = GATES.map((g, i) => { const a = GATES[(i - 1 + NG) % NG], b = GATES[(i + 1) % NG];
      return { x: g.x * .86 + (a.x + b.x) * .07, z: g.z * .86 + (a.z + b.z) * .07 }; });
    for (let i = 0; i < NG; i++) { const L = Math.hypot(sm[i].x, sm[i].z);
      if (L > 250) { sm[i].x *= 250 / L; sm[i].z *= 250 / L; } GATES[i] = sm[i]; }
  }
}

/* piloto: modelo GLB real (generado). Cada skin le tiñe el traje. */
let riderTpl = null;
function makeRider(sk, outfit, helm) {
  if (riderTpl) {
    const g = riderTpl.clone(true);
    g.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone();
      o.material.color = new T.Color(sk.outfit).lerp(new T.Color(0xffffff), .45);
      if (o.material.emissive) o.material.emissive.setRGB(0, 0, 0);
      o.material.envMapIntensity = .5; o.castShadow = true; if (outfit) outfit.push(o.material); } });
    g.position.set(0, 1.02, -.30); return g;
  }
  return makeRiderProc(sk, outfit, helm);
}
/* respaldo procedural si el GLB no carga */
function makeRiderProc(sk, outfit, helm) {
  const g = new T.Group(); const M = c => new T.MeshStandardMaterial({ color: c, roughness: .62 });
  const mo = M(sk.outfit), mh = M(sk.helmet); if (outfit) outfit.push(mo); if (helm) helm.push(mh);
  const torso = new T.Mesh(new T.CapsuleGeometry(.26, .55, 4, 8), mo); torso.position.set(0, 1.0, -.05); torso.rotation.x = .5; g.add(torso);
  const head = new T.Mesh(new T.SphereGeometry(.23, 10, 10), mh); head.position.set(0, 1.42, .22); g.add(head);
  const vis = new T.Mesh(new T.BoxGeometry(.34, .13, .16), M(0x0e1622)); vis.position.set(0, 1.4, .4); g.add(vis);
  const arm = a => { const r = new T.Mesh(new T.CapsuleGeometry(.075, .5, 4, 6), mo); r.position.set(a * .22, 1.08, .3); r.rotation.x = 1.15; return r; };
  g.add(arm(1)); g.add(arm(-1));
  const leg = a => { const r = new T.Mesh(new T.CapsuleGeometry(.1, .5, 4, 6), M(0x1c2733)); r.position.set(a * .16, .58, .08); r.rotation.x = -.35; return r; };
  g.add(leg(1)); g.add(leg(-1));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(0, .18, -.35); return g;   // sobre el asiento, mirando adelante (+Z local)
}
function buildSki(skIdx, outfit, helm) {
  const grp = new T.Group();
  let m;
  if (craftTpl) m = craftTpl.clone(true);
  else { m = new T.Group(); const hull = new T.Mesh(new T.BoxGeometry(1.5, .7, 3.6), new T.MeshStandardMaterial({ color: 0xd83a3a, roughness: .5 })); hull.geometry.translate(0, .35, 0); hull.castShadow = true; m.add(hull);
    const nose = new T.Mesh(new T.ConeGeometry(.7, 1.3, 4), new T.MeshStandardMaterial({ color: 0xf0f0f0 })); nose.rotation.x = Math.PI / 2; nose.position.set(0, .55, 2.1); m.add(nose); }
  grp.add(m); grp.add(makeRider(SKINS[skIdx % SKINS.length], outfit, helm)); return grp;
}
/* re-tiñe el piloto YA construido (sin recrear la moto en cada partida) */
function tintCraft(skIdx) { const sk = SKINS[skIdx % SKINS.length];
  const c = new T.Color(sk.outfit).lerp(new T.Color(0xffffff), riderTpl ? .45 : 0);
  for (const m of tintOutfit) m.color.copy(c);
  for (const m of tintHelmet) m.color.set(sk.helmet); }

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  sky.wrapS = T.RepeatWrapping;
  scene.background = sky; scene.environment = sky;
  // niebla ACOTADA al plano lejano de la cámara (400): el mundo se funde, no se corta
  scene.fog = new T.Fog(0xbfe8f0, 150, 392);
  scene.add(new T.HemisphereLight(0xffffff, 0x3aa0c0, 1.2)); scene.add(new T.AmbientLight(0xffffff, .3));
  sun = new T.DirectionalLight(0xfff6e6, 2.6); sun.position.set(-62, 68, -46);   // más bajo: la sombra se VE
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.autoUpdate = true;
  { const c = sun.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 240; sun.shadow.bias = -0.0009; }
  scene.add(sun); sunT = new T.Object3D(); scene.add(sunT); sun.target = sunT;   // el sol SIGUE al jugador
  ren.toneMappingExposure = 1.16;
  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  const sand = new T.Mesh(new T.PlaneGeometry(1000, 1000), new T.MeshStandardMaterial({ map: rep(TEX.sand, 26), color: 0x9ec3b8, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = -6; sand.receiveShadow = true; scene.add(sand);
  const cauMat = (n, o) => new T.MeshBasicMaterial({ map: rep(TEX.caustics, n), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: o });
  caus1 = new T.Mesh(new T.PlaneGeometry(1000, 1000), cauMat(13, .3)); caus1.rotation.x = -Math.PI / 2; caus1.position.y = -5.7; scene.add(caus1);
  caus2 = new T.Mesh(new T.PlaneGeometry(1000, 1000), cauMat(9, .2)); caus2.rotation.x = -Math.PI / 2; caus2.position.y = -5.55; scene.add(caus2);
  const bump = rep(TEX.caustics, 46);
  water = new T.Mesh(new T.PlaneGeometry(1000, 1000, 1, 1), new T.MeshStandardMaterial({ color: 0x0a86c4, transparent: true, opacity: .74, roughness: .1, metalness: .06, envMap: sky, envMapIntensity: .45, bumpMap: bump, bumpScale: .16, depthWrite: false }));
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
  // la moto del jugador se construye UNA vez (después sólo se re-tiñe el piloto)
  craft = buildSki(+cfg.skin || 0, tintOutfit, tintHelmet); scene.add(craft);
  rivals = []; for (let i = 0; i < RN; i++) { const grp = buildSki(i + 1);
    grp.traverse(o => { if (o.isMesh) o.castShadow = false; });   // rivales no castean (perf)
    scene.add(grp); rivals.push({ grp, x: 0, z: 0, yaw: 0, v: 0, vBase: 20, wi: 1, laps: 0 }); }
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
  for (const s of ISL) {
    if (islTpl) { const m2 = islTpl.clone(true); const b = new T.Box3().setFromObject(m2); const sz = b.getSize(new T.Vector3());
      const k = (s.r * 2) / (Math.max(sz.x, sz.z) || 1); m2.scale.setScalar(k); m2.updateWorldMatrix(true, true);
      const b2 = new T.Box3().setFromObject(m2); m2.position.set(s.x, -b2.min.y - 1.4, s.z); m2.rotation.y = (s.x * .7 + s.z * .3) % 6.28; scene.add(m2); }
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
/* anchura ACOTADA por la curvatura local: una cinta más ancha que el radio de
   curvatura se plegaría sobre sí misma (le pasaba a BAHÍA) */
function tapeWidth(u) { const h = 1 / (NG * 16);
  const a = trackPt((u - h + 1) % 1), b = trackPt(u), c = trackPt((u + h) % 1);
  const ax = b.x - a.x, az = b.z - a.z, bx = c.x - b.x, bz = c.z - b.z;
  const A = Math.hypot(ax, az), B = Math.hypot(bx, bz), C = Math.hypot(c.x - a.x, c.z - a.z);
  const ar = Math.abs(ax * bz - az * bx) / 2, R = ar > 1e-7 ? A * B * C / (4 * ar) : 1e9;
  return Math.min(TAPE_W, R * .7); }
function insideIsl(x, z, m) { for (const s of ISL) { const dx = x - s.x, dz = z - s.z; if (dx * dx + dz * dz < (s.r + (m || 0)) * (s.r + (m || 0))) return true; } return false; }
function layoutTrack() {           // puertas + CINTAS azules continuas
  for (let i = 0; i < NG; i++) { const nx = GATES[(i + 1) % NG]; gGroups[i].position.set(GATES[i].x, 0, GATES[i].z); gGroups[i].lookAt(nx.x, 0, nx.z); gGroups[i].visible = true; }
  for (const L of LANE) {
    const pos = L.geo.attributes.position, seg = L.seg, sgn = L.side ? 1 : -1;
    for (let k = 0; k <= seg; k++) {
      const u = k / seg, a = trackPt(u), b = trackPt((u + 1 / seg / 2) % 1);
      const dx = b.x - a.x, dz = b.z - a.z, dl = Math.hypot(dx, dz) || 1, w = tapeWidth(u);
      const nx2 = -dz / dl * sgn * w, nz2 = dx / dl * sgn * w;
      const cx = a.x + nx2, cz = a.z + nz2;
      const hi = insideIsl(cx, cz, 0) ? .02 : 1.15;      // red de seguridad: si pisa arena, se aplasta
      pos.setXYZ(k, cx, hi, cz);                 // borde alto de la cinta
      pos.setXYZ(seg + 1 + k, cx, .05, cz);      // borde bajo (al agua)
    }
    pos.needsUpdate = true; L.geo.computeVertexNormals();
    L.m.position.set(0, 0, 0); L.m.rotation.set(0, 0, 0);
  }
}
function buildWPs() { WP = []; for (let i = 0; i < WPN; i++) WP.push(trackPt(i / WPN)); }

const LABELS = { modo: 'MODO', dif: 'DIFICULTAD', pista: 'CIRCUITO', skin: 'PILOTO' };
function setupMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  // OJO: las medidas vmin/vh son del VIEWPORT, no del stage 960x540 ⇒ en 4:3 el
  // panel crecía y tapaba JUGAR. Se ancla al hueco libre y la escala se calcula
  // en px desde la altura real del stage (fitOpts).
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:11%;bottom:33%;z-index:4;pointer-events:none;display:flex;' +
    'flex-direction:column;gap:.34em;align-items:center;justify-content:center;overflow:auto;padding:0 3%;font-size:16px}' +
    '#mOpts .lab{font-size:.72em;font-weight:800;letter-spacing:.16em;color:#bfe9f2;opacity:.9}' +
    '#mOpts .row{display:flex;gap:.5em;flex-wrap:wrap;justify-content:center}' +
    '#mOpts .op{padding:.42em 1em;border-radius:.9em;font-size:1em;font-weight:800;color:#dff6fb;background:rgba(0,0,0,.42);' +
    'border:.1em solid rgba(255,255,255,.18);cursor:pointer;pointer-events:auto;backdrop-filter:blur(3px);white-space:nowrap}' +
    '#mOpts .op.on{background:#2fd1e0;color:#052027;border-color:#fff;box-shadow:0 0 .9em #2fd1e0}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts'; optsBox = box;
  const mk = (key, opts) => { const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = LABELS[key]; box.appendChild(lab);
    const row = document.createElement('div'); row.className = 'row';
    opts.forEach(([val, txt]) => { const b = document.createElement('div'); b.className = 'op' + (cfg[key] === val ? ' on' : ''); b.textContent = txt;
      b.addEventListener('click', ev => { ev.stopPropagation(); cfg[key] = val; try { localStorage.setItem('marea_' + key, val); } catch (e) {} row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
    box.appendChild(row); };
  mk('modo', [['circuito', '🏁 CIRCUITO'], ['contra', '⏱️ CONTRA'], ['libre', '🌅 LIBRE']]);
  mk('pista', [['laguna', '🏝️ LAGUNA'], ['atolon', '🌀 ATOLÓN'], ['bahia', '⚓ BAHÍA']]);
  mk('dif', [['chill', 'CHILL'], ['normal', 'NORMAL'], ['pro', 'PRO']]);
  mk('skin', [['0', '🔴'], ['1', '🔵'], ['2', '🟢'], ['3', '🟣']]);
  menu.appendChild(box); fitOpts();
}
function fitOpts() { if (!optsBox) return; const st = document.getElementById('stage'); if (!st) return;
  const h = parseFloat(st.style.height) || st.getBoundingClientRect().height || 540;
  optsBox.style.fontSize = Math.max(9, h * .036) + 'px'; }

/* la puerta del modo CONTRA: en agua abierta Y con línea limpia desde la moto
   (si no, el jugador quedaba embistiendo una isla para llegar a ella) */
function clearLine(x, z) { for (let k = 1; k <= 12; k++) { const t = k / 12;
    if (insideIsl(sx + (x - sx) * t, sz + (z - sz) * t, 6)) return false; } return true; }
function placeGateAhead() { let x = sx, z = sz, best = null;
  for (let tr = 0; tr < 30; tr++) { const a = yaw + ARC.rnd(-.9, .9), d = ARC.rnd(58, 88);
    x = sx + Math.sin(a) * d; z = sz + Math.cos(a) * d;
    const L = Math.hypot(x, z); if (L > 270) { x *= 270 / L; z *= 270 / L; }
    if (!insideIsl(x, z, 14)) { best = { x, z }; if (clearLine(x, z)) break; } }
  if (best) { x = best.x; z = best.z; }
  GATES[gi] = { x, z }; gGroups[gi].position.set(x, 0, z); gGroups[gi].lookAt(sx, 0, sz); }

/* ---- colisión compartida (jugador Y rivales) + clamp de mundo ---------- */
const _P = { x: 0, z: 0, nx: 1, nz: 0 };
function collide(o) { let hit = false;
  const L = Math.hypot(o.x, o.z); if (L > R_CLAMP) { o.x *= R_CLAMP / L; o.z *= R_CLAMP / L; }
  for (const s of ISL) { let dx = o.x - s.x, dz = o.z - s.z, dd = Math.hypot(dx, dz); const rr = s.r + 2.5;
    if (dd < rr) { if (dd < .001) { dx = 1; dz = 0; dd = 1; }   // dd==0 también expulsa
      const nx = dx / dd, nz = dz / dd; o.x = s.x + nx * rr; o.z = s.z + nz * rr;
      o.nx = nx; o.nz = nz; hit = true; } }
  return hit; }

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  keys = {}; autoIx = null; autoBoost = false;               // sin estado de la partida anterior
  tintCraft(+cfg.skin || 0);                                 // skin sin reconstruir la moto
  buildCircuit(); layoutTrack(); buildWPs();
  won = false; dead = false; score = 0; streak = 0; tPlay = 0; laps = 0; bank = 0;
  hitI = false; hitT = 0; offT = 0; sinceGate = 0;
  vCruise = d.v * .6; vMax = d.v * 1.18; v = vCruise; cvy = 0; pitchP = 0; rollP = 0;
  const showRiv = cfg.modo !== 'contra';
  if (cfg.modo === 'contra') {
    sx = 0; sz = ISL[0].r + 18; yaw = 0; gi = 0;              // AFUERA de la isla central
    for (let i = 1; i < NG; i++) gGroups[i].visible = false;
    LANE.forEach(L => L.m.visible = false);                   // sin cintas de circuito
    timeLeft = d.t; placeGateAhead();
  } else {
    LANE.forEach(L => L.m.visible = true);
    sx = GATES[0].x; sz = GATES[0].z; yaw = Math.atan2(GATES[1].x - GATES[0].x, GATES[1].z - GATES[0].z);
    gi = 1; timeLeft = cfg.modo === 'libre' ? 999 : d.t;
  }
  const px = Math.cos(yaw), pz = -Math.sin(yaw);             // perpendicular a la salida
  rivals.forEach((r, i) => { r.wi = 1; r.laps = 0; r.vBase = vMax * (.86 + i * .025); r.v = vCruise;
    const off = (i - (RN - 1) / 2) * 6.5;
    r.x = GATES[0].x + px * off; r.z = GATES[0].z + pz * off; r.yaw = yaw; r.grp.visible = showRiv;
    r.grp.position.set(r.x, .22, r.z); });
  place = 1; craftY = waveH(sx, sz, 0) + .25;
  craft.position.set(sx, craftY, sz); craft.rotation.set(0, 0, 0); craft.rotateY(yaw);
  camSnap();                                                 // la cámara NUNCA arranca dentro de una isla
}

/* ---- cámara de 3ª persona: interpolada, sin oclusión, altura filtrada --- */
const CAND = [0, .34, -.34, .68, -.68, 1.02, -1.02, 1.4, -1.4, 1.8, -1.8, 2.2, -2.2, 2.7, -2.7, 3.14];
function camFree(x, z) { return !insideIsl(x, z, 5); }
function camGoal() { const cd = 10.5;
  for (const dA of CAND) { const a = yaw + dA, x = sx - Math.sin(a) * cd, z = sz - Math.cos(a) * cd;
    if (camFree(x, z)) { camDA = dA; return { x, z }; } }
  for (const c2 of [8, 6, 4.5, 3.2]) { const x = sx - Math.sin(yaw) * c2, z = sz - Math.cos(yaw) * c2;
    if (camFree(x, z)) { camDA = 0; return { x, z }; } }
  camDA = 0; return { x: sx - Math.sin(yaw) * 3.2, z: sz - Math.cos(yaw) * 3.2 }; }
function camSnap() { camYs = craftY + 4.3; const g = camGoal();
  camPx = g.x; camPz = g.z; camPy = camYs;
  camLx = sx + Math.sin(yaw) * 7; camLz = sz + Math.cos(yaw) * 7; camLy = camYs - 3.1;
  applyCam(); }
function applyCam() {
  for (const s of ISL) { let dx = camPx - s.x, dz = camPz - s.z, dd = Math.hypot(dx, dz); const rr = s.r + 4.5;
    if (dd < rr) { if (dd < .001) { dx = 1; dz = 0; dd = 1; } camPx = s.x + dx / dd * rr; camPz = s.z + dz / dd * rr; } }
  const dc = Math.hypot(camPx - sx, camPz - sz);
  let cy = Math.max(camPy, 2.1); if (dc < 6.5) cy += (6.5 - dc) * .55;   // si quedó encima, mira desde arriba
  cam.position.set(camPx, cy, camPz); cam.lookAt(camLx, camLy, camLz); }
function camStep(dt) {
  camYs += (craftY + 4.3 - camYs) * Math.min(1, dt * 2.2);      // la ola mueve la moto, no la vista
  const g = camGoal(), k = 1 - Math.exp(-dt * 7);
  camPx += (g.x - camPx) * k; camPz += (g.z - camPz) * k; camPy += (camYs - camPy) * Math.min(1, dt * 3.5);
  const dc = Math.hypot(camPx - sx, camPz - sz);
  const la = 7 * Math.max(0, Math.cos(camDA)) * ARC.clamp((dc - 2.5) / 5, 0, 1);
  camLx += (sx + Math.sin(yaw) * la - camLx) * k; camLz += (sz + Math.cos(yaw) * la - camLz) * k;
  camLy += (camYs - 3.1 - camLy) * Math.min(1, dt * 5);
  applyCam(); }

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }
function endRace() { dead = true; won = place <= 1; const bonus = Math.round(timeLeft * 4) + (RN + 1 - place) * 120;
  ARC.over({ win: won, score: score + bonus, title: won ? '¡1º · CAMPEÓN!' : place + 'º PUESTO',
    sub: laps + ' vueltas · P' + place + '/' + (RN + 1), coins: ((score + bonus) / 30 | 0) }); }

/* progreso normalizado: MISMA métrica para jugador (14 puertas) y rivales (42
   boyas) — fracción recorrida entre objetivo anterior y objetivo actual */
function segProg(ax, az, bx, bz, px, pz) { const sl = Math.hypot(bx - ax, bz - az) || 1;
  return 1 - Math.min(1, Math.hypot(bx - px, bz - pz) / sl); }
function myProg() { const g = GATES[gi], p = GATES[(gi - 1 + NG) % NG];
  return laps + (gi - 1 + segProg(p.x, p.z, g.x, g.z, sx, sz)) / NG; }
function rvProg(r) { const w = WP[r.wi % WPN], p = WP[(r.wi - 1 + WPN) % WPN];
  return r.laps + (r.wi - 1 + segProg(p.x, p.z, w.x, w.z, r.x, r.z)) / WPN; }
function offTrack() {   // distancia al corredor (a la poligonal de waypoints)
  let best = 1e9;
  for (let i = 0; i < WPN; i++) { const a = WP[i], b = WP[(i + 1) % WPN];
    const vx = b.x - a.x, vz = b.z - a.z, wx = sx - a.x, wz = sz - a.z;
    const l2 = vx * vx + vz * vz || 1, t = ARC.clamp((wx * vx + wz * vz) / l2, 0, 1);
    const dx = wx - vx * t, dz = wz - vz * t, d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best); }

function step(dt) {
  if (dead) return; tPlay += dt; const t = tPlay; const d = DIF[cfg.dif] || DIF.normal;
  if (cfg.modo !== 'libre') { timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; dead = true; ARC.over({ win: false, score, title: 'SE ACABÓ', sub: 'P' + place + '/' + (RN + 1), coins: (score / 30 | 0) }); return; } }
  caus1.material.map.offset.set(t * .012, t * .009); caus2.material.map.offset.set(-t * .009, t * .013); water.material.bumpMap.offset.set(t * .02, t * .016);
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const boosting = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space || keys.ShiftLeft;
  v += ((boosting ? vMax : vCruise) - v) * Math.min(1, dt * 2.2);
  yaw -= ix * dt * (1.75 + v / vMax * .75);                    // gira MÁS con gas: las curvas entran
  bank += (ix * .5 - bank) * Math.min(1, dt * 6);
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  // colisión con islas: sin snap-penalización por frame, con deslizamiento
  _P.x = sx; _P.z = sz; const hit = collide(_P); sx = _P.x; sz = _P.z;
  if (hit) {
    v = Math.max(v * .88, vCruise * .4);                       // castigo ACOTADO (se puede escapar)
    const dot = Math.sin(yaw) * _P.nx + Math.cos(yaw) * _P.nz;
    if (dot < 0) { const sg = (Math.sin(yaw) * -_P.nz + Math.cos(yaw) * _P.nx) >= 0 ? 1 : -1;
      const ty = Math.atan2(-_P.nz * sg, _P.nx * sg); let dy = ty - yaw;
      while (dy > Math.PI) dy -= 6.283185; while (dy < -Math.PI) dy += 6.283185;
      yaw += ARC.clamp(dy, -1, 1) * dt * 3; }   // MÁS que el giro del jugador: nunca queda clavado
    if (!hitI) { hitI = true; streak = 0; ARC.shake(4); ARC.sfx('hit', { vol: .5 }); ARC.vib(30); }
    hitT += dt;
    if (hitT > 2.5 && cfg.modo === 'contra') { hitT = 0; placeGateAhead(); ARC.toast('PUERTA MÁS CERCA'); }
  } else { hitI = false; hitT = 0; }
  const wy = waveH(sx, sz, t), tgt = wy + .22, preVy = cvy;
  cvy += (tgt - craftY) * dt * 42 - cvy * dt * 11.7; craftY += cvy * dt;   // resorte amortiguado (ζ≈0.9)
  const e = 2.2, hx = waveH(sx + e, sz, t) - waveH(sx - e, sz, t), hz = waveH(sx, sz + e, t) - waveH(sx, sz - e, t);
  const fx = Math.sin(yaw), fz = Math.cos(yaw), slopeF = (hx * fx + hz * fz) / (2 * e), slopeS = (hx * fz - hz * fx) / (2 * e);
  pitchP += (ARC.clamp(slopeF * 2.4, -.4, .4) - pitchP) * Math.min(1, dt * 5); rollP += (ARC.clamp(-slopeS * 2.4, -.4, .4) - rollP) * Math.min(1, dt * 5);
  craft.position.set(sx, craftY, sz); craft.rotation.set(0, 0, 0); craft.rotateY(yaw); craft.rotateZ(-bank + rollP); craft.rotateX(-pitchP - .04);
  camStep(dt);
  sun.position.set(sx - 62, 68, sz - 46); sunT.position.set(sx, 0, sz); sunT.updateMatrixWorld();   // sombras donde se juega
  // fuera de pista (sólo circuito): las cintas cuentan
  if (cfg.modo === 'circuito') { const off = offTrack();
    if (off > 30) { offT += dt; v = Math.min(v, vCruise * 1.1); } else offT = Math.max(0, offT - dt * 2); }
  // rivales: mismo mundo que el jugador (colisión + clamp) y corredor real
  if (cfg.modo !== 'contra') {
    const mp = myProg();
    for (const r of rivals) {
      const w = WP[r.wi % WPN], nx3 = WP[(r.wi + 1) % WPN];
      const ty = Math.atan2(nx3.x - r.x, nx3.z - r.z); let dy = ty - r.yaw;   // apunta 1 boya adelante: corta la curva
      while (dy > Math.PI) dy -= 6.283185; while (dy < -Math.PI) dy += 6.283185;
      const steer = ARC.clamp(dy * 1.7, -1, 1); r.yaw += steer * dt * 2.4;
      const rb = ARC.clamp((mp - rvProg(r)) * .9, -.10, .16);          // goma elástica suave
      const tv = r.vBase * (1 - .18 * Math.abs(steer)) * (1 + rb);
      r.v += (tv - r.v) * Math.min(1, dt * 1.6);
      r.x += Math.sin(r.yaw) * r.v * dt; r.z += Math.cos(r.yaw) * r.v * dt;
      _P.x = r.x; _P.z = r.z; if (collide(_P)) r.v = Math.max(r.v * .9, r.vBase * .45); r.x = _P.x; r.z = _P.z;
      const ry = waveH(r.x, r.z, t); r.grp.position.set(r.x, ry + .22, r.z); r.grp.rotation.set(0, 0, 0); r.grp.rotateY(r.yaw);
      const dxw = w.x - r.x, dzw = w.z - r.z, tx = nx3.x - w.x, tz = nx3.z - w.z;
      if (dxw * dxw + dzw * dzw < 196 || (dxw * tx + dzw * tz) < 0) {   // captura por radio O por plano pasado
        r.wi++; if (r.wi >= WPN) { r.wi = 0; r.laps++; } }
    }
    place = 1; for (const r of rivals) if (rvProg(r) > mp) place++;
    if (cfg.modo === 'circuito') for (const r of rivals) if (r.laps >= d.laps) { endRace(); return; }   // un rival puede ganar
  }
  for (let i = 0; i < NG; i++) if (gGroups[i].visible) gGroups[i].position.y = waveH(GATES[i].x, GATES[i].z, t);
  const g = GATES[gi], gy = waveH(g.x, g.z, t);
  mark.position.set(g.x, gy + 5 + Math.sin(t * 3) * .4, g.z); mark.rotation.y += dt * 2;
  LIFE.update(dt);
  sprayT -= dt; if (sprayT <= 0) { sprayT = .035; const bp = worldToScreen(sx - Math.sin(yaw) * 2, craftY - .1, sz - Math.cos(yaw) * 2);
    if (bp) { const n = boosting ? 5 : 3, sp2 = boosting ? 3.4 : 2.4; ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.92)', n, sp2); if (Math.abs(bank) > .2) ARC.fx.burst(bp.x, bp.y, 'rgba(205,238,255,.85)', 3, 3.6); } }
  if (preVy < -4 && cvy > preVy + 2) { const bp = worldToScreen(sx, craftY - .2, sz); if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.95)', 9, 5); }
  sinceGate += dt; if (sinceGate > 6) streak = 0;              // la racha se enfría
  const d2 = (sx - g.x) ** 2 + (sz - g.z) ** 2;
  if (d2 < 100) {                                              // boca de puerta real (boyas a ±10.6)
    streak++;
    // el reloj es PRESIÓN real: el bono apenas cubre el tiempo entre puertas
    const bonus = cfg.modo === 'circuito' ? 2.4 * 31 / d.v : 3 + Math.min(3, streak * .4);
    // el reloj tiene TECHO: nunca se vuelve un colchón infinito
    if (cfg.modo !== 'libre') timeLeft = Math.min(timeLeft + bonus, cfg.modo === 'contra' ? 60 : d.t + 20);
    score += 40 * Math.min(4, streak); sinceGate = 0;
    const sp = worldToScreen(g.x, gy + 3, g.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#ffe6a0', 16); ARC.fx.text(sp.x, sp.y - 26, cfg.modo === 'libre' ? '+' + (40 * Math.min(4, streak)) : '+' + bonus.toFixed(1) + 's', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20);
    if (cfg.modo === 'contra') { gGroups[gi].visible = false; placeGateAhead(); gGroups[gi].visible = true; }
    else { gi = (gi + 1) % NG;
      if (gi === 0) { laps++; ARC.toast('VUELTA ' + laps + ' · P' + place);
        if (cfg.modo === 'circuito' && laps >= d.laps) { endRace(); return; } } }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  if (cfg.modo !== 'libre') { g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44); }
  else { g.font = '900 22px system-ui'; g.fillStyle = '#bfe9f2'; g.fillText('LIBRE', W / 2, 40); }
  g.font = '900 18px system-ui'; g.fillStyle = '#2fd1e0';
  if (cfg.modo === 'circuito') { const d = DIF[cfg.dif] || DIF.normal; g.fillText('vuelta ' + Math.min(laps + 1, d.laps) + '/' + d.laps, W / 2, 68); }
  else g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 68);
  if (offT > .35) { g.font = '900 20px system-ui'; g.fillStyle = '#ffd23f'; g.fillText('¡VOLVÉ A LA PISTA!', W / 2, 96); }
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
  const ax = 0, az = 95;                                     // en agua abierta, NO dentro de la isla central
  if (craft) { const wy = waveH(ax, az, tPlay); craft.position.set(ax, wy + .22, az); craft.rotation.set(0, menuA, 0); }
  if (cam) { cam.position.set(ax + Math.cos(menuA) * 12, 4.4 + Math.sin(menuA * .7) * 1.1, az + Math.sin(menuA) * 12); cam.lookAt(ax, 1.1, az); }
  if (sun) { sun.position.set(ax - 62, 68, az - 46); if (sunT) { sunT.position.set(ax, 0, az); sunT.updateMatrixWorld(); } }
  if (window.LIFE) LIFE.update(dt);
}

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'marea', name: 'MAREA', sub: 'laguna tropical', acc: '#2fd1e0', three: true, sky: '#3fb9c9', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() { fitOpts(); }, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), laps, gi, place, dead, won,
      x: sx | 0, z: sz | 0, v: v | 0, hit: hitI, cy: cam ? +cam.position.y.toFixed(2) : 0 }),
    autoPlay() { if (dead) { autoIx = null; autoBoost = false; return; } const g = GATES[gi]; const ty = Math.atan2(g.x - sx, g.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      autoIx = ARC.clamp(-dy * 2.4, -1, 1); autoBoost = Math.abs(dy) < .5; },
    riv: () => rivals.map(r => ({ l: r.laps, w: r.wi, v: +r.v.toFixed(1), x: r.x | 0, z: r.z | 0 })),
    tp(x, z, y) { sx = x; sz = z; if (y != null) yaw = y; camSnap(); },
    /* diagnóstico de trazado: holgura mínima puerta/corredor ↔ isla y curvatura */
    diag() { let cl = 1e9, gc = 1e9, rmin = 1e9, per = 0; const N = NG * 32;
      for (let k = 0; k < N; k++) { const a = trackPt(k / N), b = trackPt((k + 1) / N % 1), c = trackPt((k + 2) / N % 1);
        per += Math.hypot(b.x - a.x, b.z - a.z);
        for (const s of ISL) cl = Math.min(cl, Math.hypot(a.x - s.x, a.z - s.z) - s.r);
        const A = Math.hypot(b.x - a.x, b.z - a.z), B = Math.hypot(c.x - b.x, c.z - b.z), C = Math.hypot(c.x - a.x, c.z - a.z);
        const ar = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2;
        if (ar > 1e-7) rmin = Math.min(rmin, A * B * C / (4 * ar)); }
      for (const q of GATES) for (const s of ISL) gc = Math.min(gc, Math.hypot(q.x - s.x, q.z - s.z) - s.r);
      return { pista: cfg.pista, clearCentro: +cl.toFixed(1), clearPuertas: +gc.toFixed(1), Rmin: +rmin.toFixed(1), per: per | 0 }; }
  }
};
})();

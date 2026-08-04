/* ===== TORRE — PARKOUR VERTICAL AL CIELO ==================================
   Subí ~215 m saltando por cosas random: ruinas, andamios, rocas flotantes y
   cristales entre las nubes. Plataformas estáticas, móviles, giratorias, que se
   caen, trampolines y vigas finas. Checkpoints cada tanto; si te caés muy abajo
   perdés una vida y volvés al último checkpoint.
   Controles: joystick izq = mover (relativo a la cámara) · SALTAR (der) ·
   arrastrá en la mitad derecha para orbitar la cámara · WASD + Espacio. */
window.GAME = (function () {
'use strict';
let T, scene, cam, ren, sun, ray, sky;
let hero, heroM = null;
let px = 0, py = 0, pz = 0, vy = 0, yaw = 0, onGround = false, coyote = 0, jbuf = 0;
let vidas = 3, score = 0, dead = false, won = false, tPlay = 0, timeLeft = 300;
let altMax = 0, idxMax = 0, cpIdx = 0, standing = -1, curBio = -1, ganado = false;
let camYaw = 0.7, camPitch = 0.36, pitchUse = 0.36, camD = 10, camT = null, tDrag = 9;
let keys = {}, PL = [], gems = [], clouds = [], core = [], running = false;
let dbgAuto = false, autoJT = 0, autoTgt = 1, autoW = 0, lastWX = 0, lastWZ = 0;
let colMesh = [], colT = 0, shT = 0, ma = 0, vign = 0, atT = 0;
let _v1 = null, _v2 = null, _dir = null, _col = null;

const NP = 76, SEED = 20260804;
const G = 34, JV = 17, TRAMV = 26.5, SPD = 7.2;
const CPEVERY = 12;

/* ---------- biomas (de abajo hacia arriba) ---------- */
const BIO = [
  { n: 'RUINAS DE PIEDRA', tex: 'wall', rep: 2, a: 0xe6d3ae, b: 0xc7ab84, fog: 0xbdd2ea, hex: '#e6d3ae' },
  { n: 'ANDAMIOS', tex: 'wood', rep: 2, a: 0xd8a765, c: 1, b: 0xa2703c, fog: 0xc6d8ec, hex: '#d8a765' },
  { n: 'ROCAS FLOTANTES', tex: 'rock', rep: 2, a: 0x94a08c, b: 0x6b7668, fog: 0xd4e2f2, hex: '#94a08c' },
  { n: 'CRISTAL Y NUBES', tex: null, rep: 1, a: 0x7fd0f5, b: 0xb49cf0, fog: 0xecf4ff, hex: '#8fd8ff' }
];
const bioOf = i => Math.min(3, Math.floor(i / (NP / 4)));
function bioAtY(y) { let b = 0; for (let i = 0; i < 4; i++) if (y >= BIO[i].y0) b = i; return b; }

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('torre_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 6, t: 420 }, normal: { v: 4, t: 330 }, pro: { v: 3, t: 250 } };

/* ---------- random con semilla (mulberry32) ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- init ---------- */
async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  _v1 = new T.Vector3(); _v2 = new T.Vector3(); _dir = new T.Vector3(); _col = new T.Color();
  ray = new T.Raycaster(); camT = new T.Vector3();
  const tl = new T.TextureLoader();
  sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  sky.wrapS = T.RepeatWrapping; sky.wrapT = T.ClampToEdgeWrapping;
  scene.background = sky; scene.environment = sky;
  try { scene.environmentIntensity = .42; } catch (e) {}
  scene.fog = new T.Fog(0xbdd2ea, 70, 340);
  scene.add(new T.HemisphereLight(0xffffff, 0x7c8ea6, .95));
  scene.add(new T.AmbientLight(0xffffff, .28));
  sun = new T.DirectionalLight(0xfff2d8, 2.05); sun.position.set(26, 48, 16);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -21; c.right = 21; c.top = 21; c.bottom = -21; c.near = 4; c.far = 130; sun.shadow.bias = -0.0009; }
  scene.add(sun); sun.target = new T.Object3D(); scene.add(sun.target);
  ren.toneMappingExposure = 1.04;

  const rep = (u, n) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(n, n); t.colorSpace = T.SRGBColorSpace; return t; };
  const TX = { wall: rep(TEX.wall, 2), wood: rep(TEX.wood, 2), rock: rep(TEX.rock, 2), floor: rep(TEX.floor, 8) };

  /* materiales COMPARTIDOS por bioma (2 variantes + viga) */
  const MAT = [];
  for (let b = 0; b < 4; b++) {
    const mk = col => b === 3
      ? new T.MeshStandardMaterial({ color: col, roughness: .16, metalness: .08, transparent: true, opacity: .93,
          emissive: new T.Color(col).multiplyScalar(.3), envMapIntensity: 1 })
      : new T.MeshStandardMaterial({ map: TX[BIO[b].tex], roughness: .88, color: col, envMapIntensity: .45 });
    MAT.push({ a: mk(BIO[b].a), b: mk(BIO[b].b) });
  }
  const MTRAM = new T.MeshStandardMaterial({ color: 0x2bd97e, roughness: .35, emissive: 0x0e5a2c, emissiveIntensity: .9 });
  const MCAE = new T.MeshStandardMaterial({ color: 0xff7a5c, roughness: .7, emissive: 0x5a1a08, emissiveIntensity: .5 });
  const MCP = new T.MeshStandardMaterial({ map: TX.wall, color: 0xffcf6a, roughness: .6, emissive: 0x4a3200, emissiveIntensity: .55, envMapIntensity: .5 });

  /* ---------- piso de arranque ---------- */
  const base = new T.Mesh(new T.CylinderGeometry(16.5, 18, 2.2, 30),
    new T.MeshStandardMaterial({ map: TX.floor, roughness: .96, color: 0xcfc6bd }));
  base.position.y = -1.1; base.receiveShadow = true; scene.add(base);
  const anillo = new T.Mesh(new T.TorusGeometry(16.9, .5, 6, 34), new T.MeshStandardMaterial({ map: TX.wall, roughness: .9, color: 0xb8a78c }));
  anillo.rotation.x = Math.PI / 2; anillo.position.y = .3; anillo.receiveShadow = true; scene.add(anillo);

  /* ---------- LAYOUT sembrado ---------- */
  const R = mulberry32(SEED);
  PL.length = 0;
  let ang = 0, rad = 8.4, y = 1.4, dir = 1;
  const pushPL = (o) => { PL.push(o); return o; };
  // plataforma 0: base amplia
  pushPL(mkPL(0, Math.cos(0) * rad, y, Math.sin(0) * rad, 3.8, 3.8, 'est', MAT, MTRAM, MCAE, MCP, R, true));
  /* alcance horizontal real de un salto que sube `dy` (misma física que step) */
  const alcanceDe = (v0, dy2) => { const disc = v0 * v0 - 2 * G * dy2; if (disc < 0) return -1;
    return SPD * (v0 + Math.sqrt(disc)) / G; };

  for (let i = 1; i < NP; i++) {
    const esCP = (i % CPEVERY === 0);
    const ant = PL[i - 1];
    let arco = 2.3 + R() * 1.4, dy = 2.3 + R() * 1.4;
    // la anterior pasa a ser TRAMPOLÍN => acá viene un salto largo y alto
    let tramPrev = false;
    if (!esCP && i > 4 && ant.type === 'est' && !ant.cp && R() < .09) {
      ant.type = 'tram'; ant.m.material = MTRAM; tramPrev = true;
      dy = 4.8 + R() * 1.8; arco = 4.0 + R() * 2.8;
    }
    // TIPO y tamaño (cosas random pero jugables)
    let type = 'est', w = 2.5 + R() * 1.5, d = 2.4 + R() * 1.1, amp = 0, orad = 0;
    if (esCP) { w = 3.7; d = 3.7; }
    else if (i > 2 && !tramPrev) {
      const r = R();
      if (r < .16) { type = 'mov'; w = 2.7; d = 2.7; amp = 1.5 + R() * .7; }
      else if (r < .27) { type = 'orb'; w = 2.6; d = 2.6; orad = 1.4 + R() * .8; }
      else if (r < .36) { type = 'cae'; w = 2.4; d = 2.4; }
      else if (r < .48) { type = 'viga'; if (R() < .5) { w = 6.4; d = 1; } else { w = 1; d = 6.4; } }
      else if (r < .60) { type = 'glb'; w = 2.6; d = 2.6; }
      else if (r < .66) { type = 'tram'; w = 2.4; d = 2.4; }
    }
    if (i % 17 === 0) dir = -dir;
    rad = Math.max(5.8, Math.min(13.6, rad + (R() * 2 - 1) * 1.5));
    // REPARACIÓN: baja el escalón (y si no alcanza, acerca) hasta que el salto SEA posible
    const v0 = ant.type === 'tram' ? TRAMV : JV;
    const marg = Math.min(ant.hw, ant.hd) * .7;             // podés despegar desde el borde
    const estorbo = (ant.amp || 0) + (ant.orad || 0) + amp + orad;   // peor fase de las móviles
    let nx = 0, nz = 0, ang2 = ang;
    for (let k = 0; k < 18; k++) {
      ang2 = ang + dir * arco / rad;
      nx = Math.cos(ang2) * rad; nz = Math.sin(ang2) * rad;
      const dist = Math.hypot(nx - ant.x, nz - ant.z);
      if (alcanceDe(v0, dy) >= dist - marg + estorbo + .9) break;
      if (dy > 1.35) dy -= .3; else arco *= .82;
    }
    ang = ang2; y += dy;
    const p = pushPL(mkPL(i, nx, y, nz, w, d, type, MAT, MTRAM, MCAE, MCP, R, esCP));
    if (type === 'mov') { p.ax = R() < .5 ? 0 : 1; p.amp = amp; p.sp = .5 + R() * .45; p.ph = R() * 6.28; }
    if (type === 'orb') { p.orad = orad; p.sp = (R() < .5 ? -1 : 1) * (.5 + R() * .45); p.ph = R() * 6.28; }
  }
  // altura de cada bioma para el HUD
  for (let b = 0; b < 4; b++) BIO[b].y0 = PL[Math.floor(b * NP / 4)].y - 1;
  BIO[0].y0 = -99;
  const TOPY = PL[NP - 1].y;

  /* ---------- columna central por tramos (referencia vertical) ---------- */
  core.length = 0;
  for (let b = 0; b < 4; b++) {
    const y0 = b === 0 ? -2 : PL[Math.floor(b * NP / 4)].y - 2;
    const y1 = b === 3 ? TOPY + 4 : PL[Math.floor((b + 1) * NP / 4)].y - 2;
    const h = y1 - y0;
    const m = new T.Mesh(new T.CylinderGeometry(.55, .68, h, 10),
      b === 3 ? new T.MeshStandardMaterial({ color: 0xdfeeff, roughness: .25, metalness: .1, transparent: true, opacity: .7 })
              : new T.MeshStandardMaterial({ map: TX[BIO[b].tex], roughness: .92, color: BIO[b].a, envMapIntensity: .4 }));
    m.position.y = y0 + h / 2; m.receiveShadow = true; scene.add(m); core.push(m);
  }

  /* ---------- gemas ---------- */
  const ggeo = new T.OctahedronGeometry(.44);
  const gmat = new T.MeshStandardMaterial({ color: 0x59e0ff, emissive: 0x1a7f9c, emissiveIntensity: 1.1, roughness: .2, metalness: .2 });
  gems.length = 0;
  for (let i = 2; i < NP - 1; i += 3) {
    const p = PL[i]; if (p.type === 'cae' || p.type === 'tram') continue;
    const gm = new T.Mesh(ggeo, gmat); gm.position.set(p.x, p.y + 1.45, p.z); scene.add(gm);
    gems.push({ m: gm, pl: i, dy: 1.45, got: false });
  }

  /* ---------- META arriba ---------- */
  const top = PL[NP - 1];
  const meta = new T.Group(); meta.position.set(top.x, top.y, top.z);
  const tor = new T.Mesh(new T.TorusGeometry(2.1, .26, 8, 22), new T.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x7a5a00, emissiveIntensity: 1.2, roughness: .3, metalness: .4 }));
  tor.rotation.x = Math.PI / 2; tor.position.y = 2.6; meta.add(tor);
  const haz = new T.Mesh(new T.CylinderGeometry(1.1, 1.6, 26, 12, 1, true),
    new T.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: .17, side: T.DoubleSide, depthWrite: false }));
  haz.position.y = 13; meta.add(haz); scene.add(meta);
  PL[NP - 1].m.material = MCP;

  /* ---------- nubes (sprites) para el vértigo ---------- */
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 128;
  const c2 = cvs.getContext('2d'); const gr = c2.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128);
  const ctex = new T.CanvasTexture(cvs); ctex.colorSpace = T.SRGBColorSpace;
  const cmat = new T.SpriteMaterial({ map: ctex, transparent: true, opacity: .8, depthWrite: false, fog: false });
  const RC = mulberry32(SEED ^ 0x9e37);
  clouds.length = 0;
  for (let i = 0; i < 26; i++) {
    const s = new T.Sprite(cmat); const a = RC() * 6.28, r = 20 + RC() * 52;
    const sc = 12 + RC() * 22;
    s.scale.set(sc, sc * .55, 1); s.position.set(Math.cos(a) * r, 14 + RC() * (TOPY + 18), Math.sin(a) * r);
    scene.add(s); clouds.push({ s, a, r, sp: .04 + RC() * .07 });
  }

  /* ---------- HÉROE ---------- */
  hero = new T.Group();
  try {
    const g = await ARC.loadGLB(MDL.hero); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(1.75 / (s.y || 1)); m.updateWorldMatrix(true, true);
    const nb = new T.Box3().setFromObject(m); const c3 = nb.getCenter(new T.Vector3());
    m.position.x -= c3.x; m.position.z -= c3.z; m.position.y -= nb.min.y;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true;
      if (o.material) { const mm = o.material; mm.emissive && mm.emissive.setRGB(0, 0, 0);
        if (mm.specularIntensity != null) mm.specularIntensity = 0; mm.envMapIntensity = .4; mm.roughness = Math.max(.55, mm.roughness || .55); } } });
    heroM = m; hero.add(m);
  } catch (e) {
    const b2 = new T.Mesh(new T.CapsuleGeometry(.36, .95, 4, 10), new T.MeshStandardMaterial({ color: 0xffa62b, roughness: .6 }));
    b2.position.y = .85; b2.castShadow = true; hero.add(b2); heroM = b2;
  }
  const blob = new T.Mesh(new T.CircleGeometry(.52, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: .28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .03; hero.add(blob);
  const aro = new T.Mesh(new T.TorusGeometry(.62, .095, 5, 18), new T.MeshBasicMaterial({ color: 0x59e0ff }));
  aro.rotation.x = Math.PI / 2; aro.position.y = .14; hero.add(aro);
  hero.position.set(PL[0].x, PL[0].y, PL[0].z); scene.add(hero);

  /* ---------- GLB del repo reusados como plataforma / adorno ---------- */
  const tpl = {};
  const load1 = async (k, url, h) => { if (!url) return;
    try { const g = await ARC.loadGLB(url); const root = g.scene || (g.scenes && g.scenes[0]); if (!root) return;
      const bb = new T.Box3().setFromObject(root); const sz = bb.getSize(new T.Vector3());
      root.scale.setScalar(h / (sz.y || 1)); root.updateWorldMatrix(true, true);
      const nb = new T.Box3().setFromObject(root); root.position.y -= nb.max.y;
      root.traverse(o => { if (o.isMesh) { o.frustumCulled = true; o.castShadow = false; o.receiveShadow = false;
        if (o.material) { const mm = o.material; if (mm.metalness != null) mm.metalness = Math.min(mm.metalness, .3);
          mm.emissive && mm.emissive.setRGB(0, 0, 0); mm.envMapIntensity = .5; } } });
      tpl[k] = root; } catch (e) {} };
  await load1('crate', MDL.crate, 1.9);
  await load1('log', MDL.log, 1.3);
  await load1('totem', MDL.totem, 3.2);
  await load1('tree', MDL.tree, 3.4);
  const keysG = ['crate', 'log', 'totem'].filter(k => tpl[k]);
  const RG = mulberry32(SEED ^ 0x5151);
  if (keysG.length) for (const p of PL) if (p.type === 'glb') {
    const k = keysG[(RG() * keysG.length) | 0]; const cl = tpl[k].clone(true);
    cl.position.set(p.x, p.y - .34, p.z); cl.rotation.y = RG() * 6.28; scene.add(cl); p.dec = cl;
  }
  // árboles / cajones de adorno en el piso
  if (tpl.tree) for (let i = 0; i < 5; i++) { const a = RG() * 6.28, r = 10.5 + RG() * 4;
    const cl = tpl.tree.clone(true); cl.position.set(Math.cos(a) * r, 3.4, Math.sin(a) * r);
    cl.rotation.y = RG() * 6.28; cl.scale.multiplyScalar(.85 + RG() * .35); scene.add(cl); }
  if (tpl.crate) for (let i = 0; i < 5; i++) { const a = RG() * 6.28, r = 6 + RG() * 10;
    const cl = tpl.crate.clone(true); cl.position.set(Math.cos(a) * r, 1.9, Math.sin(a) * r); cl.rotation.y = RG() * 6.28; scene.add(cl); }

  bindTouch(); mkMenu();
}

/* crea una plataforma: p.y = ALTURA DE LA SUPERFICIE */
function mkPL(i, x, y, z, w, d, type, MAT, MTRAM, MCAE, MCP, R, esCP) {
  const b = bioOf(i);
  const h = type === 'viga' ? .5 : .72;
  let mat = (R() < .5 ? MAT[b].a : MAT[b].b);
  if (type === 'tram') mat = MTRAM; else if (type === 'cae') mat = MCAE; else if (esCP) mat = MCP;
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y - h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const p = { i, m, x, y, z, bx: x, bz: z, lx: x, lz: z, hw: w / 2, hd: d / 2, h, type, bio: b,
    cp: !!esCP, on: true, t: -1, sq: 0, dec: null, ax: 0, amp: 0, sp: 0, ph: 0, orad: 0 };
  if (esCP) { const cm = new T.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x8a6000, emissiveIntensity: 1.4, roughness: .35, metalness: .35 });
    const ox = w / 2 - .42, oz = d / 2 - .42;
    const ar = new T.Mesh(new T.TorusGeometry(1.15, .11, 6, 16), cm);
    ar.rotation.x = Math.PI / 2; ar.position.set(x + ox, y + 3.1, z + oz); scene.add(ar);
    const po = new T.Mesh(new T.CylinderGeometry(.085, .085, 3.1, 6), cm);
    po.position.set(x + ox, y + 1.55, z + oz); scene.add(po); p.ring = ar; }
  return p;
}

/* ---------- menú (con el fix de pointer-events) ---------- */
function mkMenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#ffe8b8}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#fff4e0;background:rgba(0,0,0,.42);border:.4vmin solid rgba(255,225,180,.25);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#ffd23f;color:#2a1c00;border-color:#fff;box-shadow:0 0 20px #ffd23f}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'TRANQUI'], ['normal', 'NORMAL'], ['pro', 'VÉRTIGO']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val;
      try { localStorage.setItem('torre_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); });
    row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

/* ---------- controles (multitáctil propio + mouse por el shell) ---------- */
const IN = { joy: null, cam: null, jump: false };
const roles = {};
function zoneOf(p) {
  if (p.x > ARC.W - 62 && p.y < 58) return 'P';
  if (Math.hypot(p.x - (ARC.W - 98), p.y - (ARC.H - 104)) < 68) return 'B';
  if (p.x < ARC.W * .46) return 'J';
  return 'C';
}
function ptDown(id, p) {
  if (!running) return;
  const z = zoneOf(p);
  if (z === 'P') { window.ARC_pause(); return; }
  if (z === 'B') { roles[id] = 'B'; IN.jump = true; jbuf = .14; return; }
  if (z === 'J') { roles[id] = 'J'; IN.joy = { x0: p.x, y0: p.y, dx: 0, dy: 0 }; return; }
  roles[id] = 'C'; IN.cam = { x: p.x, y: p.y };
}
function ptMove(id, p) {
  const r = roles[id]; if (!r) return;
  if (r === 'J' && IN.joy) { IN.joy.dx = ARC.clamp((p.x - IN.joy.x0) / 56, -1, 1); IN.joy.dy = ARC.clamp((p.y - IN.joy.y0) / 56, -1, 1); return; }
  if (r === 'C' && IN.cam) { const dx = p.x - IN.cam.x, dy = p.y - IN.cam.y; IN.cam.x = p.x; IN.cam.y = p.y;
    camYaw -= dx * .0062; camPitch = ARC.clamp(camPitch + dy * .0042, -.16, 1.12); tDrag = 0; }
}
function ptUp(id) { const r = roles[id]; delete roles[id];
  if (r === 'J') IN.joy = null; else if (r === 'C') IN.cam = null; else if (r === 'B') IN.jump = false; }

function bindTouch() {
  const LW = 960, LH = 540;
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

/* ---------- partida ---------- */
function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  vidas = d.v; timeLeft = d.t;
  px = PL[0].x; py = PL[0].y; pz = PL[0].z; vy = 0; yaw = 0; onGround = true;
  coyote = .1; jbuf = 0; standing = 0;
  score = 0; altMax = 0; idxMax = 0; cpIdx = 0; dead = false; won = false; ganado = false;
  tPlay = 0; curBio = -1; vign = 0; dbgAuto = false; autoJT = 0; autoTgt = 1; autoW = 0;
  camYaw = Math.atan2(px, pz); camPitch = .36; pitchUse = .36; camD = 10; tDrag = 9;
  camT.set(px, py + 1.3, pz);
  for (const k in roles) delete roles[k];
  IN.joy = null; IN.cam = null; IN.jump = false; keys = {};
  for (const p of PL) { p.on = true; p.t = -1; p.sq = 0; p.x = p.bx; p.z = p.bz; p.lx = p.bx; p.lz = p.bz;
    p.m.position.set(p.x, p.y - p.h / 2, p.z); p.m.visible = true; p.m.scale.set(1, 1, 1); p.m.rotation.z = 0;
    if (p.dec) { p.dec.visible = true; p.dec.position.set(p.x, p.y - .34, p.z); } }
  for (const g of gems) { g.got = false; g.m.visible = true; }
  scene.fog.color.setHex(BIO[0].fog);
  running = true;
}

function terminar(win, title) {
  dead = true; won = win; running = false;
  const bonus = win ? Math.round(timeLeft * 4) + vidas * 150 : 0;
  ARC.over({ win, score: score + bonus, title, sub: Math.round(altMax) + ' m de ' + Math.round(PL[NP - 1].y) + ' m', coins: (score / 25 | 0) });
}

function respawn() {
  vidas--; ARC.shake(10); ARC.sfx('lose', { vol: .4 }); ARC.vib(30);
  if (vidas <= 0) { terminar(false, 'TE CAÍSTE'); return; }
  const p = PL[cpIdx];
  px = p.x; py = p.y; pz = p.z; vy = 0; onGround = true; standing = cpIdx; coyote = .1; jbuf = 0;
  camD = 10; camT.set(px, py + 1.3, pz); autoTgt = Math.min(NP - 1, cpIdx + 1); autoW = 0;
  ARC.toast('VIDAS: ' + vidas + '  ·  CHECKPOINT ' + Math.round(p.y) + ' m');
}

function doJump(v) { vy = v; onGround = false; coyote = 0; jbuf = 0; standing = -1;
  ARC.sfx('swipe', { vol: .38, rate: v > 20 ? 1.05 : 1.5 }); ARC.vib(14); }

/* mueve plataformas móviles / giratorias (también en el atractor) */
function movePL(t) {
  for (const p of PL) {
    p.lx = p.x; p.lz = p.z;
    if (p.type === 'mov') {
      const o = Math.sin(t * p.sp + p.ph) * p.amp;
      const n = Math.hypot(p.bx, p.bz) || 1;
      if (p.ax === 0) { p.x = p.bx + (p.bx / n) * o; p.z = p.bz + (p.bz / n) * o; }
      else { p.x = p.bx + (-p.bz / n) * o; p.z = p.bz + (p.bx / n) * o; }
      p.m.position.x = p.x; p.m.position.z = p.z;
    } else if (p.type === 'orb') {
      const a = t * p.sp + p.ph;
      p.x = p.bx + Math.cos(a) * p.orad; p.z = p.bz + Math.sin(a) * p.orad;
      p.m.position.x = p.x; p.m.position.z = p.z; p.m.rotation.y = -a;
    }
    if (p.sq > 0) { p.sq = Math.max(0, p.sq - .06); p.m.scale.y = 1 - p.sq * .45; p.m.scale.x = p.m.scale.z = 1 + p.sq * .18; }
    if (p.dec && (p.type === 'mov' || p.type === 'orb')) { p.dec.position.x = p.x; p.dec.position.z = p.z; }
  }
}

function step(dt) {
  if (dead) return;
  tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { terminar(false, 'SIN TIEMPO'); return; }

  movePL(tPlay);
  // si estás parado en una plataforma que se movió, te lleva con ella
  if (standing >= 0 && PL[standing].on) { const sp = PL[standing]; px += sp.x - sp.lx; pz += sp.z - sp.lz; }
  // plataformas que se caen
  for (const p of PL) {
    if (p.type !== 'cae') continue;
    if (p.t > 0) { p.t -= dt;
      p.m.position.x = p.x + Math.sin(p.t * 60) * .07;
      if (p.t <= 0) { p.on = false; p.t = -3.4; if (standing === p.i) standing = -1; ARC.sfx('boom', { vol: .3, rate: 1.6 }); } }
    else if (p.t < -.001 && !p.on) { p.t += dt;
      p.m.position.y -= 26 * dt; p.m.rotation.z += dt * 1.6;
      if (p.dec) p.dec.position.y -= 26 * dt;
      if (p.t >= -.001) { p.on = true; p.t = -1; p.m.rotation.z = 0;
        p.m.position.set(p.x, p.y - p.h / 2, p.z); if (p.dec) p.dec.position.set(p.x, p.y - .34, p.z); } }
  }
  // gemas girando
  for (const g of gems) if (!g.got) { const p = PL[g.pl];
    g.m.rotation.y += dt * 2.4; g.m.position.set(p.x, p.y + g.dy + Math.sin(tPlay * 2 + g.pl) * .18, p.z); }
  // nubes a la deriva
  for (const c of clouds) { c.a += c.sp * dt * .1; c.s.position.x = Math.cos(c.a) * c.r; c.s.position.z = Math.sin(c.a) * c.r; }

  /* --- entrada --- */
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz += 1;
  if (keys.KeyS || keys.ArrowDown) mz -= 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (IN.joy) { mx += IN.joy.dx; mz += -IN.joy.dy; }
  let wx = 0, wz = 0;
  const ml = Math.hypot(mx, mz);
  if (ml > .06) { const k = 1 / Math.max(1, ml); mx *= k; mz *= k;
    const s = Math.sin(camYaw), c = Math.cos(camYaw);
    wx = -s * mz + c * mx; wz = -c * mz - s * mx; }
  // piloto automático (sonda): camina y salta hacia la próxima plataforma
  if (dbgAuto) {
    const tp = PL[autoTgt];                       // autoTgt se fija AL ATERRIZAR (ver abajo)
    const ax = tp.x - px, az = tp.z - pz, al = Math.hypot(ax, az);
    if (al > .45) { wx = ax / al; wz = az / al; } else { wx = 0; wz = 0; }   // frena para no pasarse
    autoJT -= dt; autoW = onGround ? autoW + dt : 0;
    if (onGround && autoJT <= 0 && tp.y > py + .3) {
      const disc = JV * JV - 2 * G * (tp.y - py);         // ¿llego de un salto desde acá?
      const alc = disc >= 0 ? SPD * (JV + Math.sqrt(disc)) / G : -1;
      if (al <= alc - .2 || autoW > 1.2) { jbuf = .14; autoJT = .25; autoW = 0; }
    }
  }
  const wl = Math.hypot(wx, wz);
  if (wl > .05) { wx /= wl; wz /= wl; lastWX = wx; lastWZ = wz;
    let d = Math.atan2(wx, wz) - yaw; while (d > Math.PI) d -= 6.28318; while (d < -Math.PI) d += 6.28318;
    yaw += d * (1 - Math.exp(-dt * 15));
    px += wx * SPD * dt; pz += wz * SPD * dt;
  } else { lastWX = 0; lastWZ = 0; }

  /* --- salto: coyote + buffer + corte --- */
  coyote = onGround ? .1 : Math.max(0, coyote - dt);
  jbuf = Math.max(0, jbuf - dt);
  if (jbuf > 0 && coyote > 0) doJump(JV);

  /* --- gravedad + aterrizaje --- */
  vy -= G * dt; if (vy < -46) vy = -46;
  const ny = py + vy * dt;
  let li = -1, lt = -1e9;
  if (vy <= 0) {
    for (let i = 0; i < PL.length; i++) { const p = PL[i]; if (!p.on) continue;
      if (Math.abs(px - p.x) < p.hw + .32 && Math.abs(pz - p.z) < p.hd + .32) {
        const top = p.y;
        if (py + .002 >= top && ny <= top + .001 && top > lt) { lt = top; li = i; } } }
  }
  if (li >= 0) {
    const p = PL[li];
    py = p.y; vy = 0; onGround = true;
    const nuevo = standing !== li; standing = li;
    if (dbgAuto) { autoTgt = Math.min(NP - 1, li + 1); autoW = 0; }
    if (li > idxMax) { idxMax = li; score += 40; }
    if (nuevo) { ARC.sfx('tap', { vol: .22, rate: .8 }); }
    if (p.cp && li > cpIdx) { cpIdx = li; score += 150; ARC.sfx('power', { vol: .5 });
      ARC.toast('CHECKPOINT · ' + Math.round(p.y) + ' m'); ARC.fx.ring(ARC.W / 2, ARC.H / 2, '#ffd23f', 26); }
    if (p.type === 'cae' && p.t < -.9) { p.t = .6; ARC.sfx('hit', { vol: .3, rate: 1.4 }); }
    if (p.type === 'tram') { p.sq = 1; doJump(TRAMV); ARC.sfx('power', { vol: .45, rate: 1.3 }); ARC.shake(4); }
  } else if (vy <= 0 && ny <= 0 && py >= -.02 && Math.hypot(px, pz) < 16.8) {
    py = 0; vy = 0; onGround = true; standing = -1;   // piso de arranque
    if (dbgAuto) autoTgt = 0;
  } else { py = ny; if (vy < 0) onGround = false; }

  /* --- caída: checkpoint o vida --- */
  const cpY = PL[cpIdx].y;
  if (py < cpY - 13 || py < -7) { respawn(); if (dead) return; }

  /* --- progreso --- */
  if (py > altMax) altMax = py;
  const b = bioAtY(py);
  if (b !== curBio) { curBio = b; if (tPlay > .6) ARC.toast(BIO[b].n); }
  scene.fog.color.lerp(_col.setHex(BIO[b].fog), Math.min(1, dt * 1.4));

  hero.position.set(px, py, pz); hero.rotation.set(0, yaw, 0);
  if (heroM) heroM.rotation.x = onGround ? 0 : ARC.clamp(-vy * .012, -.22, .3);

  /* --- gemas --- */
  for (const g of gems) if (!g.got) { const p = PL[g.pl];
    if (Math.abs(px - p.x) < 1.3 && Math.abs(pz - p.z) < 1.3 && Math.abs(py + .9 - g.m.position.y) < 1.7) {
      g.got = true; g.m.visible = false; score += 80; ARC.sfx('coin', { vol: .5 });
      const sp = w2s(g.m.position.x, g.m.position.y, g.m.position.z);
      if (sp) { ARC.fx.ring(sp.x, sp.y, '#59e0ff', 14); ARC.fx.text(sp.x, sp.y - 22, '+80', '#59e0ff'); } } }

  /* --- meta --- */
  if (!ganado && standing === NP - 1) { ganado = true; ARC.fx.burst(ARC.W / 2, ARC.H / 2, '#ffd23f', 26, 8);
    terminar(true, '¡A LA CIMA!'); return; }

  /* --- luz que sigue al jugador + casters cercanos --- */
  sun.position.set(px + 26, py + 46, pz + 16);
  sun.target.position.set(px, py, pz); sun.target.updateMatrixWorld();
  shT -= dt; if (shT <= 0) { shT = .28;
    for (const p of PL) p.m.castShadow = p.on && Math.abs(p.y - py) < 16; }

  vign += ((vy < -14 ? Math.min(1, (-vy - 14) / 20) : 0) - vign) * Math.min(1, dt * 5);
  updCam(dt);
}

/* ---------- CÁMARA orbital de seguimiento ---------- */
function updCam(dt) {
  tDrag += dt;
  // recentrado suave detrás del movimiento cuando no tocás la cámara
  if (tDrag > 1.1 && Math.hypot(lastWX, lastWZ) > .1) {
    const want = Math.atan2(-lastWX, -lastWZ);
    let d = want - camYaw; while (d > Math.PI) d -= 6.28318; while (d < -Math.PI) d += 6.28318;
    camYaw += ARC.clamp(d, -1.4, 1.4) * dt * .85;
  }
  const bajar = Math.min(2.8, Math.max(0, -vy) * .10);
  _v1.set(px, py + 1.3 - bajar, pz);
  camT.lerp(_v1, 1 - Math.exp(-dt * 9));
  // distancia deseada: zoom out al caer
  const wantD = 10 + ARC.clamp(-vy * .19, 0, 4.6);
  // lista de estorbos (plataformas cercanas + columna central), refrescada cada .12s
  colT -= dt;
  if (colT <= 0) { colT = .12; colMesh.length = 0;
    for (const p of PL) if (p.on && Math.abs(p.y - py) < 26) colMesh.push(p.m);
    for (const m of core) colMesh.push(m); }
  // 1º: subir un poco el ángulo para pasar por arriba del estorbo (máx +25°)
  // 2º: si sigue tapado, ACERCARSE (nunca vista cenital, que marea)
  let bestP = camPitch, d = wantD, tapado = false;
  const d0 = rayDist(camPitch, wantD + .5);
  if (d0 < wantD) {
    const pa = Math.min(1.05, camPitch + .22), da = rayDist(pa, wantD + .5);
    const pb = Math.min(1.05, camPitch + .44), db = rayDist(pb, wantD + .5);
    if (da >= wantD) bestP = pa;
    else if (db >= wantD) bestP = pb;
    else { bestP = pa; d = Math.max(4.2, Math.max(d0, da, db) - .6); tapado = true; }
  }
  // 3º: si NADA de eso destapa (típico: la columna central), la cámara gira hacia AFUERA
  // de la torre, donde la línea de visión siempre está libre
  if (tapado) { const out = Math.atan2(px, pz);
    let dd = out - camYaw; while (dd > Math.PI) dd -= 6.28318; while (dd < -Math.PI) dd += 6.28318;
    camYaw += ARC.clamp(dd, -1, 1) * dt * 3.4; }
  pitchUse += (bestP - pitchUse) * (1 - Math.exp(-dt * 7));
  camD += (d - camD) * (1 - Math.exp(-dt * (d < camD ? 20 : 3.6)));
  setDir(pitchUse);
  _v2.copy(camT).addScaledVector(_dir, camD);
  if (_v2.y < camT.y - 4.6) _v2.y = camT.y - 4.6;   // nunca por debajo del jugador
  if (_v2.y < 1.4) _v2.y = 1.4;                     // nunca bajo el piso
  cam.position.copy(_v2);
  cam.lookAt(camT.x, camT.y + 1.55, camT.z);
}
function setDir(pitch) { const hd = Math.cos(pitch);
  _dir.set(Math.sin(camYaw) * hd, Math.sin(pitch), Math.cos(camYaw) * hd); }
/* distancia libre desde camT hacia la cámara con ese ángulo (>= far si no hay nada) */
function rayDist(pitch, far) {
  setDir(pitch);
  if (!colMesh.length) return far;
  ray.set(camT, _dir); ray.near = 0; ray.far = far;
  const h = ray.intersectObjects(colMesh, false);
  return h.length ? h[0].distance : far;
}

function w2s(x, y, z) { const p = _v1.set(x, y, z).project(cam); if (p.z > 1) return null;
  return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

/* ---------- HUD ---------- */
function draw2d(g) {
  const W = ARC.W, H = ARC.H, TOP = PL.length ? PL[NP - 1].y : 200;
  if (vign > .01) { const gr = g.createRadialGradient(W / 2, H / 2, H * .28, W / 2, H / 2, H * .78);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,20,40,' + (vign * .55).toFixed(2) + ')');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  // altura
  const sc = g.createLinearGradient(0, 0, 0, 130);
  sc.addColorStop(0, 'rgba(8,14,26,.5)'); sc.addColorStop(1, 'rgba(8,14,26,0)');
  g.fillStyle = sc; g.fillRect(0, 0, 330, 130);
  g.textAlign = 'left'; g.font = '900 40px system-ui'; g.fillStyle = '#ffd23f';
  g.fillText(Math.max(0, Math.round(py)) + ' m', 24, 46);
  g.font = '900 14px system-ui'; g.fillStyle = 'rgba(255,232,184,.85)';
  g.fillText('MÁX ' + Math.round(altMax) + ' m  ·  META ' + Math.round(TOP) + ' m', 25, 66);
  g.font = '900 16px system-ui'; g.fillStyle = '#ff9db0';
  g.fillText('♥ '.repeat(Math.max(0, vidas)), 25, 88);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.7)';
  g.fillText(BIO[Math.max(0, curBio)].n, 25, 108);
  // reloj
  g.textAlign = 'center'; g.font = '900 28px system-ui'; g.fillStyle = timeLeft < 20 ? '#ff5470' : '#fff';
  g.fillText(Math.max(0, timeLeft).toFixed(0) + 's', W / 2, 40);
  // puntos
  g.textAlign = 'right'; g.font = '900 24px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', W - 72, 40);
  // barra de altura por biomas
  const bx = W - 30, by = 96, bh = H - 260;
  g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(bx, by, 13, bh);
  for (let i = 0; i < 4; i++) { const y0 = i === 0 ? 0 : BIO[i].y0 / TOP, y1 = i === 3 ? 1 : BIO[i + 1].y0 / TOP;
    g.fillStyle = BIO[i].hex; g.globalAlpha = .5;
    g.fillRect(bx, by + bh * (1 - y1), 13, bh * (y1 - y0)); }
  g.globalAlpha = 1;
  for (let i = 0; i < PL.length; i += CPEVERY) { const yy = by + bh * (1 - PL[i].y / TOP);
    g.fillStyle = i <= cpIdx ? '#ffd23f' : 'rgba(255,255,255,.35)'; g.fillRect(bx - 4, yy - 1.5, 21, 3); }
  const myy = by + bh * (1 - ARC.clamp(py / TOP, 0, 1));
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(bx - 9, myy); g.lineTo(bx - 1, myy - 6); g.lineTo(bx - 1, myy + 6); g.closePath(); g.fill();
  // joystick
  const jx = IN.joy ? IN.joy.x0 : 112, jy = IN.joy ? IN.joy.y0 : H - 108;
  g.strokeStyle = 'rgba(255,255,255,' + (IN.joy ? .55 : .3) + ')'; g.lineWidth = 3;
  g.beginPath(); g.arc(jx, jy, 58, 0, 6.28); g.stroke();
  g.fillStyle = 'rgba(255,235,190,' + (IN.joy ? .42 : .24) + ')';
  g.beginPath(); g.arc(jx + (IN.joy ? IN.joy.dx * 40 : 0), jy + (IN.joy ? IN.joy.dy * 40 : 0), 25, 0, 6.28); g.fill();
  // botón saltar
  const ax = W - 98, ay = H - 104, listo = onGround || coyote > 0;
  g.fillStyle = listo ? 'rgba(255,210,63,.92)' : 'rgba(110,95,40,.55)';
  g.beginPath(); g.arc(ax, ay, 54, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = listo ? '#2a1c00' : 'rgba(255,255,255,.5)'; g.font = '900 30px system-ui';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('▲', ax, ay + 1);
  g.font = '900 11px system-ui'; g.fillText('SALTAR', ax, ay + 34); g.textBaseline = 'alphabetic';
  // aviso de cámara
  if (tPlay < 9) { g.textAlign = 'right'; g.font = '900 12px system-ui';
    g.fillStyle = 'rgba(255,255,255,' + Math.min(.45, (9 - tPlay) * .2).toFixed(2) + ')';
    g.fillText('arrastrá acá = cámara', W - 58, H - 182); }
  // pausa
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36);
  g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

/* ---------- atractor del menú: vuelo vertical por la torre ---------- */
function attract3d(dt) {
  ma += dt * .3;
  if (!PL.length || !cam) return;
  const TOP = PL[NP - 1].y;
  const f = (Math.sin(ma * .28 - 1.57) * .5 + .5);
  const h = 8 + f * (TOP - 6), r = 27 + Math.sin(ma * .55) * 7;
  cam.position.set(Math.cos(ma) * r, h + 11, Math.sin(ma) * r);
  cam.lookAt(0, h + 1, 0);
  tPlay += dt; movePL(tPlay);
  const i = Math.max(0, Math.min(NP - 1, Math.round(f * (NP - 1))));
  if (hero) { hero.position.set(PL[i].x, PL[i].y, PL[i].z); hero.rotation.set(0, ma * 1.6, 0); }
  if (sun) { sun.position.set(26, h + 46, 16); sun.target.position.set(0, h, 0); sun.target.updateMatrixWorld(); }
  atT -= dt; if (atT <= 0) { atT = .3; for (const p of PL) p.m.castShadow = Math.abs(p.y - h) < 16; }
  for (const c of clouds) { c.a += c.sp * dt * .1; c.s.position.x = Math.cos(c.a) * c.r; c.s.position.z = Math.sin(c.a) * c.r; }
  for (const g of gems) if (!g.got) g.m.rotation.y += dt * 2;
}

/* ---------- entrada del shell (mouse; el táctil lo maneja bindTouch) ---------- */
function down(p, e) { if (e && e.touches) return; ptDown('m', p); }
function move(p, e) { if (e && e.touches) return; ptMove('m', p); }
function up(p, e) { if (e && e.touches) return; ptUp('m'); }
function key(code, dn) {
  keys[code] = dn;
  if (dn && (code === 'Space' || code === 'KeyJ')) jbuf = .14;
  if (dn && code === 'Escape') window.ARC_pause();
  if (dn && code === 'KeyQ') { camYaw += .5; tDrag = 0; }
  if (dn && code === 'KeyE') { camYaw -= .5; tDrag = 0; }
}

return {
  slug: 'torre', name: 'TORRE', sub: 'parkour al cielo', acc: '#ffd23f', three: true, sky: '#bcd0e8', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ m: Math.round(py), y: +py.toFixed(2), x: +px.toFixed(2), z: +pz.toFixed(2),
      i: idxMax, cp: cpIdx, score, vidas, t: +tPlay.toFixed(1), dead, won }),
    autoPlay() { dbgAuto = true; },
    lay: () => PL.map(p => ({ i: p.i, y: +p.y.toFixed(2), x: +p.bx.toFixed(2), z: +p.bz.toFixed(2), t: p.type, w: +(p.hw * 2).toFixed(2), d: +(p.hd * 2).toFixed(2), cp: p.cp, amp: p.amp, orad: p.orad })),
    caer() { py = PL[cpIdx].y - 40; vy = -20; onGround = false; standing = -1; },
    tp(i) { const p = PL[Math.max(0, Math.min(NP - 1, i | 0))]; px = p.x; py = p.y; pz = p.z; vy = 0;
      onGround = true; standing = p.i; idxMax = Math.max(idxMax, p.i); autoTgt = Math.min(NP - 1, p.i + 1);
      camYaw = Math.atan2(px, pz); camD = 10; camT.set(px, py + 1.3, pz); }
  }
};
})();

/* ===== DUNA — buggy sobre dunas ===========================================
   Terreno de dunas real (malla desplazada): el buggy sigue la pendiente, salta
   en las crestas y cruza CHECKPOINTS de banderas contra reloj. Sombras.
   Controles: ◀ ▶ + GAS (o A/D + W). */
window.GAME = (function () {
let T, scene, cam, ren, sun = null;
let car, cx, cz, cy, yaw, v, vy, air, timeLeft, score, cps, dead, won, tPlay;
let camY = 0, camYaw = 0, shk = 0, bordeT = -9;           // cámara suavizada + sacudón propio (ARC.shake no mueve el 3D)
let keys = {}, pad = null, terr = null, CP = [], ci = 0, flags = [], autoIx = null, autoBoost = false;
const MAPA = 260, NCP = 10, TAU = 6.2831853;
// La malla es MUCHO más grande que el disco jugable: con la malla de 520 se veía
// el BORDE DEL MUNDO (línea recta de horizonte, sin niebla) al llegar al tope.
// A 1300 el borde queda a >=400 u del jugador => 100% de niebla y tapado por dunas.
const MESH = 1300, RJUEGO = MAPA - 10;
const BONUS = 3, CPR2 = 64;                   // +3 s por bandera, radio de captura 8 u
let runN = 0;                                 // varía el circuito sin perder reproducibilidad

/* rnd propio (mulberry32): NADA de Math.random para el layout */
function mul32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const cfg = { dif: 'normal' };
try { cfg.dif = localStorage.getItem('duna_dif') || 'normal'; } catch (e) {}
const DIF = { chill: { v: 26, t: 34 }, normal: { v: 34, t: 28 }, pro: { v: 42, t: 24 } };

/* altura de la duna */
function h(x, z) {
  return Math.sin(x * .018) * 7 + Math.sin(z * .022 + 1.3) * 6
       + Math.sin((x + z) * .04) * 2.6 + Math.sin((x * .7 - z) * .07) * 1.2;
}
function normalAt(x, z) { const e = 2.5;
  const hx = h(x + e, z) - h(x - e, z), hz = h(x, z + e) - h(x, z - e);
  return { hx: hx / (2 * e), hz: hz / (2 * e) }; }

/* ---- arena de DESIERTO procedural -----------------------------------------
   En el repo no hay textura de duna (tex-sand.jpg es fondo de laguna turquesa y
   dejaba vetas verdes tiladas). Se genera acá: mancha macro para el albedo +
   ripples finos como bumpMap. Ambos canvas son tileables (frecuencias enteras). */
function cvTex(size, fn) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), im = g.createImageData(size, size), d = im.data, R = mul32(9137);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, val = ARC.clamp(fn(x / size, y / size, R), 0, 1) * 255;
    d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}
function sand(u, w, R) {
  const warp = Math.sin(TAU * (w * 2 + .13)) * .07 + Math.sin(TAU * (u * 3)) * .04;
  const rip = Math.sin(TAU * (u * 7 + warp)) * .5 + Math.sin(TAU * (u * 13 + w * 3 + warp * 2)) * .3
            + Math.sin(TAU * (u * 23 - w * 7)) * .15;
  const mac = Math.sin(TAU * (u + .2)) * .5 + Math.sin(TAU * (w * 2 - .1)) * .35
            + Math.sin(TAU * (u * 3 + w * 2)) * .22;
  return .8 + mac * .055 + rip * .1 + (R() - .5) * .05;
}

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  // la niebla cierra ANTES del plano lejano (shell usa far 400) para que no se
  // vea el corte del horizonte; igual damos aire a la cámara.
  scene.fog = new T.Fog(0xe8c98e, 100, 375);
  cam.far = 560; cam.updateProjectionMatrix();
  scene.add(new T.HemisphereLight(0xfff0d0, 0xa87a46, 1.5)); scene.add(new T.AmbientLight(0xffffff, .4));
  sun = new T.DirectionalLight(0xfff0cc, 2.5); sun.position.set(-60, 80, -40);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  { const c = sun.shadow.camera; c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 1; c.far = 260; sun.shadow.bias = -0.0008; }
  scene.add(sun.target);   // el target sigue al buggy en step(): el frustum de sombra viaja con él
  scene.add(sun);
  ren.toneMappingExposure = 1.12;
  // TERRENO de dunas
  const mapT = cvTex(512, sand); mapT.repeat.set(45, 45); mapT.colorSpace = T.SRGBColorSpace;   // ~29 u por tile
  const bumpT = mapT.clone(); bumpT.colorSpace = T.NoColorSpace; bumpT.needsUpdate = true;
  // 10 u por cuadro: h() no tiene nada más corto que ~74 u de onda, así que la duna
  // se ve igual de suave con menos triángulos que antes por unidad de superficie.
  const geo = new T.PlaneGeometry(MESH, MESH, 130, 130); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  terr = new T.Mesh(geo, new T.MeshStandardMaterial({ map: mapT, bumpMap: bumpT, bumpScale: 1.6, color: 0xe0b070, roughness: .95, metalness: 0 }));
  terr.receiveShadow = true; scene.add(terr);
  // BUGGY (auto del repo)
  try { const g = await ARC.loadGLB(MDL.car); const m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(4.6 / (Math.max(s.x, s.z) || 1)); m.updateWorldMatrix(true, true);
    // los GLB de fp/cdn ya miran a +Z, que es el rumbo del auto (cx += sin(yaw)):
    // con Math.PI el buggy andaba de marcha atrás.
    const nb = new T.Box3().setFromObject(m); m.position.y -= nb.min.y; m.rotation.y = 0;
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
    car = new T.Group(); car.add(m);
  } catch (e) { car = new T.Group();
    const bd = new T.Mesh(new T.BoxGeometry(2, .9, 4), new T.MeshStandardMaterial({ color: 0xffa62b, roughness: .5 })); bd.position.y = .8; bd.castShadow = true; car.add(bd); }
  scene.add(car);
  // CHECKPOINTS: banderas
  const fm = new T.MeshBasicMaterial({ color: 0x2fd1e0, side: T.DoubleSide });
  for (let i = 0; i < NCP; i++) {
    const g2 = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(.16, .16, 7, 6), new T.MeshStandardMaterial({ color: 0xf0f0f0 })); pole.position.y = 3.5; pole.castShadow = true; g2.add(pole);
    const fl = new T.Mesh(new T.PlaneGeometry(3.2, 2), fm); fl.position.set(1.6, 6, 0); g2.add(fl);
    scene.add(g2); flags.push(g2);
  }
  LIFE.setup(T);
  let palm = null; try { const pg = await ARC.loadGLB(MDL.palm); palm = pg.scene; } catch (e) {}
  const mkPalm = LIFE.palmTemplate(palm);
  for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, r = 80 + Math.random() * 150;
    const px2 = Math.cos(a) * r, pz2 = Math.sin(a) * r;
    const pl = mkPalm(); pl.position.set(px2, h(px2, pz2), pz2); pl.scale.multiplyScalar(.9 + Math.random() * .5);
    pl.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(pl); }
  LIFE.flock(scene, { count: 10, area: 240, ylo: 30, yhi: 60 });
  pad = LIFE.pad({ onPause: () => window.ARC_pause() });
  addEventListener('blur', () => { keys = {}; });   // si se pierde el foco con W apretada no queda acelerando solo
  ARCmenu();
}

function ARCmenu() {
  const menu = document.getElementById('menu'); if (!menu || document.getElementById('mOpts')) return;
  const st = document.createElement('style'); st.textContent =
    '#mOpts{position:absolute;left:0;right:0;top:44%;z-index:4;pointer-events:none;display:flex;flex-direction:column;gap:1.6vmin;align-items:center}' +
    '#mOpts .lab{font-size:2.1vmin;font-weight:800;letter-spacing:.18em;color:#ffe0b0}' +
    '#mOpts .row{display:flex;gap:1.4vmin;justify-content:center}' +
    '#mOpts .op{padding:1.3vmin 2.9vmin;border-radius:2.2vmin;font-size:2.3vmin;font-weight:800;color:#fff3e0;background:rgba(0,0,0,.42);border:.4vmin solid rgba(255,220,180,.22);cursor:pointer;pointer-events:auto}' +
    '#mOpts .op.on{background:#ffa62b;color:#2a1600;border-color:#fff;box-shadow:0 0 20px #ffa62b}';
  document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'mOpts';
  const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = 'DIFICULTAD'; box.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  [['chill', 'PASEO'], ['normal', 'RALLY'], ['pro', 'PRO']].forEach(([val, txt]) => {
    const b = document.createElement('div'); b.className = 'op' + (cfg.dif === val ? ' on' : ''); b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); cfg.dif = val; try { localStorage.setItem('duna_dif', val); } catch (x) {}
      row.querySelectorAll('.op').forEach(o => o.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
  box.appendChild(row); menu.appendChild(box);
}

function start() {
  const d = DIF[cfg.dif] || DIF.normal;
  const R = mul32(20260804 + (runN++) * 7919);   // circuito distinto cada partida, reproducible
  CP = []; for (let i = 0; i < NCP; i++) {
    const a = i / NCP * TAU + .3 + (R() - .5) * .34, r = 78 + Math.floor(R() * 4) * 26;
    CP.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
  flags.forEach((f, i) => { f.position.set(CP[i].x, h(CP[i].x, CP[i].z), CP[i].z); f.visible = true; });
  cx = 0; cz = 0; yaw = 0; v = d.v * .5; vy = 0; air = 0; cy = h(0, 0) + .5;
  // OTRA VEZ entra directo por begin() (sin pasar por attract3d): hay que dejar
  // el auto y la cámara en el suelo o arranca cayendo desde la altura de la muerte.
  if (car) { car.position.set(cx, cy, cz); car.rotation.set(0, 0, 0); }
  camY = cy + 4.6; camYaw = yaw; shk = 0; bordeT = -9;
  autoIx = null; autoBoost = false; keys = {};
  timeLeft = d.t; score = 0; cps = 0; ci = 0; dead = false; won = false; tPlay = 0;
}

function w2s(x, y, z) { const p = new T.Vector3(x, y, z).project(cam); if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { dead = true; ARC.over({ win: false, score, title: 'SIN TIEMPO', sub: cps + '/' + NCP + ' banderas', coins: (score / 25 | 0) }); return; }
  const d = DIF[cfg.dif] || DIF.normal;
  let ix = pad ? pad.steer : 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (autoIx != null) ix = autoIx;
  const gas = autoBoost || (pad && pad.boost) || keys.KeyW || keys.ArrowUp || keys.Space;
  v += ((gas ? d.v * 1.25 : d.v * .55) - v) * Math.min(1, dt * 1.8);
  yaw -= ix * dt * (air > 0 ? .5 : 2.1);
  cx += Math.sin(yaw) * v * dt; cz += Math.cos(yaw) * v * dt;
  // borde del circuito: arena blanda. Antes era `v *= .6` POR FRAME, o sea que
  // apoyado contra el borde el buggy quedaba clavado a 6 km/h (muro invisible).
  const L = Math.hypot(cx, cz);
  if (L > RJUEGO) { cx *= RJUEGO / L; cz *= RJUEGO / L; v = Math.min(v, d.v * .5);
    if (tPlay - bordeT > 3) { bordeT = tPlay; ARC.toast('ARENA BLANDA — VOLVÉ'); } }
  // suspensión/salto: sigue el terreno y despega en las crestas
  const gy = h(cx, cz);
  vy -= 26 * dt; let y = cy + vy * dt;
  if (y <= gy + .5) { y = gy + .5;
    if (vy < -9) { shk = Math.max(shk, 3.2); ARC.vib(28); ARC.sfx('boom', { vol: .22, rate: 1.8 }); }
    vy = 0; air = 0; } else air += dt;
  cy = y; car.position.set(cx, y, cz);
  const n = normalAt(cx, cz);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const pitch = -(n.hx * fx + n.hz * fz), roll = -(n.hx * fz - n.hz * fx);
  car.rotation.set(0, 0, 0); car.rotateY(yaw);
  car.rotateX(air > .05 ? ARC.clamp(vy * .02, -.2, .22) : pitch); car.rotateZ(roll * .8 - ix * .07);
  // ---- cámara 3ª persona: yaw y altura interpolados, mirada que cabecea con la
  // pendiente y piso mínimo contra el terreno (no se mete en la duna de atrás).
  let dyaw = yaw - camYaw; while (dyaw > Math.PI) dyaw -= TAU; while (dyaw < -Math.PI) dyaw += TAU;
  camYaw += dyaw * Math.min(1, dt * 6);
  const cd = 12, cpx = cx - Math.sin(camYaw) * cd, cpz = cz - Math.cos(camYaw) * cd, gb = h(cpx, cpz);
  // se suaviza la altura FINAL (auto o loma de atrás, la que mande): así el clamp
  // de terreno tampoco copia el bamboleo de la duna, y el piso duro nunca entra.
  camY += (Math.max(y + 4.6, gb + 3.2) - camY) * Math.min(1, dt * 4);
  const ya = h(cx + fx * 14, cz + fz * 14);   // altura del terreno adelante: se ve dónde vas a caer
  cam.position.set(cpx, Math.max(camY, gb + 2.2), cpz);
  cam.lookAt(cx + fx * 9, y * .4 + ya * .6 + 1.4, cz + fz * 9);
  if (shk > .05) { cam.position.x += ARC.rnd(-shk, shk) * .08;
    cam.position.y += ARC.rnd(-shk, shk) * .08; cam.position.z += ARC.rnd(-shk, shk) * .08; shk *= .85; } else shk = 0;
  if (sun) { sun.target.position.set(cx, 0, cz); sun.position.set(cx - 60, 80, cz - 40); }
  LIFE.update(dt);
  // polvo (sale por detrás del auto)
  if (v > 8 && Math.random() < .5) { const bp = w2s(cx - fx * 2.4, y - .2, cz - fz * 2.4);
    if (bp) ARC.fx.burst(bp.x, bp.y, 'rgba(226,196,140,.75)', 2, 2.2); }
  // checkpoint
  const c = CP[ci];
  if (c && (cx - c.x) ** 2 + (cz - c.z) ** 2 < CPR2) {
    cps++; score += 120; timeLeft += BONUS; flags[ci].visible = false;
    const sp = w2s(c.x, h(c.x, c.z) + 5, c.z);
    if (sp) { ARC.fx.ring(sp.x, sp.y, '#2fd1e0', 18); ARC.fx.text(sp.x, sp.y - 28, '+' + BONUS + 's', '#2fd1e0'); }
    ARC.sfx('coin', { vol: .6 }); ARC.vib(20); ARC.toast('BANDERA ' + cps + '/' + NCP);
    ci++;
    if (ci >= NCP) { won = true; dead = true;
      ARC.over({ win: true, score: score + Math.round(timeLeft * 10), title: '¡RALLY COMPLETO!', sub: NCP + ' banderas', coins: (score / 20 | 0) }); return; }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H; g.textAlign = 'center';
  g.font = '900 34px system-ui'; g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 18px system-ui'; g.fillStyle = '#ffc06a'; g.fillText('bandera ' + Math.min(cps + 1, NCP) + '/' + NCP, W / 2, 68);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText((v * 3.6 | 0) + ' km/h' + (air > .15 ? '  ✈ AIRE' : ''), 24, 62);
  // al completar las 10 banderas ci queda en NCP: sin este guardado CP[ci] es
  // undefined y draw2d abortaba (shell sigue dibujando en 'over') perdiendo media HUD.
  const c = CP[Math.min(ci, NCP - 1)];
  if (c) { const sp = w2s(c.x, h(c.x, c.z) + 5, c.z);
    if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) { g.strokeStyle = '#2fd1e0'; g.lineWidth = 3; g.beginPath(); g.arc(sp.x, sp.y, 20 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke(); }
    else { const ang = Math.atan2(c.x - cx, c.z - cz) - yaw; g.save(); g.translate(W / 2, 118); g.rotate(-ang);
      g.fillStyle = '#2fd1e0'; g.beginPath(); g.moveTo(0, -24); g.lineTo(13, 8); g.lineTo(-13, 8); g.closePath(); g.fill(); g.restore(); } }
  if (pad) pad.draw(g, '#ffa62b');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('❚❚', W - 34, 40);
}

let ma = 0;
function attract3d(dt) { ma += dt * 1.15;      // orbita rapida: sobre arena uniforme una
  const y0 = h(0, 0) + .5;                     // orbita lenta da dos cuadros identicos
  if (car) { car.position.set(0, y0, 0); car.rotation.set(0, ma * 1.6, 0); }
  if (cam) { const r = 13 + Math.sin(ma * .7) * 3.5;   // acerca/aleja: cambia el encuadre
    cam.position.set(Math.cos(ma) * r, h(0, 0) + 5 + Math.sin(ma * 1.3) * 2.2, Math.sin(ma) * r);
    // barrido VERTICAL de la mirada: mueve el horizonte por el cuadro, así cambia la
    // proporción cielo/arena (sobre desierto uniforme el brillo promedio no cambia solo
    // con orbitar, y el menú se veía "congelado")
    cam.lookAt(0, h(0, 0) + 1 + Math.sin(ma * .55) * 11, 0); }
  if (sun) { sun.target.position.set(0, 0, 0); sun.position.set(-60, 80, -40); }
  cy = y0; camY = y0 + 4.6; camYaw = 0; shk = 0;
  if (window.LIFE) LIFE.update(dt); }

function down() {} function move() {} function up() {}
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'duna', name: 'DUNA', sub: 'rally de dunas', acc: '#ffa62b', three: true, sky: '#e8c98e', best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: +(timeLeft || 0).toFixed(1), cps, dead, won, x: cx | 0, z: cz | 0 }),
    autoPlay() { if (dead) { autoIx = null; autoBoost = false; return; }
      const c = CP[Math.min(ci, NCP - 1)]; if (!c) { autoIx = null; autoBoost = false; return; }
      const ty = Math.atan2(c.x - cx, c.z - cz); let dy = ty - yaw;
      while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
      autoIx = ARC.clamp(-dy * 2.2, -1, 1);
      autoBoost = Math.abs(dy) < .7; }   // suelta el gas en las curvas cerradas (si no, el radio de giro no entra)
  }
};
})();

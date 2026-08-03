/* ===== HORDA · DISTRITO CERO — campaña de acción en 3ª persona =============
   Ciudad extensa (calles de asfalto, manzanas, autos abandonados, farolas),
   MINIMAPA, y una campaña de 5 MISIONES con NPCs que hablan:
     1 EL REFUGIO   llegar al refugio y hablar con la Dra. Vega
     2 LA ESCOLTA   llevarla a la clínica (te siguen, emboscadas)
     3 SUMINISTROS  juntar 3 cajas marcadas
     4 LA DEFENSA   aguantar 60 s en el refugio
     5 EL COLOSO    jefe + secuaces
   El personaje corre con la SMG (hueso RightHand) y dispara solo. */
window.GAME = (function () {
const MAPA = 150, BLOQUE = 46;
let T, scene, cam, ren, ch;
let px = 0, pz = 0, pyaw = 0, camYaw = 0;
let enemies, tmplEnemy, tmplBoss, tracers, meds, crates, npcs, boss;
let hp, score, kills, dead, tPlay, fireT, spawnT;
let cap, capDone, defT, marker, buildings = [], dlg = null, usarNPC = null;
let joy = null, keys = {}, lastLX = null, won = false;

/* ---------------- misiones ---------------- */
const CAPS = [
  { n: 'MISIÓN 1', t: 'EL REFUGIO', obj: 'refugio',
    txt: 'Llegá al REFUGIO marcado en el minimapa.' },
  { n: 'MISIÓN 2', t: 'LA ESCOLTA', obj: 'clinica',
    txt: 'Escoltá a la Dra. Vega hasta la CLÍNICA.\nNo dejes que la rodeen.' },
  { n: 'MISIÓN 3', t: 'SUMINISTROS', obj: null,
    txt: 'Juntá las 3 CAJAS de suministros (◆ en el minimapa).' },
  { n: 'MISIÓN 4', t: 'LA DEFENSA', obj: 'refugio',
    txt: 'Aguantá 60 segundos defendiendo el refugio.' },
  { n: 'MISIÓN 5', t: 'EL COLOSO', obj: 'plaza',
    txt: 'Terminá con el COLOSO en la plaza.' }
];
const POI = {
  refugio: { x: 92, z: 92 }, clinica: { x: -96, z: -60 }, plaza: { x: 0, z: -104 }
};
const VEGA_LINES = [
  ['DRA. VEGA', 'Al fin alguien con un arma que funciona.\nLa horda tomó el distrito entero.'],
  ['DRA. VEGA', 'Tengo que llegar a la clínica: quedaron\nvacunas del brote. Sin ellas no hay refugio\nque aguante el invierno.'],
  ['DRA. VEGA', 'Vos adelante. Yo te sigo. Si me rodean…\nbueno, tratá de que no me rodeen.']
];
const RUSO_LINES = [
  ['RUSO', 'El generador está en las últimas y la\nhorda huele la sangre. Vienen DE NOCHE.'],
  ['RUSO', 'Aguantá la posición 60 segundos mientras\nlo reinicio. Después me debés una birra.']
];

/* ---------------- mundo ---------------- */
async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0x3a2836, 60, 200);
  scene.add(new T.HemisphereLight(0xffc48a, 0x2a2030, 1.15));
  scene.add(new T.AmbientLight(0xffe6c8, .35));
  const sun = new T.DirectionalLight(0xffd0a0, 2.3); sun.position.set(2, 10, -46); scene.add(sun);
  const rim = new T.DirectionalLight(0x9a7cff, .8); rim.position.set(-20, 8, 20); scene.add(rim);
  ren.toneMappingExposure = 1.12;
  const load = (u, rep) => { const t = tl.load(u); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = T.SRGBColorSpace; return t; };
  // CALLES: todo el piso es asfalto; cada manzana lleva su vereda + edificios
  const ground = new T.Mesh(new T.PlaneGeometry(MAPA * 2 + 140, MAPA * 2 + 140),
    new T.MeshStandardMaterial({ map: load(TEX.asfalto, 60), color: 0x9a9298, roughness: .98 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // líneas de calle (amarillas, baratas: un plano fino por eje de calle)
  const lineMat = new T.MeshBasicMaterial({ color: 0xd8b23a });
  for (let i = -3; i <= 3; i++) {
    const l1 = new T.Mesh(new T.PlaneGeometry(.35, MAPA * 2 + 100), lineMat);
    l1.rotation.x = -Math.PI / 2; l1.position.set(i * BLOQUE, .02, 0); scene.add(l1);
    const l2 = new T.Mesh(new T.PlaneGeometry(MAPA * 2 + 100, .35), lineMat);
    l2.rotation.x = -Math.PI / 2; l2.position.set(0, .02, i * BLOQUE); scene.add(l2);
  }
  const facade = load(TEX.facade, 1), brick = load(TEX.brick, 1), roof = load(TEX.roof, 1), stucco = load(TEX.stucco, 4);
  const mats = [new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0xbfc8de }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0xc89a80 }),
    new T.MeshStandardMaterial({ map: roof, roughness: .9, color: 0x9aa4b8 }),
    new T.MeshStandardMaterial({ map: facade, roughness: .92, color: 0x8892b0 }),
    new T.MeshStandardMaterial({ map: brick, roughness: .95, color: 0x7a6a62 })];
  const matVereda = new T.MeshStandardMaterial({ map: stucco, color: 0xb0a8a4, roughness: .96 });
  buildings = [];
  // manzanas 6x6 (menos los puntos de la historia, que quedan como plazas)
  for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 3; gz++) {
    const cx = gx * BLOQUE + BLOQUE / 2, cz = gz * BLOQUE + BLOQUE / 2;
    if (Math.abs(cx) > MAPA || Math.abs(cz) > MAPA) continue;
    let plaza = false;
    for (const k in POI) if (Math.hypot(cx - POI[k].x, cz - POI[k].z) < 34) plaza = true;
    // vereda de la manzana
    const slab = new T.Mesh(new T.BoxGeometry(BLOQUE - 10, .22, BLOQUE - 10), matVereda);
    slab.position.set(cx, .11, cz); scene.add(slab);
    if (plaza) continue;
    // 1-2 edificios por manzana
    const n = Math.random() < .5 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const w = ARC.rnd(11, BLOQUE - 20), dp = ARC.rnd(11, n === 2 ? 13 : BLOQUE - 20), h = ARC.rnd(9, 34);
      const ox = n === 2 ? 0 : ARC.rnd(-3, 3), oz = n === 2 ? (i === 0 ? -9 : 9) : ARC.rnd(-3, 3);
      const g2 = new T.BoxGeometry(w, h, dp); const uv = g2.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (w / 5), uv.getY(k) * (h / 5));
      const b = new T.Mesh(g2, mats[(Math.random() * mats.length) | 0]);
      b.position.set(cx + ox, h / 2 + .2, cz + oz); scene.add(b);
      buildings.push({ x: cx + ox, z: cz + oz, rx: w / 2 + 1.1, rz: dp / 2 + 1.1 });
    }
  }
  // farolas (poste + foco emisivo, sin luces reales: barato)
  const poleMat = new T.MeshStandardMaterial({ color: 0x3a3f4a, roughness: .8 });
  const bulbMat = new T.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let i = 0; i < 22; i++) {
    const gx = (Math.round(ARC.rnd(-3, 3))) * BLOQUE, gz = (Math.round(ARC.rnd(-3, 3))) * BLOQUE;
    const p = new T.Mesh(new T.CylinderGeometry(.09, .12, 5.4, 6), poleMat);
    p.position.set(gx + ARC.rnd(-2, 2), 2.7, gz + ARC.rnd(-2, 2)); scene.add(p);
    const bulb = new T.Mesh(new T.SphereGeometry(.22, 6, 6), bulbMat);
    bulb.position.set(p.position.x, 5.5, p.position.z); scene.add(bulb);
  }
  // autos abandonados por las calles
  try {
    const vs = await Promise.all(MDL.veh.map(u => ARC.loadGLB(u).then(g => g.scene).catch(() => null)));
    for (let i = 0; i < 16; i++) { const src = vs[i % vs.length]; if (!src) continue;
      const v = src.clone(true); const vb = new T.Box3().setFromObject(v); const vsz = vb.getSize(new T.Vector3());
      v.scale.setScalar(4.6 / (Math.max(vsz.x, vsz.z) || 1));
      v.position.set(0, 0, 0); v.updateWorldMatrix(true, true);
      const nb = new T.Box3().setFromObject(v);
      const onX = Math.random() < .5;
      const roadI = Math.round(ARC.rnd(-2, 2)) * BLOQUE;
      const along = ARC.rnd(-MAPA + 12, MAPA - 12);
      v.position.set(onX ? roadI + ARC.rnd(-4, 4) : along, -nb.min.y, onX ? along : roadI + ARC.rnd(-4, 4));
      v.rotation.y = ARC.rnd(0, 6.28); scene.add(v); }
  } catch (e) {}
  // refugio: muro en U + fogata | clinica: caja con cruz | plaza: círculo marcado
  const matRef = new T.MeshStandardMaterial({ map: brick, color: 0xa08a70, roughness: .95 });
  const mkWall = (x, z, w, d) => { const m = new T.Mesh(new T.BoxGeometry(w, 3, d), matRef); m.position.set(x, 1.5, z); scene.add(m);
    buildings.push({ x, z, rx: w / 2 + .8, rz: d / 2 + .8 }); };
  mkWall(POI.refugio.x - 9, POI.refugio.z, 1.4, 20); mkWall(POI.refugio.x + 9, POI.refugio.z, 1.4, 20);
  mkWall(POI.refugio.x, POI.refugio.z - 9, 20, 1.4);
  const fire = new T.PointLight(0xff9a40, 2.4, 18); fire.position.set(POI.refugio.x, 1.4, POI.refugio.z); scene.add(fire);
  const fmesh = new T.Mesh(new T.ConeGeometry(.5, .9, 6), new T.MeshBasicMaterial({ color: 0xffb050 }));
  fmesh.position.set(POI.refugio.x, .45, POI.refugio.z); scene.add(fmesh);
  const cl = new T.Mesh(new T.BoxGeometry(10, 6, 8), mats[0]); cl.position.set(POI.clinica.x, 3, POI.clinica.z - 8); scene.add(cl);
  buildings.push({ x: POI.clinica.x, z: POI.clinica.z - 8, rx: 6, rz: 5 });
  const cruz = new T.Mesh(new T.BoxGeometry(2.6, .7, .3), new T.MeshBasicMaterial({ color: 0xff4455 }));
  cruz.position.set(POI.clinica.x, 5, POI.clinica.z - 3.8); scene.add(cruz);
  const cruz2 = new T.Mesh(new T.BoxGeometry(.7, 2.6, .3), cruz.material); cruz2.position.copy(cruz.position); scene.add(cruz2);
  // marcador de objetivo (rombo flotante)
  marker = new T.Mesh(new T.OctahedronGeometry(1.1), new T.MeshBasicMaterial({ color: 0xffd23f }));
  scene.add(marker);
  // PERSONAJE
  ch = await CHAR.load(T, { alto: 1.8, clips: { idle: MDL.aIdle, run: MDL.aRun } });
  scene.add(ch.root);
  const blob = new T.Mesh(new T.CircleGeometry(.55, 20), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .02; ch.root.add(blob);
  await ch.equip(MDL.gun, { esc: .55, ry: Math.PI / 2, rz: -Math.PI / 2, py: .05, pz: .02 });
  ch.play('idle', 0);
  // NPCs: Vega (médica, campera clara) y Ruso (guardia del refugio)
  npcs = [];
  async function mkNPC(nombre, tint, x, z) {
    const c = await CHAR.load(T, { alto: 1.76, clips: { idle: MDL.aIdle, run: MDL.aRun } });
    c.root.position.set(x, 0, z); scene.add(c.root);
    c.root.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.color = new T.Color(tint); } });
    c.play('idle', 0);
    const n = { ch: c, nombre, x, z, sigue: false, lines: null, li: 0 };
    npcs.push(n); return n;
  }
  await mkNPC('DRA. VEGA', 0xd9c8ff, POI.refugio.x, POI.refugio.z + 3);
  await mkNPC('RUSO', 0x9fd8b0, POI.refugio.x + 4, POI.refugio.z - 2);
  // enemigos
  try { const eg = await ARC.loadGLB(MDL.enemy); tmplEnemy = eg.scene;
    const box = new T.Box3().setFromObject(tmplEnemy); const sz = box.getSize(new T.Vector3());
    tmplEnemy.scale.setScalar(2.1 / (sz.y || 1));
    tmplEnemy.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  } catch (e) { tmplEnemy = new T.Mesh(new T.CapsuleGeometry(.5, 1.2, 4, 8), new T.MeshStandardMaterial({ color: 0xff5470 })); }
  try { const bg = await ARC.loadGLB(MDL.jefe); tmplBoss = bg.scene;
    const box = new T.Box3().setFromObject(tmplBoss); const sz = box.getSize(new T.Vector3());
    tmplBoss.scale.setScalar(4.6 / (sz.y || 1));
    tmplBoss.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  } catch (e) { tmplBoss = null; }
  enemies = []; tracers = []; meds = []; crates = [];
}

/* ---------------- helpers ---------------- */
function solid(x, z) { for (const b of buildings) if (Math.abs(x - b.x) < b.rx && Math.abs(z - b.z) < b.rz) return b; return null; }
function pushOut(o) { const b = solid(o.x, o.z); if (!b) return;
  const ox = b.rx - Math.abs(o.x - b.x), oz = b.rz - Math.abs(o.z - b.z);
  if (ox < oz) o.x += (o.x > b.x ? ox : -ox); else o.z += (o.z > b.z ? oz : -oz); }
function worldToScreen(x, y, z) { const v = new T.Vector3(x, y, z).project(cam);
  if (v.z > 1) return null; return { x: (v.x * .5 + .5) * ARC.W, y: (-v.y * .5 + .5) * ARC.H }; }
function objetivoPos() {
  if (cap === 2) { let best = null, bd = 1e9; for (const c of crates) { const d = (c.position.x - px) ** 2 + (c.position.z - pz) ** 2; if (d < bd) { bd = d; best = c; } }
    return best ? { x: best.position.x, z: best.position.z } : POI.refugio; }
  if (cap === 4 && boss) return { x: boss.position.x, z: boss.position.z };
  return POI[CAPS[cap].obj] || POI.refugio;
}

/* ---------------- enemigos ---------------- */
function spawnEnemy(nx, nz, hpx) {
  const e = tmplEnemy.clone(true);
  let x = nx, z = nz;
  if (x == null) { const a = ARC.rnd(0, 6.28); x = px + Math.cos(a) * 42; z = pz + Math.sin(a) * 42; }
  x = ARC.clamp(x, -MAPA, MAPA); z = ARC.clamp(z, -MAPA, MAPA);
  e.position.set(x, 0, z);
  e.userData = { hp: hpx || (3 + cap), spd: 2.2 + cap * .25 + ARC.rnd(-.2, .4), atk: 0 };
  scene.add(e); enemies.push(e);
}
function spawnBoss() {
  boss = (tmplBoss || tmplEnemy).clone(true);
  boss.position.set(POI.plaza.x, 0, POI.plaza.z);
  boss.userData = { hp: 70, max: 70, spd: 2.6, atk: 0 };
  scene.add(boss);
}

/* ---------------- misiones ---------------- */
function setCap(i) {
  cap = i; capDone = false;
  ARC.toast(CAPS[i].n + ' · ' + CAPS[i].t); ARC.sfx('power', { vol: .55 });
  if (i === 1) { npcs[0].sigue = true; }
  if (i === 2) { crates = [];
    const spots = [{ x: -50, z: 40 }, { x: 40, z: -48 }, { x: -6, z: 96 }];
    for (const s of spots) { const c = new T.Mesh(new T.BoxGeometry(1.2, 1.2, 1.2),
      new T.MeshStandardMaterial({ color: 0xd9a13a, roughness: .6 }));
      c.position.set(s.x, .6, s.z); scene.add(c); crates.push(c); } }
  if (i === 3) { defT = 60; npcs[0].sigue = false; npcs[0].x = POI.refugio.x; npcs[0].z = POI.refugio.z + 3; }
  if (i === 4) spawnBoss();
}
function dlgShow(lines, onDone) { dlg = { lines, i: 0, onDone: onDone || null }; }
function dlgNext() { if (!dlg) return; dlg.i++;
  if (dlg.i >= dlg.lines.length) { const f = dlg.onDone; dlg = null; if (f) f(); } }

/* ---------------- disparo ---------------- */
function shootAt(e) {
  fireT = .16;
  ARC.sfx('shoot', { vol: .4, rate: ARC.rnd(.95, 1.1) }); ARC.vib(6);
  const from = new T.Vector3(); (ch.bones.rHand || ch.root).getWorldPosition(from);
  const to = new T.Vector3(e.position.x, e.position.y + 1.1, e.position.z);
  const m = new T.Mesh(new T.SphereGeometry(.07, 5, 5), new T.MeshBasicMaterial({ color: 0xffd070 }));
  m.position.copy(from); scene.add(m);
  tracers.push({ m, to, v: to.clone().sub(from).normalize().multiplyScalar(48), e });
  pyaw = Math.atan2(e.position.x - px, e.position.z - pz);
}
function hitEnemy(e, dmg) {
  e.userData.hp -= dmg;
  const sp = worldToScreen(e.position.x, e.position.y + 1.4, e.position.z);
  if (sp) ARC.fx.burst(sp.x, sp.y, '#ffd23f', 5, 4);
  if (e.userData.hp <= 0) {
    const sp2 = worldToScreen(e.position.x, e.position.y + 1, e.position.z);
    if (sp2) { ARC.fx.burst(sp2.x, sp2.y, '#ff5470', 14, 6); ARC.fx.ring(sp2.x, sp2.y, '#fff', 8); }
    if (e === boss) { boss = null; capDone = true; }
    else if (Math.random() < .1) { const m = new T.Mesh(new T.BoxGeometry(.5, .5, .5), new T.MeshBasicMaterial({ color: 0x7dff9e }));
      m.position.set(e.position.x, .4, e.position.z); scene.add(m); meds.push(m); }
    scene.remove(e); const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
    score += 25; kills++; ARC.sfx('boom', { vol: .35 }); ARC.shake(2);
  } else ARC.sfx('hit', { vol: .3 });
}
function hurt(d) { hp -= d; ARC.shake(5); ARC.vib(30); ARC.sfx('hurt', { vol: .5 });
  if (hp <= 0) { hp = 0; dead = true; ARC.over({ win: false, score, title: 'CAÍSTE', sub: CAPS[cap].n, coins: (score / 20 | 0) }); } }

/* ---------------- arranque ---------------- */
function start() {
  px = 0; pz = 0; pyaw = 0; camYaw = 0; hp = 100; score = 0; kills = 0; dead = false; won = false;
  tPlay = 0; fireT = 0; spawnT = 2; dlg = null; boss = null;
  for (const e of (enemies || [])) scene.remove(e); enemies = [];
  for (const m of (meds || [])) scene.remove(m); meds = [];
  for (const c of (crates || [])) scene.remove(c); crates = [];
  if (npcs) { npcs[0].sigue = false; npcs[0].x = POI.refugio.x; npcs[0].z = POI.refugio.z + 3;
    npcs[1].x = POI.refugio.x + 4; npcs[1].z = POI.refugio.z - 2; npcs[0].li = 0; npcs[1].li = 0; }
  if (ch) { ch.root.position.set(0, 0, 0); ch.play('idle', 0); }
  setCap(0);
  dlgShow([['RADIO', 'Distrito Cero. La horda tomó las calles.\nBuscá el refugio del sureste: quedan vivos.']]);
}

/* ---------------- paso ---------------- */
function step(dt) {
  if (dead || won) return;
  tPlay += dt;
  if (dlg) { ch.play('idle'); ch.update(dt, 1); return; }   // el diálogo pausa la acción
  // movimiento
  let mx = 0, mz = 0;
  if (joy) { mx = joy.x; mz = joy.y; }
  if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  const mv = Math.min(1, Math.hypot(mx, mz));
  if (mv > .1) {
    const a = Math.atan2(mx, mz) + camYaw;
    px += Math.sin(a) * 6 * mv * dt; pz += Math.cos(a) * 6 * mv * dt;
    px = ARC.clamp(px, -MAPA, MAPA); pz = ARC.clamp(pz, -MAPA, MAPA);
    const me = { x: px, z: pz }; pushOut(me); px = me.x; pz = me.z;
    if (fireT <= 0) pyaw = a;
    ch.play('run');
  } else ch.play('idle');
  ch.root.position.set(px, 0, pz);
  let dy = pyaw - ch.root.rotation.y;
  while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
  ch.root.rotation.y += dy * Math.min(1, dt * 10);
  ch.update(dt, mv > .1 ? 1.15 : 1);
  const cd = 6.6;
  cam.position.set(px - Math.sin(camYaw) * cd, 3.2, pz - Math.cos(camYaw) * cd);
  cam.lookAt(px, 1.4, pz);
  // disparo automático
  fireT -= dt;
  if (fireT <= 0) { let best = null, bd = 26 * 26;
    const pool = boss ? enemies.concat([boss]) : enemies;
    for (const e of pool) { const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2; if (d < bd) { bd = d; best = e; } }
    if (best) shootAt(best); }
  // trazadoras
  for (let i = tracers.length - 1; i >= 0; i--) { const t2 = tracers[i];
    t2.m.position.addScaledVector(t2.v, dt);
    if (t2.m.position.distanceToSquared(t2.to) < 1.4) { scene.remove(t2.m); tracers.splice(i, 1);
      if (enemies.includes(t2.e) || t2.e === boss) hitEnemy(t2.e, 1); }
    else if (t2.m.position.length() > 500) { scene.remove(t2.m); tracers.splice(i, 1); } }
  // enemigos → jugador (o la escoltada, 50/50 en la misión 2)
  const pool2 = boss ? enemies.concat([boss]) : enemies;
  for (const e of pool2) { const u = e.userData;
    let tx = px, tz = pz;
    if (cap === 1 && npcs[0].sigue && Math.random() < .004) { tx = npcs[0].x; tz = npcs[0].z; }
    const dx = tx - e.position.x, dz = tz - e.position.z, d = Math.hypot(dx, dz);
    e.rotation.y = Math.atan2(dx, dz);
    if (d > (e === boss ? 2.6 : 1.6)) { e.position.x += dx / d * u.spd * dt; e.position.z += dz / d * u.spd * dt;
      e.position.y = Math.abs(Math.sin(tPlay * 7 + e.position.x)) * (e === boss ? .04 : .1); }
    else { u.atk -= dt; if (u.atk <= 0) { u.atk = .9; hurt(e === boss ? 16 : 7); } }
  }
  // jefe invoca secuaces
  if (boss && Math.floor(tPlay) % 8 === 0 && Math.floor(tPlay) !== boss.userData.lastCall) {
    boss.userData.lastCall = Math.floor(tPlay);
    spawnEnemy(boss.position.x + ARC.rnd(-6, 6), boss.position.z + ARC.rnd(-6, 6));
  }
  // NPCs: la que te sigue + hablar
  usarNPC = null;
  for (const n of npcs) {
    if (n.sigue) { const d = Math.hypot(px - n.x, pz - n.z);
      if (d > 3) { n.x += (px - n.x) / d * 5.2 * dt; n.z += (pz - n.z) / d * 5.2 * dt; n.ch.play('run'); }
      else n.ch.play('idle');
      const nn = { x: n.x, z: n.z }; pushOut(nn); n.x = nn.x; n.z = nn.z; }
    else n.ch.play('idle');
    n.ch.root.position.set(n.x, 0, n.z);
    n.ch.root.rotation.y = Math.atan2(px - n.x, pz - n.z);
    n.ch.update(dt, 1);
    if (Math.hypot(px - n.x, pz - n.z) < 3.4) usarNPC = n;
  }
  // botiquines
  for (let i = meds.length - 1; i >= 0; i--) { const m = meds[i]; m.rotation.y += dt * 2;
    if ((m.position.x - px) ** 2 + (m.position.z - pz) ** 2 < 2.3) { scene.remove(m); meds.splice(i, 1);
      hp = Math.min(100, hp + 30); ARC.sfx('coin', { vol: .6 }); ARC.toast('+30 ❤'); } }
  // director de enemigos ambiente
  spawnT -= dt;
  const cupo = cap === 0 ? 3 : cap === 1 ? 6 : cap === 2 ? 5 : cap === 3 ? 9 : 6;
  if (spawnT <= 0 && enemies.length < cupo) { spawnEnemy(); spawnT = cap === 3 ? 1.1 : 2.4; }
  // marcador flotante
  const op = objetivoPos();
  marker.position.set(op.x, 4.6 + Math.sin(tPlay * 2) * .5, op.z);
  marker.rotation.y = tPlay * 1.6;
  // ---- lógica de cada misión
  if (cap === 0 && Math.hypot(px - POI.refugio.x, pz - POI.refugio.z) < 7) {
    if (!capDone) { capDone = true;
      dlgShow(VEGA_LINES, () => setCap(1)); }
  } else if (cap === 1) {
    const d = Math.hypot(npcs[0].x - POI.clinica.x, npcs[0].z - POI.clinica.z);
    if (d < 8) { score += 150;
      dlgShow([['DRA. VEGA', 'Las vacunas están acá. Sos de fierro.\nVolvé al refugio: Ruso te necesita.']], () => setCap(2)); }
  } else if (cap === 2) {
    for (let i = crates.length - 1; i >= 0; i--) { const c = crates[i];
      c.rotation.y += dt;
      if ((c.position.x - px) ** 2 + (c.position.z - pz) ** 2 < 3.4) { scene.remove(c); crates.splice(i, 1);
        score += 80; ARC.sfx('coin', { vol: .7 }); ARC.toast('CAJA ' + (3 - crates.length) + '/3'); ARC.vib(25); } }
    if (!crates.length) dlgShow(RUSO_LINES, () => setCap(3));
  } else if (cap === 3) {
    if (Math.hypot(px - POI.refugio.x, pz - POI.refugio.z) < 16) { defT -= dt; }
    if (defT <= 0) { score += 200;
      dlgShow([['RUSO', 'GENERADOR ARRIBA. Ahora lo grande:\nel COLOSO anida en la plaza oeste.\nTerminalo y el distrito respira.']], () => setCap(4)); }
  } else if (cap === 4 && capDone) {
    won = true; score += 400;
    ARC.over({ win: true, score, title: '¡DISTRITO LIBRE!', sub: 'campaña completa', coins: (score / 15 | 0) });
  }
}

/* ---------------- HUD + minimapa + diálogo ---------------- */
function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  // banner de misión
  const op = objetivoPos();
  const dist = Math.hypot(op.x - px, op.z - pz) | 0;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(0,0,0,.45)';
  g.fillRect(W / 2 - 190, 12, 380, 46);
  g.fillStyle = '#ffd23f'; g.font = '900 15px system-ui';
  g.fillText(CAPS[cap].n + ' · ' + CAPS[cap].t, W / 2, 30);
  g.fillStyle = '#fff'; g.font = '700 12px system-ui';
  g.fillText(cap === 3 && defT != null ? ('aguantá ' + Math.max(0, defT).toFixed(0) + ' s') : (dist + ' m al objetivo'), W / 2, 48);
  // vida
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(24, H - 44, 240, 18);
  g.fillStyle = hp > 30 ? '#8cff66' : '#ff5470'; g.fillRect(24, H - 44, 240 * hp / 100, 18);
  g.fillStyle = '#fff'; g.font = '900 14px system-ui'; g.textAlign = 'left'; g.fillText('❤ ' + (hp | 0), 30, H - 30);
  g.font = '700 12px system-ui'; g.fillStyle = '#9fb0d8'; g.fillText(score + ' pts · ' + kills + ' bajas', 24, H - 52);
  // barra del jefe
  if (boss) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W / 2 - 160, 66, 320, 10);
    g.fillStyle = '#ff5470'; g.fillRect(W / 2 - 160, 66, 320 * boss.userData.hp / boss.userData.max, 10); }
  // MINIMAPA (círculo arriba a la izquierda)
  const mr = 62, mcx = 24 + mr, mcy = 84 + mr, k = mr / (MAPA * 1.05);
  g.save();
  g.beginPath(); g.arc(mcx, mcy, mr, 0, 6.28); g.clip();
  g.fillStyle = 'rgba(10,12,20,.72)'; g.fillRect(mcx - mr, mcy - mr, mr * 2, mr * 2);
  // calles
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    g.beginPath(); g.moveTo(mcx + (i * BLOQUE - px) * k, mcy - mr); g.lineTo(mcx + (i * BLOQUE - px) * k, mcy + mr); g.stroke();
    g.beginPath(); g.moveTo(mcx - mr, mcy + (i * BLOQUE - pz) * k); g.lineTo(mcx + mr, mcy + (i * BLOQUE - pz) * k); g.stroke();
  }
  // enemigos / npcs / objetivo
  for (const e of enemies) { g.fillStyle = '#ff5470';
    g.fillRect(mcx + (e.position.x - px) * k - 1.5, mcy + (e.position.z - pz) * k - 1.5, 3, 3); }
  if (boss) { g.fillStyle = '#ff2244'; g.beginPath(); g.arc(mcx + (boss.position.x - px) * k, mcy + (boss.position.z - pz) * k, 4, 0, 6.28); g.fill(); }
  for (const n of npcs) { g.fillStyle = '#8cd9ff'; g.beginPath(); g.arc(mcx + (n.x - px) * k, mcy + (n.z - pz) * k, 3, 0, 6.28); g.fill(); }
  for (const c of crates) { g.fillStyle = '#ffd23f'; g.fillRect(mcx + (c.position.x - px) * k - 2, mcy + (c.position.z - pz) * k - 2, 4, 4); }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(mcx + (op.x - px) * k, mcy + (op.z - pz) * k, 4.5, 0, 6.28); g.fill();
  // jugador (flecha)
  g.translate(mcx, mcy); g.rotate(-pyaw + Math.PI);
  g.fillStyle = '#8cff66'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(mcx, mcy, mr, 0, 6.28); g.stroke();
  // joystick
  if (joy && joy.cx != null) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3;
    g.beginPath(); g.arc(joy.cx, joy.cy, 52, 0, 6.28); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(joy.cx + joy.x * 44, joy.cy + joy.y * 44, 20, 0, 6.28); g.fill(); }
  // botón HABLAR
  if (usarNPC && !dlg) { g.fillStyle = 'rgba(140,217,255,.85)';
    g.beginPath(); g.arc(W - 86, H - 96, 44, 0, 6.28); g.fill();
    g.fillStyle = '#06121c'; g.font = '900 15px system-ui'; g.textAlign = 'center'; g.fillText('HABLAR', W - 86, H - 91); }
  // pausa
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
  // DIÁLOGO
  if (dlg) {
    const [who, txt] = dlg.lines[dlg.i];
    g.fillStyle = 'rgba(6,10,18,.88)';
    g.fillRect(W / 2 - 300, H - 150, 600, 118);
    g.strokeStyle = 'rgba(140,217,255,.4)'; g.lineWidth = 2; g.strokeRect(W / 2 - 300, H - 150, 600, 118);
    g.fillStyle = '#8cd9ff'; g.font = '900 15px system-ui'; g.textAlign = 'left';
    g.fillText(who, W / 2 - 280, H - 126);
    g.fillStyle = '#eef4ff'; g.font = '600 14px system-ui';
    const lines = txt.split('\n');
    lines.forEach((l, i) => g.fillText(l, W / 2 - 280, H - 104 + i * 19));
    g.fillStyle = '#ffd23f'; g.font = '900 13px system-ui'; g.textAlign = 'right';
    g.fillText('TOCÁ PARA SEGUIR ▸', W / 2 + 280, H - 44);
  }
}

/* ---------------- menú vivo ---------------- */
let menuA = 0;
function attract3d(dt) { menuA += dt * .5;
  if (cam) { const r = POI ? POI.refugio : { x: 0, z: 0 };
    cam.position.set(r.x + Math.cos(menuA) * 10, 4 + Math.sin(menuA * .7) * 1.4, r.z + Math.sin(menuA) * 10);
    cam.lookAt(r.x, 1.4, r.z); }
  if (ch) ch.update(dt, 1);
  if (npcs) for (const n of npcs) n.ch.update(dt, 1); }

/* ---------------- input ---------------- */
function down(p) {
  if (dlg) { dlgNext(); ARC.sfx('tap', { vol: .4 }); return; }
  if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; }
  if (usarNPC && (p.x - (ARC.W - 86)) ** 2 + (p.y - (ARC.H - 96)) ** 2 < 50 * 50) {
    const n = usarNPC;
    const lines = n.nombre === 'DRA. VEGA' ? [VEGA_LINES[Math.min(n.li, VEGA_LINES.length - 1)]] : [RUSO_LINES[Math.min(n.li, RUSO_LINES.length - 1)]];
    n.li++; dlgShow(lines); return;
  }
  if (p.x < ARC.W * .55) joy = { cx: p.x, cy: p.y, x: 0, y: 0 };
}
function move(p) {
  if (joy && p.x < ARC.W * .72) { const dx = p.x - joy.cx, dy2 = p.y - joy.cy;
    const d = Math.hypot(dx, dy2), k2 = d > 52 ? 52 / d : 1;
    joy.x = dx * k2 / 52; joy.y = dy2 * k2 / 52; }
  else if (lastLX != null) camYaw -= (p.x - lastLX) * .008;
  lastLX = p.x;
}
function up() { joy = null; lastLX = null; }
function look(dx) { if (!joy) camYaw -= dx * .004; }
function key(code, dn) { keys[code] = dn;
  if (dn && dlg && (code === 'Space' || code === 'Enter')) dlgNext();
  if (dn && code === 'KeyE' && usarNPC && !dlg) down({ x: ARC.W - 86, y: ARC.H - 96 });
  if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'horda', name: 'HORDA', sub: 'distrito cero · campaña', acc: '#ff5470', three: true, sky: '#241826',
  music: null, art: null, sfx: {}, best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look, key,
  dbg: {
    state: () => ({ score, kills, hp: hp | 0, cap, dlg: !!dlg, enemies: enemies ? enemies.length : 0, dead, won, x: +px.toFixed(0), z: +pz.toFixed(0) }),
    tp(x, z) { px = x; pz = z; if (npcs && npcs[0].sigue) { npcs[0].x = x + 2; npcs[0].z = z + 2; } },
    def(t) { defT = t; }, vida() { hp = 100; },
    autoPlay() {
      if (dead || won) return;
      if (dlg) { dlgNext(); return; }
      // ir al objetivo actual; si hay enemigo muy cerca, kitear
      let tx, tz;
      const op = objetivoPos(); tx = op.x; tz = op.z;
      if (enemies.length) { let n = enemies[0], bd = 1e9;
        for (const e of enemies) { const d = (e.position.x - px) ** 2 + (e.position.z - pz) ** 2; if (d < bd) { bd = d; n = e; } }
        if (bd < 16) { tx = px + (px - n.position.x); tz = pz + (pz - n.position.z); } }
      const a = Math.atan2(tx - px, tz - pz), rel = a - camYaw;
      joy = { cx: 120, cy: ARC.H - 120, x: Math.sin(rel), y: Math.cos(rel) };
    }
  }
};
})();

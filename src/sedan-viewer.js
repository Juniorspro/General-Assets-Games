/* Visor de un SEDÁN ELÉCTRICO procedural (silueta fastback moderna).
   Carrocería generada por "loft": secciones transversales suaves interpoladas
   a lo largo del coche, como en diseño automotriz. THREE en scope. */

// =====================  curvas de diseño (side-view)  =====================
// Coordenadas: X = largo (frente +X), Y = alto, Z = ancho. Medidas ~reales (m).
function curve1D(pts) {            // catmull-rom 1D sobre [x, valor]
  return function (x) {
    const n = pts.length;
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0; while (i < n - 2 && x > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const t = (x - p1[0]) / (p2[0] - p1[0]);
    return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t * t + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t * t * t);
  };
}

const LEN_R = -2.48, LEN_F = 2.49;          // cola y nariz
// silueta superior: borde del maletero -> fastback -> techo -> parabrisas -> capó -> nariz
const roofY = curve1D([[-2.48, 0.90], [-2.30, 0.945], [-1.85, 1.05], [-1.45, 1.19], [-0.95, 1.35], [-0.40, 1.43], [0.10, 1.43], [0.45, 1.36], [0.80, 1.18], [1.10, 1.02], [1.60, 0.90], [2.05, 0.80], [2.35, 0.70], [2.49, 0.58]]);
// línea de cintura (hombro) — siempre por debajo de la silueta superior
const beltY = curve1D([[-2.48, 0.875], [-1.90, 0.85], [-0.80, 0.80], [0.40, 0.77], [1.30, 0.74], [2.00, 0.67], [2.49, 0.54]]);
// semiancho máximo (en la cintura)
const wBelt = curve1D([[-2.48, 0.68], [-2.10, 0.84], [-1.30, 0.94], [-0.40, 0.975], [0.40, 0.975], [1.10, 0.94], [1.80, 0.85], [2.25, 0.70], [2.49, 0.46]]);
// semiancho del techo / capó
const wRoof = curve1D([[-2.48, 0.54], [-1.80, 0.60], [-0.80, 0.645], [0.10, 0.64], [0.60, 0.60], [0.95, 0.62], [1.30, 0.72], [1.90, 0.70], [2.30, 0.56], [2.49, 0.36]]);
// línea inferior: parachoques que suben en nariz y cola
const floorYc = curve1D([[-2.48, 0.32], [-2.32, 0.21], [-2.05, 0.17], [2.05, 0.17], [2.30, 0.21], [2.49, 0.32]]);

// pasos de rueda (aberturas en el lateral)
const WHEELS = [{ cx: 1.45 }, { cx: -1.51 }];
const WHEEL_Y = 0.34, ARCH_SPAN = 0.46, ARCH_CAP = 0.695;
function archLip(x) {
  let lip = 0.22;
  for (const w of WHEELS) {
    const dx = x - w.cx;
    if (Math.abs(dx) < ARCH_SPAN) lip = Math.max(lip, Math.min(ARCH_CAP, WHEEL_Y + Math.sqrt(ARCH_SPAN * ARCH_SPAN - dx * dx) * 0.82));
  }
  return lip;
}

// =====================  loft de la carrocería  =====================
function sampleCR(pts, M) {                  // catmull-rom 2D (z,y) -> M muestras
  const out = [], n = pts.length;
  for (let m = 0; m < M; m++) {
    let t = m / (M - 1) * (n - 1); let i = Math.floor(t); if (i >= n - 1) i = n - 2; const f = t - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    out.push({ z: cr(p0.z, p1.z, p2.z, p3.z), y: cr(p0.y, p1.y, p2.y, p3.y) });
  }
  return out;
}

function profileAt(x) {                      // semi-perfil (z>=0), de abajo-centro a arriba-centro
  const rY = roofY(x), bY = beltY(x), wB = wBelt(x), wR = wRoof(x);
  const FLOOR_Y = floorYc(x);
  const lowY = Math.max(archLip(x), FLOOR_Y + 0.04);
  const cp = [
    { z: 0, y: FLOOR_Y },
    { z: wB * 0.70, y: FLOOR_Y },
    { z: wB * 0.92, y: lowY },
    { z: wB, y: Math.max(bY - 0.14, lowY + 0.05) },
    { z: wB * 0.97, y: bY },
    { z: wB * 0.88, y: bY + (rY - bY) * 0.22 },
    { z: wR * 1.00, y: bY + (rY - bY) * 0.55 },
    { z: wR * 0.96, y: bY + (rY - bY) * 0.85 },
    { z: wR * 0.80, y: rY },
    { z: 0, y: rY },
  ];
  return sampleCR(cp, 26);
}

function buildBodyGeometry() {
  const ST = 96, M = 26, RING = 2 * M - 2;   // estaciones x anillo completo
  const pos = [];
  for (let s = 0; s < ST; s++) {
    const x = LEN_R + (LEN_F - LEN_R) * s / (ST - 1);
    const half = profileAt(x);
    const ring = [];
    for (let j = 0; j < M; j++) ring.push([half[j].z, half[j].y]);          // lado +z
    for (let j = M - 2; j >= 1; j--) ring.push([-half[j].z, half[j].y]);    // espejo -z
    for (const [z, y] of ring) pos.push(x, y, z);
  }
  // tapas (centroides nariz/cola)
  const rearC = pos.length / 3; { let ay = 0; for (let j = 0; j < RING; j++) ay += pos[(0 * RING + j) * 3 + 1]; pos.push(LEN_R - 0.012, ay / RING, 0); }
  const frontC = pos.length / 3; { let ay = 0; for (let j = 0; j < RING; j++) ay += pos[((ST - 1) * RING + j) * 3 + 1]; pos.push(LEN_F + 0.012, ay / RING, 0); }

  // clasificación de material por cara
  function matOf(cx, cy) {
    const bY = beltY(cx), rY = roofY(cx);
    if (cx > -1.78 && cx < 0.95 && cy > bY + 0.12 && (rY - bY) > 0.22) return 1;  // cristal (canopy)
    if (cy < 0.245) return 2;                                                     // bajos
    if (cx > 2.40 && cy < 0.42) return 2;                                         // toma frontal pequeña
    if (cx < -2.38 && cy < 0.42) return 2;                                        // difusor
    return 0;                                                                     // pintura
  }
  const buckets = [[], [], []];
  const vx = i => pos[i * 3], vy = i => pos[i * 3 + 1];
  function quad(a, b, c, d) {
    const cx = (vx(a) + vx(b) + vx(c) + vx(d)) / 4, cy = (vy(a) + vy(b) + vy(c) + vy(d)) / 4;
    const k = matOf(cx, cy); buckets[k].push(a, c, b, a, d, c);
  }
  for (let s = 0; s < ST - 1; s++) for (let j = 0; j < RING; j++) {
    const j2 = (j + 1) % RING;
    quad(s * RING + j, s * RING + j2, (s + 1) * RING + j2, (s + 1) * RING + j);
  }
  function fan(center, s, flip) {
    for (let j = 0; j < RING; j++) {
      const a = s * RING + j, b = s * RING + (j + 1) % RING;
      const cx = (vx(a) + vx(b) + vx(center)) / 3, cy = (vy(a) + vy(b) + vy(center)) / 3;
      const k = matOf(cx, cy);
      if (flip) buckets[k].push(center, b, a); else buckets[k].push(center, a, b);
    }
  }
  fan(rearC, 0, false); fan(frontC, ST - 1, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const index = [...buckets[0], ...buckets[1], ...buckets[2]];
  geo.setIndex(index);
  let off = 0;
  for (let k = 0; k < 3; k++) { geo.addGroup(off, buckets[k].length, k); off += buckets[k].length; }
  geo.computeVertexNormals();
  // colores por vértice (para el degradado rojo->gris de la referencia)
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3));
  return geo;
}

function setBodyTint(geo, mode, mat) {
  const posA = geo.attributes.position, colA = geo.attributes.color;
  const silver = new THREE.Color(0xb9bdc2), red = new THREE.Color(0xb01212), c = new THREE.Color();
  for (let i = 0; i < posA.count; i++) {
    if (mode === 'gradiente') {
      let t = THREE.MathUtils.clamp((posA.getX(i) - 0.1) / 2.1, 0, 1); t = t * t * (3 - 2 * t);
      c.copy(silver).lerp(red, t);
    } else c.set(0xffffff);
    colA.setXYZ(i, c.r, c.g, c.b);
  }
  colA.needsUpdate = true;
  const solid = { rojo: 0xb01212, plata: 0xb9bdc2, negro: 0x16181c, blanco: 0xe8eaec };
  mat.color.set(mode === 'gradiente' ? 0xffffff : solid[mode] ?? 0xffffff);
}

// =====================  materiales  =====================
const paintMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.7, roughness: 0.30, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.2, side: THREE.DoubleSide });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x10171c, metalness: 0.1, roughness: 0.05, clearcoat: 1.0, envMapIntensity: 1.6, side: THREE.DoubleSide });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.18, metalness: 1.0 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.35, metalness: 0.9 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.95, metalness: 0 });

// =====================  ruedas  =====================
function buildWheel() {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.058, 16, 40), tireMat);
  tire.scale.z = 2.1; tire.castShadow = true; g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.07, 28), darkMetal);
  rim.rotation.x = Math.PI / 2; rim.position.z = 0.045; rim.castShadow = true; g.add(rim);
  for (let k = 0; k < 7; k++) {                       // radios tipo turbina
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.20, 0.035), darkMetal);
    const a = k / 7 * Math.PI * 2;
    sp.position.set(Math.sin(a) * 0.115, Math.cos(a) * 0.115, 0.085);
    sp.rotation.z = -a + 0.22; g.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), chromeMat);
  hub.rotation.x = Math.PI / 2; hub.position.z = 0.105; g.add(hub);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 24), chromeMat);
  disc.rotation.x = Math.PI / 2; disc.position.z = -0.02; g.add(disc);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.05), new THREE.MeshStandardMaterial({ color: 0xb01212, roughness: 0.4 }));
  cal.position.set(0.13, 0.05, -0.02); g.add(cal);
  return g;
}

// =====================  ensamblar el coche  =====================
function buildCar() {
  const car = new THREE.Group();
  const bodyGeo = buildBodyGeometry();
  const body = new THREE.Mesh(bodyGeo, [paintMat, glassMat, trimMat]);
  body.castShadow = true; body.receiveShadow = true; car.add(body);

  // malla técnica (como la imagen de referencia)
  const wire = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: 0x202428, wireframe: true, transparent: true, opacity: 0.16, depthTest: true }));
  wire.scale.setScalar(1.0008); car.add(wire);

  // ruedas + fondos oscuros de los pasos de rueda
  for (const w of WHEELS) for (const sz of [1, -1]) {
    const wh = buildWheel();
    wh.position.set(w.cx, WHEEL_Y, sz * 0.78);
    if (sz < 0) wh.rotation.y = Math.PI;
    car.add(wh);
    const well = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    well.position.set(w.cx, WHEEL_Y + 0.04, sz * 0.60); well.rotation.y = sz > 0 ? 0 : Math.PI;
    car.add(well);
  }

  const add = (geo, mat, x, y, z, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz; m.castShadow = true; car.add(m); return m; };

  // faros finos envolventes en la esquina de la nariz
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xf5f8ff, emissive: 0xdfe8ff, emissiveIntensity: 1.1, roughness: 0.2 });
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.32, 0.045, 0.09), lampMat, 2.27, 0.625, s * 0.50, -s * 0.62, -0.06);
  // piloto trasero: barra completa bajo el borde del maletero
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x550d10, emissive: 0xd31a20, emissiveIntensity: 1.0, roughness: 0.3 });
  add(new THREE.BoxGeometry(0.04, 0.05, 1.24), tailMat, -2.45, 0.855, 0);
  for (const s of [1, -1]) add(new THREE.BoxGeometry(0.18, 0.05, 0.05), tailMat, -2.39, 0.855, s * 0.655, s * 0.78);
  // espejos sobre tallo
  for (const s of [1, -1]) {
    add(new THREE.BoxGeometry(0.05, 0.025, 0.13), trimMat, 0.74, 0.90, s * 0.90, 0, 0);
    add(new THREE.BoxGeometry(0.15, 0.085, 0.055), trimMat, 0.72, 0.935, s * 0.99, -s * 0.15, 0);
  }
  // manijas al ras, justo bajo la cintura
  for (const s of [1, -1]) { add(new THREE.BoxGeometry(0.18, 0.026, 0.013), chromeMat, 0.42, 0.715, s * 0.945); add(new THREE.BoxGeometry(0.18, 0.026, 0.013), chromeMat, -0.72, 0.745, s * 0.945); }
  // matrícula trasera
  add(new THREE.BoxGeometry(0.02, 0.14, 0.46), new THREE.MeshStandardMaterial({ color: 0xdadde0, roughness: 0.6 }), -2.45, 0.58, 0);

  return { car, bodyGeo, wire };
}

// =====================  escena estudio (fondo blanco)  =====================
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 200);

// IBL de estudio: domo claro + "softboxes" para reflejos alargados en la pintura
try {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(12, 24, 12), new THREE.MeshBasicMaterial({ color: 0xcfd3d7, side: THREE.BackSide })));
  const sb = (w, h, x, y, z, ry, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.material.color.multiplyScalar(i); m.position.set(x, y, z); m.rotation.set(-Math.PI / 2 * (y > 4 ? 1 : 0), ry, 0); es.add(m); };
  sb(8, 3, 0, 6, 0, 0, 5);            // softbox cenital
  sb(2.5, 6, 6, 2.5, 0, -Math.PI / 2, 3);
  sb(2.5, 6, -6, 2.5, 0, Math.PI / 2, 3);
  scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
} catch (e) { console.warn('PMREM', e); }

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc0, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4.5, 7, 3.5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5; sc.near = 1; sc.far = 30; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
scene.add(key);
const fill = new THREE.DirectionalLight(0xeef2f8, 0.7); fill.position.set(-5, 3, -4); scene.add(fill);

// suelo blanco con sombra suave
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const { car, bodyGeo, wire } = buildCar();
scene.add(car);
setBodyTint(bodyGeo, 'gradiente', paintMat);

// =====================  órbita + UI  =====================
let az = 0.95, el = 0.20, rad = 8.6; const target = new THREE.Vector3(0, 0.62, 0);
let dragging = false, lx = 0, ly = 0, auto = true, lastT = 0;
function applyCam() { camera.position.set(target.x + rad * Math.cos(el) * Math.sin(az), target.y + rad * Math.sin(el), target.z + rad * Math.cos(el) * Math.cos(az)); camera.lookAt(target); }
canvas.addEventListener('pointerdown', e => { dragging = true; auto = false; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (!dragging) return; az -= (e.clientX - lx) * 0.008; el = Math.max(0.03, Math.min(1.35, el + (e.clientY - ly) * 0.006)); lx = e.clientX; ly = e.clientY; });
canvas.addEventListener('wheel', e => { rad = Math.max(4, Math.min(20, rad + e.deltaY * 0.01)); e.preventDefault(); }, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

document.querySelectorAll('[data-tint]').forEach(b => b.addEventListener('click', () => {
  setBodyTint(bodyGeo, b.dataset.tint, paintMat);
  document.querySelectorAll('[data-tint]').forEach(x => x.classList.toggle('sel', x === b));
}));
document.getElementById('wire').addEventListener('click', () => { wire.visible = !wire.visible; document.getElementById('wire').classList.toggle('sel', wire.visible); });
document.getElementById('reset').addEventListener('click', () => { az = 0.95; el = 0.20; rad = 8.6; auto = true; });

renderer.setAnimationLoop((t) => { const dt = (t - lastT) / 1000; lastT = t; if (auto) az += dt * 0.22; applyCam(); renderer.render(scene, camera); });
document.getElementById('loading').style.display = 'none';

window.__pause = () => renderer.setAnimationLoop(null);
window.__setView = (a, e2, r2) => { az = a; el = e2; if (r2) rad = r2; auto = false; };

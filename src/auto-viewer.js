/* Visor que carga el pack de autos del repo (GLB incrustado), lo DIVIDE en
   autos individuales y los muestra uno a uno. THREE, GLTFLoader, GLB en scope. */

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 500);

const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color(0x2f4a66) }, mid: { value: new THREE.Color(0x4a5a6a) }, bot: { value: new THREE.Color(0x20242a) } },
  vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform vec3 top,mid,bot; varying vec3 vP; void main(){float h=normalize(vP).y; vec3 c=mix(bot,mid,smoothstep(-0.3,0.2,h)); c=mix(c,top,smoothstep(0.1,0.8,h)); gl_FragColor=vec4(c,1.0);}' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), skyMat));
try { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const sm = skyMat.clone(); sm.uniforms.top.value = new THREE.Color(0x9fc0e0); sm.uniforms.mid.value = new THREE.Color(0xb8c6d0); sm.uniforms.bot.value = new THREE.Color(0x88909a); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), sm)); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose(); } catch (e) {}

scene.add(new THREE.AmbientLight(0xbfc8d0, 0.5));
scene.add(new THREE.HemisphereLight(0xaecdf0, 0x40443f, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 9, 5); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 60; key.shadow.bias = -0.0004; scene.add(key);
const fill = new THREE.DirectionalLight(0x9fb6d0, 0.7); fill.position.set(-6, 4, -4); scene.add(fill);

// plataforma giratoria
const disc = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.4 }));
disc.position.y = -0.15; disc.receiveShadow = true; scene.add(disc);
const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.06, 8, 64), new THREE.MeshStandardMaterial({ color: 0xd9b04a, metalness: 1, roughness: 0.3 }));
ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; scene.add(ring);

// ---- cargar y dividir el pack ----
const gltfLoader = new GLTFLoader();
function b64buf(b64) { const bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

const pivot = new THREE.Group(); scene.add(pivot);
let cars = [], idx = 0, current = null;
const box = new THREE.Box3(), size = new THREE.Vector3(), center = new THREE.Vector3();

// clona una malla "horneando" su transform mundial (para preservar el montaje)
function bakeClone(mesh) {
  mesh.updateWorldMatrix(true, false);
  const c = mesh.clone();
  c.matrixAutoUpdate = false; c.matrix.copy(mesh.matrixWorld);
  c.castShadow = true; c.receiveShadow = true;
  if (c.material) { const mats = Array.isArray(c.material) ? c.material : [c.material]; mats.forEach(m => { if (m && m.transparent && m.opacity === 1) m.transparent = false; }); }
  return c;
}

function showCar(i) {
  if (!cars.length) return;
  idx = (i + cars.length) % cars.length;
  if (current) pivot.remove(current);
  const grp = new THREE.Group();
  for (const m of cars[idx].meshes) grp.add(bakeClone(m));
  pivot.add(grp); grp.updateMatrixWorld(true);
  box.setFromObject(grp); box.getSize(size); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1, s = 4.2 / maxDim;
  grp.scale.setScalar(s); grp.updateMatrixWorld(true);
  box.setFromObject(grp); box.getCenter(center); box.getSize(size);
  grp.position.set(-center.x, -box.min.y, -center.z); grp.updateMatrixWorld(true);
  current = grp;
  target.set(0, size.y * 0.5, 0); rad = Math.max(6, maxDim * s * 1.6);
  document.getElementById('name').textContent = cars[idx].label;
  document.getElementById('count').textContent = (idx + 1) + ' / ' + cars.length;
}

const TYPES = ['COMPACT', 'COUPE', 'HATCHBACK', 'MINIVAN', 'OFFROAD', 'PICKUP', 'SEDAN', 'SPORT', 'SUV', 'WAGON'];
gltfLoader.parse(b64buf(GLB.pack), '', (gltf) => {
  const root = gltf.scene; root.updateWorldMatrix(true, true);
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  const typeOf = (name) => { const up = (name || '').toUpperCase(); return TYPES.find(t => up.startsWith(t)) || null; };
  const map = new Map(); const leftover = []; const wp = new THREE.Vector3();
  for (const m of meshes) {
    const t = typeOf(m.name); m.getWorldPosition(wp);
    if (t) { if (!map.has(t)) map.set(t, { meshes: [], c: new THREE.Vector3(), n: 0 }); const e = map.get(t); e.meshes.push(m); e.c.add(wp); e.n++; }
    else leftover.push({ m, p: wp.clone() });
  }
  for (const e of map.values()) e.c.multiplyScalar(1 / e.n);
  // asignar ruedas/piezas sueltas al auto más cercano (en XZ)
  for (const { m, p } of leftover) { let best = null, bd = Infinity; for (const e of map.values()) { const d = (e.c.x - p.x) ** 2 + (e.c.z - p.z) ** 2; if (d < bd) { bd = d; best = e; } } if (best) best.meshes.push(m); }
  cars = [...map.entries()].map(([k, e]) => ({ label: k, meshes: e.meshes }));
  if (!cars.length) { meshes.forEach((m, i) => cars.push({ label: 'PIEZA ' + (i + 1), meshes: [m] })); }
  document.getElementById('loading').style.display = 'none';
  showCar(0);
}, (err) => { document.getElementById('loading').textContent = 'Error al cargar el pack'; console.error(err); });

// ---- órbita ----
let az = 0.8, el = 0.28, rad = 9, target = new THREE.Vector3(0, 1, 0), dragging = false, lx = 0, ly = 0, auto = true, lastT = 0;
function applyCam() { camera.position.set(target.x + rad * Math.cos(el) * Math.sin(az), target.y + rad * Math.sin(el), target.z + rad * Math.cos(el) * Math.cos(az)); camera.lookAt(target); }
canvas.addEventListener('pointerdown', e => { dragging = true; auto = false; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (!dragging) return; az -= (e.clientX - lx) * 0.008; el = Math.max(0.02, Math.min(1.4, el + (e.clientY - ly) * 0.006)); lx = e.clientX; ly = e.clientY; });
canvas.addEventListener('wheel', e => { rad = Math.max(4, Math.min(30, rad + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
document.getElementById('prev').addEventListener('click', () => { showCar(idx - 1); });
document.getElementById('next').addEventListener('click', () => { showCar(idx + 1); });
document.getElementById('auto').addEventListener('click', () => { auto = !auto; });

renderer.setAnimationLoop((t) => { const dt = (t - lastT) / 1000; lastT = t; if (auto) az += dt * 0.4; applyCam(); renderer.render(scene, camera); });
window.__pause = () => renderer.setAnimationLoop(null);
window.__info = () => ({ count: cars.length, names: cars.map(c => c.label) });
window.__show = (i) => showCar(i);

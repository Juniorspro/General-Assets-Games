/* Visor de una CASA DE CAMPO procedural (decorativa, no se accede).
   Asume THREE en scope (inyectado por el build). Órbita con ratón/táctil. */

// ---------- texturas procedurales ----------
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tx(c, rep = 1, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t; }
function noise(x, y, s) { const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453; return n - Math.floor(n); }

function sidingTex() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#b9c2bd'; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) {
    const y = row * 16, base = 188 + Math.floor(noise(row, 1, 3) * 30);
    x.fillStyle = `rgb(${base - 20},${base - 12},${base - 22})`; x.fillRect(0, y, 256, 16);
    x.fillStyle = `rgba(${base},${base + 4},${base - 4},1)`; x.fillRect(0, y, 256, 13);
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y + 14, 256, 2);   // sombra del solape
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(0,0,0,${noise(i, row, 7) * 0.08})`; x.fillRect((noise(i, row, 2) * 256) | 0, y + (noise(i, row, 5) * 14 | 0), 2, 1); }
  }
  return tx(c, 2);
}
function shingleTex() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#3a4348'; x.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 18; row++) {
    const y = row * 14, off = (row % 2) * 14;
    for (let col = -1; col < 10; col++) {
      const px = col * 28 + off, g = 46 + Math.floor(noise(col, row, 9) * 40);
      x.fillStyle = `rgb(${g - 8},${g},${g + 6})`; x.fillRect(px, y, 26, 14);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, y + 12, 26, 2); x.fillRect(px - 1, y, 1, 14);
    }
  }
  return tx(c, 3);
}
function stoneTex() {
  const c = cnv(256, 256), x = c.getContext('2d');
  x.fillStyle = '#7d7a72'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const sx = noise(i, 1, 2) * 256, sy = noise(i, 2, 4) * 256, w = 18 + noise(i, 3, 6) * 26, h = 12 + noise(i, 4, 8) * 16, g = 96 + Math.floor(noise(i, 5, 3) * 50);
    x.fillStyle = `rgb(${g},${g - 6},${g - 14})`; x.beginPath(); x.ellipse(sx, sy, w / 2, h / 2, 0, 0, 6.28); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2; x.stroke();
  }
  return tx(c, 3);
}

// ---------- la casa ----------
function buildHouse() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: sidingTex(), roughness: 0.85, metalness: 0 });
  const roofMat = new THREE.MeshStandardMaterial({ map: shingleTex(), roughness: 0.9, metalness: 0 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 1, metalness: 0 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xece7da, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.8 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5e3b27, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x223038, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.4 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.95 });
  const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  const W = 9, H = 5.2, D = 7;
  add(new THREE.BoxGeometry(W + 0.6, 0.8, D + 0.6), stoneMat, 0, 0.4, 0);     // cimientos de piedra
  add(new THREE.BoxGeometry(W, H, D), wallMat, 0, 0.8 + H / 2, 0);            // cuerpo
  // esquinas con trim
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.25, H, 0.25), trimMat, sx * W / 2, 0.8 + H / 2, sz * D / 2);

  // tejado a dos aguas (sólido, sin huecos)
  const rh = 3.0, ov = 0.5, slab = Math.hypot(W / 2 + ov, rh), ang = Math.atan2(rh, W / 2 + ov);
  for (const s of [1, -1]) { const r = add(new THREE.BoxGeometry(slab, 0.24, D + ov * 2), roofMat, s * (W / 2 + ov) / 2, 0.8 + H + rh / 2, 0); r.rotation.z = -s * ang; }
  add(new THREE.BoxGeometry(0.34, 0.2, D + ov * 2), roofMat, 0, 0.8 + H + rh + 0.02, 0); // cumbrera
  // frontones SÓLIDOS (prisma triangular) — ya no se ven huecos
  const gShape = new THREE.Shape(); gShape.moveTo(-W / 2, 0); gShape.lineTo(W / 2, 0); gShape.lineTo(0, rh); gShape.lineTo(-W / 2, 0);
  const gGeo = new THREE.ExtrudeGeometry(gShape, { depth: 0.3, bevelEnabled: false });
  for (const sz of [1, -1]) add(gGeo, wallMat, 0, 0.8 + H, sz * D / 2 - (sz > 0 ? 0 : 0.3));
  // chimenea de ladrillo
  add(new THREE.BoxGeometry(1.0, 3.2, 1.0), brickMat, -W / 2 + 1.4, 0.8 + H + 1.0, -1.2);
  add(new THREE.BoxGeometry(1.2, 0.3, 1.2), stoneMat, -W / 2 + 1.4, 0.8 + H + 2.7, -1.2);

  // porche frontal
  const pz = D / 2 + 1.4;
  add(new THREE.BoxGeometry(W, 0.25, 2.8), woodMat, 0, 0.85, D / 2 + 1.3);    // tarima
  for (const px of [-W / 2 + 0.5, -1.5, 1.5, W / 2 - 0.5]) add(new THREE.CylinderGeometry(0.13, 0.13, 2.7, 10), trimMat, px, 2.3, pz + 1.0);
  add(new THREE.BoxGeometry(W + 0.4, 0.22, 3.4), roofMat, 0, 3.75, D / 2 + 1.4);  // techo del porche
  // barandillas
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.7, 2.6), woodMat, side * (W / 2 - 0.4), 1.4, pz + 0.1);

  // puerta + escalones
  add(new THREE.BoxGeometry(1.3, 2.5, 0.18), doorMat, 0, 0.8 + 1.25, D / 2 + 0.02);
  add(new THREE.BoxGeometry(1.6, 2.8, 0.08), trimMat, 0, 0.8 + 1.4, D / 2 - 0.02);
  add(new THREE.BoxGeometry(0.18, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.3 }), 0.45, 1.85, D / 2 + 0.13);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.8, 0.2, 0.4 + i * 0.3), stoneMat, 0, 0.7 - i * 0.18, D / 2 + 0.5 + i * 0.28);

  // ventanas con marco + cruz + cristal (frontal y laterales)
  function window(x, y, z, ry) {
    const fw = 1.3, fh = 1.5;
    add(new THREE.BoxGeometry(fw + 0.2, fh + 0.2, 0.12), trimMat, x, y, z, ry);
    const gl = add(new THREE.BoxGeometry(fw, fh, 0.06), glassMat, x, y, z + (Math.abs(ry) < 0.01 ? 0.06 : 0), ry);
    if (Math.abs(ry) > 0.01) gl.position.set(x + (z > 0 ? 0 : 0), y, z), gl.position.x += Math.sign(x) * 0.06;
    add(new THREE.BoxGeometry(0.06, fh, 0.08), trimMat, x, y, z + 0.04, ry);
    add(new THREE.BoxGeometry(fw, 0.06, 0.08), trimMat, x, y, z + 0.04, ry);
    add(new THREE.BoxGeometry(fw + 0.2, 0.12, 0.2), woodMat, x, y - fh / 2 - 0.1, z + 0.04, ry); // alféizar
  }
  window(-2.6, 2.7, D / 2 + 0.02, 0); window(2.6, 2.7, D / 2 + 0.02, 0);
  window(-2.6, 5.0, D / 2 + 0.02, 0); window(2.6, 5.0, D / 2 + 0.02, 0);
  for (const yy of [2.7, 5.0]) { window(W / 2 + 0.02, yy, 1.6, Math.PI / 2); window(W / 2 + 0.02, yy, -1.6, Math.PI / 2); window(-W / 2 - 0.02, yy, 1.6, Math.PI / 2); window(-W / 2 - 0.02, yy, -1.6, Math.PI / 2); }

  return g;
}

// ---------- escena / viewer ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);

// cielo de día (gradiente) + IBL
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color(0x3d77c2) }, mid: { value: new THREE.Color(0x9fc0e0) }, bot: { value: new THREE.Color(0xdfe3df) } },
  vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform vec3 top,mid,bot; varying vec3 vP; void main(){float h=normalize(vP).y; vec3 c=mix(bot,mid,smoothstep(-0.05,0.32,h)); c=mix(c,top,smoothstep(0.25,0.85,h)); gl_FragColor=vec4(c,1.0);}' });
scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
try { const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), skyMat.clone())); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose(); } catch (e) {}
scene.fog = new THREE.FogExp2(0xc7d2d8, 0.004);

scene.add(new THREE.AmbientLight(0xbfd0e0, 0.5));
scene.add(new THREE.HemisphereLight(0xaecdf0, 0x6b6048, 0.85));
const sunDir = new THREE.Vector3(0.5, 0.6, 0.4).normalize();
const sun = new THREE.DirectionalLight(0xfff3da, 2.6); sun.position.copy(sunDir.clone().multiplyScalar(40)); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 120; sun.shadow.bias = -0.0004;
scene.add(sun); scene.add(sun.target);

// suelo de césped
const groundMat = new THREE.MeshStandardMaterial({ color: 0x5d6e3a, roughness: 1 });
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// rayos de sol (flare aditivo)
const flareC = cnv(128, 128); { const x = flareC.getContext('2d'); const gd = x.createRadialGradient(64, 64, 0, 64, 64, 64); gd.addColorStop(0, 'rgba(255,250,235,0.9)'); gd.addColorStop(.3, 'rgba(255,240,210,0.4)'); gd.addColorStop(1, 'rgba(255,230,180,0)'); x.fillStyle = gd; x.fillRect(0, 0, 128, 128); }
const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(flareC), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
flare.scale.setScalar(40); flare.position.copy(sunDir.clone().multiplyScalar(120)); scene.add(flare);

const house = buildHouse(); scene.add(house);

// órbita simple (ratón + táctil) con autorrotación
let az = 0.7, el = 0.32, rad = 18, target = new THREE.Vector3(0, 3, 0), dragging = false, lx = 0, ly = 0, auto = true, lastT = 0;
function applyCam() { camera.position.set(target.x + rad * Math.cos(el) * Math.sin(az), target.y + rad * Math.sin(el), target.z + rad * Math.cos(el) * Math.cos(az)); camera.lookAt(target); }
canvas.addEventListener('pointerdown', e => { dragging = true; auto = false; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => { if (!dragging) return; az -= (e.clientX - lx) * 0.008; el = Math.max(0.05, Math.min(1.3, el + (e.clientY - ly) * 0.006)); lx = e.clientX; ly = e.clientY; });
canvas.addEventListener('wheel', e => { rad = Math.max(8, Math.min(40, rad + e.deltaY * 0.02)); e.preventDefault(); }, { passive: false });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
document.getElementById('reset').addEventListener('click', () => { az = 0.7; el = 0.32; rad = 18; auto = true; });

renderer.setAnimationLoop((t) => {
  const dt = (t - lastT) / 1000; lastT = t;
  if (auto) az += dt * 0.18;
  applyCam();
  renderer.render(scene, camera);
});
document.getElementById('loading').style.display = 'none';
window.__pause = () => renderer.setAnimationLoop(null);
window.__renderOnce = () => { applyCam(); renderer.render(scene, camera); };
window.__setView = (a, e2) => { az = a; el = e2; auto = false; };

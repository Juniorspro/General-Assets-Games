/* ============================================================================
 *  NIEBLA DEL MAÍZ — single-file CON MODELOS GLB PS1 REALES incrustados.
 *  Asume en scope (inyectados por el build): THREE, GLTFLoader, clone
 *  (SkeletonUtils), mergeGeometries (BufferGeometryUtils) y GLB (base64).
 * ==========================================================================*/

const windUniform = { value: 0 };

// ---------------------------------------------------------------------------
//  TEXTURAS PBR procedurales (canvas)
// ---------------------------------------------------------------------------
const _texCache = new Map();
function txCanvas(s) { const c = document.createElement('canvas'); c.width = c.height = s; return c; }
function txRand(x, y, s) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function txSmooth(t) { return t * t * (3 - 2 * t); }
function txVN(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const w = a => ((a % period) + period) % period;
  const v00 = txRand(w(xi), w(yi), seed), v10 = txRand(w(xi + 1), w(yi), seed);
  const v01 = txRand(w(xi), w(yi + 1), seed), v11 = txRand(w(xi + 1), w(yi + 1), seed);
  const u = txSmooth(xf), v = txSmooth(yf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(v00, v10, u), THREE.MathUtils.lerp(v01, v11, u), v);
}
function txFbm(x, y, oct, base, seed) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * txVN(x * f, y * f, base * f, seed + o * 13); norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
function txNormal(h, size, strength) {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
    const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
    const len = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    out[i] = (dx / len * 0.5 + 0.5) * 255; out[i + 1] = (dy / len * 0.5 + 0.5) * 255;
    out[i + 2] = (1 / len * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}
function txTex(c, { srgb = false, repeat = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = aniso; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}
function groundTextures(size = 1024) {
  if (_texCache.has('ground')) return _texCache.get('ground');
  const col = txCanvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size), img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * 6, v = y / size * 6;
    const dirt = txFbm(u * 0.6, v * 0.6, 4, 4, 7), fine = txFbm(u * 9, v * 9, 5, 32, 19), clump = txFbm(u * 2.5, v * 2.5, 4, 16, 3);
    let r, g, b;
    if (dirt > 0.56) { const d = 0.55 + fine * 0.5; r = 92 * d; g = 66 * d; b = 44 * d; }
    else { const dry = clump * 0.6 + fine * 0.4; r = 58 + dry * 55; g = 66 + dry * 60; b = 34 + dry * 22; if (txFbm(u * 4, v * 4, 3, 16, 41) > 0.66) { r += 26; g += 14; b -= 6; } }
    const i = (y * size + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    heights[y * size + x] = fine * 0.6 + clump * 0.4;
  }
  cctx.putImageData(img, 0, 0);
  const nrm = txCanvas(size); nrm.getContext('2d').putImageData(new ImageData(txNormal(heights, size, 2.2), size, size), 0, 0);
  const out = { map: txTex(col, { srgb: true, repeat: 26 }), normalMap: txTex(nrm, { repeat: 26 }) };
  _texCache.set('ground', out); return out;
}
function roadTextures(size = 512) {
  if (_texCache.has('road')) return _texCache.get('road');
  const col = txCanvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size), img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, grain = txFbm(u * 18, v * 18, 5, 64, 2), cracks = txFbm(u * 6, v * 30, 4, 32, 8);
    const rut = Math.min(Math.abs(u - 0.32), Math.abs(u - 0.68)), rm = THREE.MathUtils.smoothstep(0.08, 0.0, rut);
    let d = 0.5 + grain * 0.55 - rm * 0.22, r = 96 * d, g = 74 * d, b = 52 * d; r -= rm * 18; g -= rm * 10;
    const i = (y * size + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    heights[y * size + x] = grain * 0.7 - rm * 0.5 + cracks * 0.2;
  }
  cctx.putImageData(img, 0, 0);
  const nrm = txCanvas(size); nrm.getContext('2d').putImageData(new ImageData(txNormal(heights, size, 3.0), size, size), 0, 0);
  const out = { map: txTex(col, { srgb: true, repeat: 1 }), normalMap: txTex(nrm, { repeat: 1 }) };
  _texCache.set('road', out); return out;
}
function barkTextures(size = 512) {
  if (_texCache.has('bark')) return _texCache.get('bark');
  const col = txCanvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size), img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const ridge = Math.abs(Math.sin((u * 14 + txFbm(u * 4, v * 2, 3, 16, 5) * 3) * Math.PI));
    const grain = txFbm(u * 10, v * 40, 5, 64, 11);
    let d = 0.4 + ridge * 0.4 + grain * 0.35, r = 74 * d, g = 56 * d, b = 40 * d;
    const moss = (1 - ridge) * txFbm(u * 5, v * 5, 3, 32, 22); r -= moss * 20; g += moss * 16; b -= moss * 10;
    const i = (y * size + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    heights[y * size + x] = ridge * 0.7 + grain * 0.4;
  }
  cctx.putImageData(img, 0, 0);
  const nrm = txCanvas(size); nrm.getContext('2d').putImageData(new ImageData(txNormal(heights, size, 3.4), size, size), 0, 0);
  const out = { map: txTex(col, { srgb: true, repeat: 1 }), normalMap: txTex(nrm, { repeat: 1 }) };
  _texCache.set('bark', out); return out;
}
function leafTexture(size = 256) {
  if (_texCache.has('leaf')) return _texCache.get('leaf');
  const c = txCanvas(size), ctx = c.getContext('2d'); ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  for (let n = 0; n < 150; n++) {
    const a = Math.random() * Math.PI * 2, rad = Math.pow(Math.random(), 0.6) * size * 0.46;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    const len = 10 + Math.random() * 18, wid = 4 + Math.random() * 6, rot = a + (Math.random() - 0.5);
    const sh = 0.45 + Math.random() * 0.55;
    const g = Math.floor((90 + Math.random() * 90) * sh), r = Math.floor((40 + Math.random() * 50) * sh), b = Math.floor((22 + Math.random() * 30) * sh);
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath(); ctx.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${r + 20},${g + 25},${b + 10},0.6)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(0, len); ctx.stroke(); ctx.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _texCache.set('leaf', t); return t;
}
function cornTexture(w = 128, h = 512) {
  if (_texCache.has('corn')) return _texCache.get('corn');
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h); const cx = w / 2;
  const grad = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
  grad.addColorStop(0, '#5b6b27'); grad.addColorStop(.5, '#869c3a'); grad.addColorStop(1, '#4d5b22');
  ctx.fillStyle = grad; ctx.fillRect(cx - 5, 0, 10, h);
  for (let i = 0; i < 14; i++) {
    const y = h * 0.12 + Math.random() * h * 0.8, side = Math.random() > 0.5 ? 1 : -1;
    const len = 30 + Math.random() * 55, droop = 20 + Math.random() * 50, sh = 0.6 + Math.random() * 0.5;
    ctx.fillStyle = `rgb(${Math.floor(96 * sh)},${Math.floor(120 * sh)},${Math.floor(48 * sh)})`;
    ctx.beginPath(); ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + side * len * 0.6, y - 4, cx + side * len, y + droop);
    ctx.quadraticCurveTo(cx + side * len * 0.6, y + 6, cx, y + 8); ctx.fill();
  }
  ctx.strokeStyle = '#c9b76a'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(cx, h * 0.1); ctx.lineTo(cx + (Math.random() - 0.5) * 30, Math.random() * h * 0.09); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _texCache.set('corn', t); return t;
}
function plankTextures(size = 512) {
  if (_texCache.has('plank')) return _texCache.get('plank');
  const col = txCanvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size), img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, plank = Math.floor(v * 6);
    const seam = Math.abs((v * 6) % 1) < 0.04 || Math.abs((v * 6) % 1 - 1) < 0.04;
    const grain = txFbm(u * 30, v * 6 + plank * 3, 5, 64, plank * 7 + 1);
    let d = 0.4 + grain * 0.5, r = 96 * d, g = 72 * d, b = 48 * d;
    if (seam) { r *= 0.4; g *= 0.4; b *= 0.4; }
    const i = (y * size + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    heights[y * size + x] = grain * 0.6 - (seam ? 0.6 : 0);
  }
  cctx.putImageData(img, 0, 0);
  const nrm = txCanvas(size); nrm.getContext('2d').putImageData(new ImageData(txNormal(heights, size, 2.6), size, size), 0, 0);
  const out = { map: txTex(col, { srgb: true, repeat: 1 }), normalMap: txTex(nrm, { repeat: 1 }) };
  _texCache.set('plank', out); return out;
}

// ---------------------------------------------------------------------------
//  WORLDGEN
// ---------------------------------------------------------------------------
function wgHash(x, y, s) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 57.13) * 43758.5453; return n - Math.floor(n); }
function wgSmooth(t) { return t * t * (3 - 2 * t); }
function wgVN(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = wgHash(xi, yi, s), b = wgHash(xi + 1, yi, s), c = wgHash(xi, yi + 1, s), d = wgHash(xi + 1, yi + 1, s);
  const u = wgSmooth(xf), v = wgSmooth(yf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}
function wgFbm(x, y, oct, s) { let amp = 1, f = 1, sum = 0, norm = 0; for (let o = 0; o < oct; o++) { sum += amp * wgVN(x * f, y * f, s + o); norm += amp; amp *= 0.5; f *= 2; } return sum / norm; }
class WorldGen {
  constructor(seed = 1337, half = 240) { this.seed = seed; this.half = half; this.roadWidth = 6.0; this.roadShoulder = 11.0; this._buildRoad(); }
  baseHeight(x, z) {
    const big = wgFbm(x * 0.0035 + 10, z * 0.0035 - 5, 4, this.seed) - 0.5;
    const mid = wgFbm(x * 0.015, z * 0.015, 4, this.seed + 20) - 0.5;
    const fine = wgFbm(x * 0.08, z * 0.08, 3, this.seed + 40) - 0.5;
    return big * 14 + mid * 3.2 + fine * 0.6;
  }
  _buildRoad() {
    const pts = [], step = 2.0;
    for (let z = -this.half - 20; z <= this.half + 20; z += step) pts.push(new THREE.Vector2(Math.sin(z * 0.012) * 38 + Math.sin(z * 0.045 + 1.3) * 10, z));
    this.road = pts; this.roadZ0 = pts[0].y; this.roadStep = step;
    const h = new Float32Array(pts.length); for (let i = 0; i < pts.length; i++) h[i] = this.baseHeight(pts[i].x, pts[i].y);
    const sm = new Float32Array(pts.length), R = 6;
    for (let i = 0; i < pts.length; i++) { let acc = 0, c = 0; for (let k = -R; k <= R; k++) { const j = i + k; if (j >= 0 && j < pts.length) { acc += h[j]; c++; } } sm[i] = acc / c; }
    this.roadH = sm;
  }
  roadInfo(x, z) {
    const fi = (z - this.roadZ0) / this.roadStep, i0 = Math.max(0, Math.min(this.road.length - 1, Math.round(fi)));
    let best = Infinity, bi = i0, bx = 0;
    for (let i = Math.max(0, i0 - 3); i <= Math.min(this.road.length - 1, i0 + 3); i++) { const p = this.road[i], d = (p.x - x) * (p.x - x) + (p.y - z) * (p.y - z); if (d < best) { best = d; bi = i; bx = p.x; } }
    return { dist: Math.sqrt(best), index: bi, centerX: bx, height: this.roadH[bi] };
  }
  getHeight(x, z) {
    const base = this.baseHeight(x, z), r = this.roadInfo(x, z);
    if (r.dist > this.roadShoulder) return base;
    const t = THREE.MathUtils.smoothstep(r.dist, this.roadWidth * 0.5, this.roadShoulder);
    return THREE.MathUtils.lerp(r.height - 0.15, base, t);
  }
  onRoad(x, z, margin = 0) { return this.roadInfo(x, z).dist < this.roadWidth * 0.5 + margin; }
}

// ---------------------------------------------------------------------------
//  TERRENO + CARRETERA
// ---------------------------------------------------------------------------
function buildTerrain(world) {
  const size = world.half * 2, seg = Math.floor(size / 1.6);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, world.getHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const t = groundTextures();
  const mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.97, metalness: 0, color: 0x8a8a82 });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; return mesh;
}
function buildRoad(world) {
  const pts = world.road, half = world.roadWidth * 0.5 + 0.4;
  const positions = [], uvs = []; let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    const dir = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize(), perp = new THREE.Vector2(-dir.y, dir.x);
    if (i > 0) dist += Math.hypot(p.x - prev.x, p.y - prev.y);
    const lx = p.x + perp.x * half, lz = p.y + perp.y * half, rx = p.x - perp.x * half, rz = p.y - perp.y * half;
    positions.push(lx, world.getHeight(lx, lz) + 0.06, lz, rx, world.getHeight(rx, rz) + 0.06, rz);
    const v = dist / 8; uvs.push(0, v, 1, v);
  }
  const indices = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  const t = roadTextures();
  const mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; return mesh;
}

// ---------------------------------------------------------------------------
//  ÁRBOLES procedurales
// ---------------------------------------------------------------------------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
function segment(p0, p1, r0, r1) {
  const dir = new THREE.Vector3().subVectors(p1, p0); const len = dir.length(); if (len < 0.001) return null; dir.normalize();
  const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
  _q.setFromUnitVectors(_up, dir); geo.applyQuaternion(_q);
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5); geo.translate(mid.x, mid.y, mid.z); return geo;
}
function leafCard(center, size, r) {
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(r() * Math.PI); g.rotateY(r() * Math.PI); g.rotateZ(r() * Math.PI);
  g.translate(center.x + (r() - 0.5) * size * 0.5, center.y + (r() - 0.5) * size * 0.5, center.z + (r() - 0.5) * size * 0.5); return g;
}
function buildPrototype(seed) {
  const r = rng(seed), bark = [], leaf = [], leafSize = 2.0 + r() * 1.2;
  function grow(start, dir, length, radius, depth) {
    const segs = depth >= 3 ? 4 : 2; let p = start.clone(), d = dir.clone().normalize(); const segLen = length / segs;
    for (let i = 0; i < segs; i++) {
      d.y -= 0.06 * (4 - depth); d.x += (r() - 0.5) * 0.12; d.z += (r() - 0.5) * 0.12; d.normalize();
      const next = p.clone().addScaledVector(d, segLen);
      const g = segment(p, next, radius * (1 - i / segs * 0.4), radius * (1 - (i + 1) / segs * 0.4)); if (g) bark.push(g); p = next;
    }
    if (depth <= 0) { const n = 5 + Math.floor(r() * 5); for (let i = 0; i < n; i++) leaf.push(leafCard(p, leafSize * (0.7 + r() * 0.6), r)); return; }
    const kids = depth >= 3 ? 3 : (2 + Math.floor(r() * 2));
    for (let i = 0; i < kids; i++) {
      const axis = new THREE.Vector3(r() - 0.5, r() * 0.4, r() - 0.5).normalize(); const ang = 0.5 + r() * 0.7;
      const nd = d.clone().applyAxisAngle(axis, ang); nd.y = Math.max(nd.y, 0.1); nd.normalize();
      grow(p.clone(), nd, length * (0.62 + r() * 0.18), radius * 0.6, depth - 1);
    }
    if (depth <= 2) { const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) leaf.push(leafCard(p, leafSize * 0.8, r)); }
  }
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2), 7 + r() * 5, 0.5 + r() * 0.35, 4);
  return { bark: mergeGeometries(bark), leaf: mergeGeometries(leaf) };
}
function makeLeafMaterial() {
  const mat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, color: 0x6a7a4a, vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = windUniform;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float wph = instanceMatrix[3][0] + instanceMatrix[3][2];
        float sway = sin(uWind*1.3+wph*0.5)*0.18 + sin(uWind*2.7+wph)*0.07;
        transformed.x += sway*0.35; transformed.z += cos(uWind+wph)*0.12;`);
  };
  return mat;
}
function buildTrees(world, placements) {
  const group = new THREE.Group();
  const bt = barkTextures();
  const barkMat = new THREE.MeshStandardMaterial({ map: bt.map, normalMap: bt.normalMap, roughness: 0.95, metalness: 0, color: 0x8a8278 });
  const leafMat = makeLeafMaterial();
  const protoCount = 4, protos = [];
  for (let i = 0; i < protoCount; i++) protos.push(buildPrototype(91 + i * 777));
  const buckets = Array.from({ length: protoCount }, () => []);
  for (const p of placements) buckets[p.proto % protoCount].push(p);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  buckets.forEach((list, pi) => {
    if (!list.length) return; const proto = protos[pi];
    const barkInst = new THREE.InstancedMesh(proto.bark, barkMat, list.length);
    const leafInst = new THREE.InstancedMesh(proto.leaf, leafMat, list.length);
    barkInst.castShadow = true; barkInst.receiveShadow = true; leafInst.castShadow = false;
    leafInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set((Math.random() - 0.5) * 0.06, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.06);
      dummy.scale.setScalar(p.scale); dummy.updateMatrix();
      barkInst.setMatrixAt(i, dummy.matrix); leafInst.setMatrixAt(i, dummy.matrix);
      const dead = Math.random(); col.setHSL(0.18 + dead * 0.07, 0.35 + Math.random() * 0.25, 0.28 + Math.random() * 0.15); leafInst.setColorAt(i, col);
    });
    barkInst.instanceMatrix.needsUpdate = true; leafInst.instanceMatrix.needsUpdate = true; group.add(barkInst, leafInst);
  });
  return group;
}

// ---------------------------------------------------------------------------
//  MAIZALES
// ---------------------------------------------------------------------------
function buildCornField(world, fields, spacing = 1.0) {
  const a = new THREE.PlaneGeometry(1.5, 2.6); a.translate(0, 1.3, 0); const b = a.clone(); b.rotateY(Math.PI / 2);
  const geo = mergeGeometries([a, b]);
  const mat = new THREE.MeshStandardMaterial({ map: cornTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = windUniform;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3][0]*0.3 + instanceMatrix[3][2]*0.3;
        float h01 = clamp(position.y/2.6,0.0,1.0);
        float gust = sin(uWind*1.1+ph)*0.5 + sin(uWind*2.3+ph*1.7)*0.25;
        transformed.x += gust*h01*h01*0.55; transformed.z += cos(uWind*0.9+ph)*h01*h01*0.35;`);
  };
  const instances = [];
  for (const f of fields) {
    const cos = Math.cos(f.rot), sin = Math.sin(f.rot);
    for (let lx = -f.w / 2; lx <= f.w / 2; lx += spacing) for (let lz = -f.d / 2; lz <= f.d / 2; lz += spacing * 1.4) {
      const jx = lx + (Math.random() - 0.5) * spacing * 0.5, jz = lz + (Math.random() - 0.5) * spacing * 0.4;
      const wx = f.cx + jx * cos - jz * sin, wz = f.cz + jx * sin + jz * cos;
      if (world.onRoad(wx, wz, 2.5)) continue; instances.push({ x: wx, z: wz });
    }
  }
  const mesh = new THREE.InstancedMesh(geo, mat, instances.length); mesh.castShadow = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(instances.length * 3), 3);
  const d = new THREE.Object3D(), col = new THREE.Color();
  instances.forEach((p, i) => {
    d.position.set(p.x, world.getHeight(p.x, p.z) - 0.05, p.z);
    d.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
    d.scale.set(0.9 + Math.random() * 0.4, 0.85 + Math.random() * 0.5, 0.9 + Math.random() * 0.4); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix); col.setHSL(0.18 + Math.random() * 0.06, 0.4, 0.32 + Math.random() * 0.18); mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true; return mesh;
}

// ---------------------------------------------------------------------------
//  CERCAS
// ---------------------------------------------------------------------------
function buildFences(world, lines, opts = {}) {
  const spacing = opts.spacing ?? 2.4, postH = opts.postH ?? 1.3, group = new THREE.Group();
  const t = plankTextures();
  const mat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.95, metalness: 0, color: 0x9a8f7e });
  const posts = [], rails = [];
  for (const line of lines) for (let s = 0; s < line.length - 1; s++) {
    const a = line[s], b = line[s + 1], segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.round(segLen / spacing)), angle = Math.atan2(b.z - a.z, b.x - a.x);
    for (let i = 0; i <= n; i++) { if (s > 0 && i === 0) continue; const tt = i / n; const x = THREE.MathUtils.lerp(a.x, b.x, tt), z = THREE.MathUtils.lerp(a.z, b.z, tt); posts.push({ x, z, y: world.getHeight(x, z) }); }
    rails.push({ len: segLen, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: (world.getHeight(a.x, a.z) + world.getHeight(b.x, b.z)) / 2, angle });
  }
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, postH, 0.14), mat, posts.length);
  postMesh.castShadow = true; postMesh.receiveShadow = true; const d = new THREE.Object3D();
  posts.forEach((p, i) => { d.position.set(p.x, p.y + postH / 2 - 0.1, p.z); d.rotation.set((Math.random() - 0.5) * 0.05, Math.random(), (Math.random() - 0.5) * 0.06); d.scale.set(1, 0.9 + Math.random() * 0.2, 1); d.updateMatrix(); postMesh.setMatrixAt(i, d.matrix); });
  postMesh.instanceMatrix.needsUpdate = true; group.add(postMesh);
  const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 0.05), mat, rails.length * 2); railMesh.castShadow = true; let ri = 0;
  for (const r of rails) for (const hy of [postH * 0.32, postH * 0.72]) { d.position.set(r.x, r.y + hy - 0.1 + (Math.random() - 0.5) * 0.04, r.z); d.rotation.set(0, -r.angle, (Math.random() - 0.5) * 0.02); d.scale.set(r.len, 1, 1); d.updateMatrix(); railMesh.setMatrixAt(ri++, d.matrix); }
  railMesh.instanceMatrix.needsUpdate = true; group.add(railMesh); return group;
}

// ---------------------------------------------------------------------------
//  POSTES DE LUZ + CABLES
// ---------------------------------------------------------------------------
const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.9, metalness: 0.05 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.7 });
const cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.8, metalness: 0.1 });
function catenary(p0, p1, sag, segs = 14) {
  const pts = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push(new THREE.Vector3(THREE.MathUtils.lerp(p0.x, p1.x, t), THREE.MathUtils.lerp(p0.y, p1.y, t) - Math.sin(t * Math.PI) * sag, THREE.MathUtils.lerp(p0.z, p1.z, t))); }
  return new THREE.CatmullRomCurve3(pts);
}
function buildLightPoles(world) {
  const group = new THREE.Group(), lamps = [], cableGeos = [], poleH = 6.2, poleTops = [], spacing = 30;
  for (let z = -world.half + 14, i = 0; z < world.half - 14; z += spacing, i++) {
    const cx = world.roadInfo(0, z).centerX, side = i % 2 === 0 ? 1 : -1;
    const px = cx + side * (world.roadWidth / 2 + 2.6), gy = world.getHeight(px, z);
    const pole = new THREE.Group(); pole.position.set(px, gy, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, poleH, 7), poleMat); trunk.position.y = poleH / 2; trunk.castShadow = true; trunk.rotation.z = (Math.random() - 0.5) * 0.04; pole.add(trunk);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), poleMat); arm.position.set(-side * 1.0, poleH - 0.5, 0); arm.castShadow = true; pole.add(arm);
    const lampX = -side * 2.0;
    const fixture = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 8, 1, true), metalMat); fixture.position.set(lampX, poleH - 0.7, 0); fixture.rotation.x = Math.PI; pole.add(fixture);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd28a, emissiveIntensity: 2 })); bulb.position.set(lampX, poleH - 0.9, 0); pole.add(bulb);
    const light = new THREE.PointLight(0xffd49a, 6, 26, 2); light.position.copy(bulb.position); pole.add(light);
    lamps.push({ light, bulb, base: 6, worldPos: new THREE.Vector3(px + lampX, gy + poleH - 0.9, z) }); group.add(pole);
    poleTops.push({ cableTop: new THREE.Vector3(px, gy + poleH - 0.15, z), armTip: new THREE.Vector3(px - side * 2.4, gy + poleH - 0.5, z) });
  }
  for (let i = 0; i < poleTops.length - 1; i++) {
    const a = poleTops[i], b = poleTops[i + 1];
    const pairs = [[a.cableTop, b.cableTop, 1.6], [a.armTip, b.armTip, 1.9], [a.cableTop.clone().add(new THREE.Vector3(0, -0.5, 0)), b.cableTop.clone().add(new THREE.Vector3(0, -0.5, 0)), 2.4]];
    for (const [p0, p1, sag] of pairs) cableGeos.push(new THREE.TubeGeometry(catenary(p0, p1, sag), 14, 0.035, 4, false));
    if (Math.random() < 0.18) { const drop = a.cableTop.clone(), end = drop.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, -(poleH - 0.5), (Math.random() - 0.5) * 4)); cableGeos.push(new THREE.TubeGeometry(catenary(drop, end, 0.6, 8), 8, 0.03, 4, false)); }
  }
  if (cableGeos.length) group.add(new THREE.Mesh(mergeGeometries(cableGeos), cableMat));
  return { group, lamps };
}

// ---------------------------------------------------------------------------
//  CARGA DE MODELOS GLB (incrustados en base64)
// ---------------------------------------------------------------------------
const gltfLoader = new GLTFLoader();
function b64ToArrayBuffer(b64) { const bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function parseGLB(b64) { return new Promise((res) => { try { gltfLoader.parse(b64ToArrayBuffer(b64), '', g => res(g), e => { console.warn('GLB parse fail', e); res(null); }); } catch (e) { console.warn(e); res(null); } }); }
function ps1ify(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { if (!m) continue; if (m.map) { m.map.magFilter = THREE.NearestFilter; m.map.minFilter = THREE.NearestMipmapNearestFilter; m.map.anisotropy = 1; m.map.needsUpdate = true; } if (m.metalness === undefined) m.metalness = 0; m.side = THREE.DoubleSide; }
    }
  });
}
async function loadAllGLB(onItem) {
  const out = {}; const keys = Object.keys(GLB);
  for (const k of keys) { const g = GLB[k] ? await parseGLB(GLB[k]) : null; if (g) ps1ify(g.scene); out[k] = g; onItem && onItem(); }
  return out;
}
function makeInstance(gltf, { targetH = null, scale = null, skinned = false } = {}) {
  if (!gltf) return null;
  const obj = skinned ? clone(gltf.scene) : gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(obj); const size = new THREE.Vector3(); box.getSize(size);
  let s = scale ?? 1; if (targetH) s = targetH / (size.y || 1);
  obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj); obj.position.y -= box2.min.y;
  const wrap = new THREE.Group(); wrap.add(obj); wrap.userData.animations = gltf.animations || []; wrap.userData.inner = obj; return wrap;
}

// procedural fallbacks (por si algún GLB faltara) ---------------------------
function makeWatcherFallback(v = 0) {
  const g = new THREE.Group(); const skin = new THREE.MeshStandardMaterial({ color: 0x9aa090, roughness: 1, flatShading: true });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2a3530, roughness: 1, flatShading: true });
  for (const s of [1, -1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.85, 0.2), shirt); leg.position.set(s * 0.12, 0.42, 0); g.add(leg); }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.27), shirt); torso.position.set(0, 1.22, 0.03); torso.rotation.x = 0.12; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.24), skin); head.position.set(0, 1.72, 0.05); g.add(head); return g;
}

// ---------------------------------------------------------------------------
//  ENSAMBLAR EL MUNDO (con modelos GLB)
// ---------------------------------------------------------------------------
function buildWorld(scene, world, assets) {
  const obstacles = [], npcs = [];
  scene.add(buildTerrain(world)); scene.add(buildRoad(world));

  const fields = [
    { cx: 70, cz: -60, w: 90, d: 130, rot: 0.05 }, { cx: -78, cz: 40, w: 100, d: 150, rot: -0.04 },
    { cx: 95, cz: 120, w: 80, d: 110, rot: 0.0 }, { cx: -60, cz: -150, w: 80, d: 120, rot: 0.08 },
  ];
  const inCorn = (x, z) => fields.some(f => { const c = Math.cos(-f.rot), s = Math.sin(-f.rot); const lx = (x - f.cx) * c - (z - f.cz) * s, lz = (x - f.cx) * s + (z - f.cz) * c; return Math.abs(lx) < f.w / 2 + 2 && Math.abs(lz) < f.d / 2 + 2; });
  scene.add(buildCornField(world, fields, 1.1));

  const placements = [];
  const pushTree = (x, z, proto, scale) => { if (world.onRoad(x, z, 5) || inCorn(x, z)) return; placements.push({ x, y: world.getHeight(x, z), z, proto, scale }); obstacles.push({ x, z, r: 0.7 }); };
  for (let gi = 0; gi < 14; gi++) { const gx = (Math.random() - 0.5) * world.half * 1.8, gz = (Math.random() - 0.5) * world.half * 1.8, n = 5 + Math.floor(Math.random() * 9); for (let i = 0; i < n; i++) pushTree(gx + (Math.random() - 0.5) * 26, gz + (Math.random() - 0.5) * 26, Math.floor(Math.random() * 4), 0.8 + Math.random() * 0.9); }
  for (let z = -world.half + 20; z < world.half - 20; z += 16) { const cx = world.roadInfo(0, z).centerX; for (const side of [1, -1]) { if (Math.random() < 0.35) continue; pushTree(cx + side * (world.roadWidth / 2 + 7 + Math.random() * 3), z + (Math.random() - 0.5) * 6, Math.floor(Math.random() * 4), 0.9 + Math.random() * 0.6); } }
  scene.add(buildTrees(world, placements));

  const roadFenceL = [], roadFenceR = [];
  for (let i = 0; i < world.road.length; i += 2) { const p = world.road[i], prev = world.road[Math.max(0, i - 1)]; const dir = new THREE.Vector2(p.x - prev.x, p.y - prev.y).normalize(), perp = new THREE.Vector2(-dir.y, dir.x), off = world.roadWidth / 2 + 1.4; roadFenceL.push({ x: p.x + perp.x * off, z: p.y + perp.y * off }); roadFenceR.push({ x: p.x - perp.x * off, z: p.y - perp.y * off }); }
  const fieldFences = fields.map(f => { const c = Math.cos(f.rot), s = Math.sin(f.rot); return [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => { const lx = sx * f.w / 2, lz = sz * f.d / 2; return { x: f.cx + lx * c - lz * s, z: f.cz + lx * s + lz * c }; }); });
  scene.add(buildFences(world, [roadFenceL, roadFenceR, ...fieldFences]));

  const poles = buildLightPoles(world); scene.add(poles.group);
  for (const lamp of poles.lamps) obstacles.push({ x: lamp.worldPos.x, z: lamp.worldPos.z, r: 0.5 });

  const onSide = (z, side, dist) => { const cx = world.roadInfo(0, z).centerX; return { x: cx + side * dist, z }; };
  function add(obj, x, z, ry = 0, r = 0) { if (!obj) return null; obj.position.set(x, world.getHeight(x, z), z); obj.rotation.y = ry; scene.add(obj); if (r > 0) obstacles.push({ x, z, r }); return obj; }

  // ---- casas GLB ----
  const housePlaces = [[-30, 1, 24, -Math.PI / 2 + 0.2, 'japanHouse', 7], [90, -1, 22, Math.PI / 2, 'ozoneHouse', 6], [170, 1, 26, -Math.PI / 2 - 0.3, 'ozoneHouse', 6], [-150, -1, 28, Math.PI / 3, 'japanHouse', 7], [40, 1, 30, -1.2, 'ozoneHouse', 6]];
  housePlaces.forEach(([z, side, dist, ry, key, h]) => { const sp = onSide(z, side, dist); const inst = makeInstance(assets[key], { targetH: h }); if (inst) add(inst, sp.x, sp.z, ry, 5); });

  // luces cálidas en un par de casas (ventanas encendidas inquietantes)
  for (const [z, side, dist] of [[-30, 1, 24], [90, -1, 22]]) { const sp = onSide(z, side, dist); const pl = new THREE.PointLight(0xffb347, 3.2, 15, 2); pl.position.set(sp.x, world.getHeight(sp.x, sp.z) + 2.2, sp.z); scene.add(pl); }

  // ---- vehículos GLB (coche oxidado + camión) ----
  const wreck = onSide(8, 0, 0.5); add(makeInstance(assets.rustyCar, { targetH: 1.6 }), wreck.x, wreck.z, 0.4, 2.4);
  const truck = onSide(-34, 1, 14); add(makeInstance(assets.truck, { targetH: 2.6 }), truck.x, truck.z, 1.2, 2.6);
  const wreck2 = onSide(120, -1, 4); add(makeInstance(assets.rustyCar, { targetH: 1.6 }), wreck2.x, wreck2.z, 2.1, 2.4);

  // ---- set-dressing clérigo/lápidas ----
  { const sp = onSide(-30, 1, 32); add(makeInstance(assets.clergy, { targetH: 3 }), sp.x, sp.z, 0.6); }

  // ---- pinos de fondo (GLB) ----
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2, rr = world.half * (0.72 + Math.random() * 0.22), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.abs(x) > world.half - 6 || Math.abs(z) > world.half - 6) continue;
    add(makeInstance(assets.pines, { targetH: 12 + Math.random() * 6 }), x, z, Math.random() * 6.28);
  }

  // ---- los que miran (personajes GLB PS1) ----
  const spots = [onSide(40, 1, 9), onSide(-80, -1, 11), onSide(130, 1, 8), onSide(-140, 1, 12), onSide(60, -1, 16), onSide(200, -1, 10), onSide(-20, -1, 7)];
  spots.forEach((sp, i) => {
    const key = i % 2 === 0 ? 'highSchool' : 'rigged';
    let w = makeInstance(assets[key], { targetH: 1.8, skinned: true }) || makeWatcherFallback(i);
    w.position.set(sp.x, world.getHeight(sp.x, sp.z), sp.z); scene.add(w);
    let mixer = null; const clips = w.userData && w.userData.animations;
    if (clips && clips.length) { mixer = new THREE.AnimationMixer(w.userData.inner); mixer.clipAction(clips[0]).play(); }
    npcs.push({ obj: w, mixer, turnSpeed: 0.25 + Math.random() * 0.5 }); obstacles.push({ x: sp.x, z: sp.z, r: 0.5 });
  });

  return {
    lamps: poles.lamps, obstacles, npcs,
    update(dt, p) {
      for (const n of npcs) {
        if (n.mixer) n.mixer.update(dt);
        const dx = p.x - n.obj.position.x, dz = p.z - n.obj.position.z, target = Math.atan2(dx, dz);
        let cur = n.obj.rotation.y, diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI; n.obj.rotation.y = cur + diff * Math.min(1, dt * n.turnSpeed);
      }
    },
  };
}

// ---------------------------------------------------------------------------
//  CIELO / LUZ
// ---------------------------------------------------------------------------
function glowSprite(color, size) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, color); g.addColorStop(0.3, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s;
}
function buildSky(scene, world, renderer) {
  // ---- DÍA: cielo azul con neblina atmosférica (look AAA) ----
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x3d77c2) },   // azul cenital
      mid: { value: new THREE.Color(0x9fc0e0) },   // azul medio
      bot: { value: new THREE.Color(0xdfe3df) },   // neblina del horizonte
      sunDir: { value: new THREE.Vector3(0.45, 0.5, -0.72).normalize() },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform vec3 top,mid,bot,sunDir; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(bot, mid, smoothstep(-0.05,0.32,h));
        c = mix(c, top, smoothstep(0.25,0.85,h));
        float sun = pow(max(dot(d, normalize(sunDir)),0.0), 220.0);
        float glow = pow(max(dot(d, normalize(sunDir)),0.0), 6.0);
        c += vec3(1.0,0.95,0.82) * sun * 2.0;
        c += vec3(1.0,0.9,0.7) * glow * 0.25;
        gl_FragColor = vec4(c,1.0);
      }`,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(world.half * 2.2, 32, 16), skyMat);
  scene.add(skyMesh);

  const sunDir = new THREE.Vector3(0.45, 0.5, -0.72).normalize();

  // iluminación basada en imagen del propio cielo (PBR AAA)
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12), skyMat.clone()));
    const envTex = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
  } catch (e) { console.warn('PMREM no disponible', e); }

  scene.fog = new THREE.FogExp2(0xc7d2d8, 0.0055);   // neblina diurna a distancia

  scene.add(new THREE.AmbientLight(0xbfd0e0, 0.55));
  scene.add(new THREE.HemisphereLight(0xaecdf0, 0x6b6048, 0.9));

  const sun = new THREE.DirectionalLight(0xfff3da, 2.6);
  sun.position.copy(sunDir.clone().multiplyScalar(90));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const dd = 75, sc = sun.shadow.camera; sc.left = -dd; sc.right = dd; sc.top = dd; sc.bottom = -dd; sc.near = 1; sc.far = 280; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);

  return { moonLight: sun, update(p) { sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sunDir, 90); } };
}

// ---------------------------------------------------------------------------
//  JUGADOR
// ---------------------------------------------------------------------------
class Player {
  constructor(camera, world, dom) {
    this.camera = camera; this.world = world; this.dom = dom; this.eye = 1.7;
    this.yaw = 0; this.pitch = 0; this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.locked = false; this.keys = {}; this.bobPhase = 0; this.battery = 1; this.flashOn = false; this.obstacles = [];
    this.joy = { x: 0, y: 0, active: false };
    this.flash = new THREE.SpotLight(0xfff0d8, 24, 50, Math.PI / 5.5, 0.5, 1.3);
    this.flash.position.set(0.15, -0.12, 0.2); this.flashTarget = new THREE.Object3D(); this.flashTarget.position.set(0, -0.05, -1);
    camera.add(this.flash); camera.add(this.flashTarget); this.flash.target = this.flashTarget;
    addEventListener('keydown', e => { this.keys[e.code] = true; if (e.code === 'KeyF') this.toggleFlash(); });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', e => { if (!this.locked) return; this.yaw -= e.movementX * 0.0022; this.pitch -= e.movementY * 0.0022; this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch)); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.dom; });
  }
  spawn(x, z, yaw = 0) { this.pos.set(x, this.world.getHeight(x, z), z); this.yaw = yaw; }
  requestLock() { this.dom.requestPointerLock(); }
  toggleFlash() { if (this.battery <= 0) return; this.flashOn = !this.flashOn; if (this.onFlashToggle) this.onFlashToggle(); }
  _collide() { for (const o of this.obstacles) { const dx = this.pos.x - o.x, dz = this.pos.z - o.z, d = Math.hypot(dx, dz); if (d < o.r && d > 1e-4) { const push = o.r - d; this.pos.x += dx / d * push; this.pos.z += dz / d * push; } } }
  update(dt) {
    const k = this.keys;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let fx = 0, fz = 0;
    if (k['KeyW']) { fx -= sin; fz -= cos; } if (k['KeyS']) { fx += sin; fz += cos; }
    if (k['KeyA']) { fx -= cos; fz += sin; } if (k['KeyD']) { fx += cos; fz -= sin; }
    let joyMag = 0;
    if (this.joy.active) {
      const mf = -this.joy.y, st = this.joy.x; joyMag = Math.hypot(this.joy.x, this.joy.y);
      fx += (-sin) * mf + (cos) * st; fz += (-cos) * mf + (-sin) * st;
    }
    const sprint = k['ShiftLeft'] || k['ShiftRight'] || joyMag > 0.82, speed = sprint ? 6.2 : 3.0;
    const len = Math.hypot(fx, fz), moving = len > 0.01; if (moving) { fx /= len; fz /= len; }
    this.vel.x += (fx * speed - this.vel.x) * Math.min(1, dt * 10); this.vel.z += (fz * speed - this.vel.z) * Math.min(1, dt * 10);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const lim = this.world.half - 4; this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x)); this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));
    this._collide(); this.pos.y = this.world.getHeight(this.pos.x, this.pos.z);
    let bob = 0;
    if (moving) { this.bobPhase += dt * (sprint ? 13 : 9); bob = Math.sin(this.bobPhase) * (sprint ? 0.085 : 0.05); this.camera.position.set(this.pos.x + Math.cos(this.bobPhase) * 0.02, this.pos.y + this.eye + bob, this.pos.z); }
    else { this.bobPhase = 0; this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z); }
    this.camera.rotation.order = 'YXZ'; this.camera.rotation.y = this.yaw; this.camera.rotation.x = this.pitch;
    if (this.flashOn && this.battery > 0) {
      this.battery = Math.max(0, this.battery - dt * 0.006);
      const flicker = 0.85 + Math.random() * 0.15 + (this.battery < 0.2 ? (Math.random() - 0.5) * 0.6 : 0);
      this.flash.intensity = 24 * flicker * (0.45 + this.battery * 0.55); if (this.battery <= 0) this.flashOn = false;
    } else this.flash.intensity = 0;
    return { moving, sprint };
  }
}

// ---------------------------------------------------------------------------
//  AUDIO
// ---------------------------------------------------------------------------
class AudioFX {
  constructor() { this.ctx = null; this.started = false; }
  start() {
    if (this.started) return; this.started = true;
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    this.ctx = new Ctx(); const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.6; this.master.connect(ctx.destination);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < data.length; i++) { const white = Math.random() * 2 - 1; last = (last + 0.02 * white) / 1.02; data[i] = last * 3; }
    this.noiseBuf = buf;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 480;
    const windGain = ctx.createGain(); windGain.gain.value = 0.12; noise.connect(lp); lp.connect(windGain); windGain.connect(this.master); noise.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06; const lg = ctx.createGain(); lg.gain.value = 0.09; lfo.connect(lg); lg.connect(windGain.gain); lfo.start();
    const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 42; const dg = ctx.createGain(); dg.gain.value = 0.05; drone.connect(dg); dg.connect(this.master); drone.start();
  }
  _burst(dur, freq, q, gain) {
    if (!this.ctx) return; const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.6 + Math.random() * 0.4;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(); src.stop(ctx.currentTime + dur);
  }
  footstep(sprint) { this._burst(sprint ? 0.16 : 0.22, 180 + Math.random() * 80, 1.2, sprint ? 0.35 : 0.22); }
  click() { this._burst(0.04, 2200, 3, 0.25); }
}

// ---------------------------------------------------------------------------
//  ARRANQUE + BUCLE
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const world = new WorldGen(20260612, 240);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, world.half * 3); scene.add(camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const audio = new AudioFX();
let game = null;
const loadBar = document.getElementById('load-bar'), loadPct = document.getElementById('load-pct');

async function boot() {
  loadBar.style.width = '15%'; loadPct.textContent = 'Levantando el cielo…';
  const sky = buildSky(scene, world, renderer);
  loadPct.textContent = 'Cargando modelos PS1…';
  const total = Object.keys(GLB).length; let done = 0;
  const assets = await loadAllGLB(() => { done++; loadBar.style.width = (15 + done / total * 55).toFixed(0) + '%'; });
  loadPct.textContent = 'Sembrando los maizales…'; await new Promise(r => setTimeout(r, 30));
  const built = buildWorld(scene, world, assets);
  loadBar.style.width = '95%';
  const player = new Player(camera, world, canvas); player.obstacles = built.obstacles;
  player.spawn(world.roadInfo(0, -4).centerX, -4, Math.PI); player.onFlashToggle = () => audio.click();
  game = { sky, built, player };
  loadBar.style.width = '100%';
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
  renderer.setAnimationLoop(tick);
}
window.__pause = () => renderer.setAnimationLoop(null);

const subtitle = document.getElementById('subtitle');
function say(text, dur = 5000) { subtitle.textContent = text; subtitle.style.opacity = '1'; clearTimeout(say._t); say._t = setTimeout(() => subtitle.style.opacity = '0', dur); }
const introLines = ['El motor murió a plena luz del día. Y aun así… no se oye nada.', 'Maíz hasta el horizonte. Los postes cuelgan de cables muertos.', 'Hay alguien junto a la cerca. Quieto. Mirándote.', 'Sal del camino si te atreves. Busca una salida.'];
let introIdx = 0, introStarted = false;
function showIntro() { if (!game) return; if (introIdx < introLines.length) { say(introLines[introIdx++]); setTimeout(showIntro, 6000); } }

// ---- pantalla completa + bloqueo a horizontal (móvil) ----
async function goFullscreenLandscape() {
  const el = document.documentElement;
  try { if (el.requestFullscreen) await el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (e) {}
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) {}
}
function updateRotateHint() {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  const playing = !document.getElementById('hud').classList.contains('hidden');
  const r = document.getElementById('rotate');
  if (r) r.classList.toggle('hidden', !(portrait && playing));
}
window.addEventListener('orientationchange', () => setTimeout(updateRotateHint, 200));
window.addEventListener('resize', updateRotateHint);

// ---- controles táctiles (joystick mover + arrastrar para mirar) ----
function setupTouch(player) {
  const jBase = document.getElementById('joy-base'), jKnob = document.getElementById('joy-knob');
  let joyId = null, jox = 0, joy = 0, lookId = null, lastX = 0, lastY = 0;
  const R = 55;
  function start(t) {
    if (t.clientX < innerWidth * 0.45 && joyId === null) {
      joyId = t.identifier; jox = t.clientX; joy = t.clientY;
      jBase.style.left = jox + 'px'; jBase.style.top = joy + 'px'; jBase.classList.remove('hidden');
      jKnob.style.left = jox + 'px'; jKnob.style.top = joy + 'px';
    } else if (lookId === null) { lookId = t.identifier; lastX = t.clientX; lastY = t.clientY; }
  }
  function move(t) {
    if (t.identifier === joyId) {
      let dx = t.clientX - jox, dy = t.clientY - joy; const m = Math.hypot(dx, dy);
      if (m > R) { dx = dx / m * R; dy = dy / m * R; }
      player.joy.x = dx / R; player.joy.y = dy / R; player.joy.active = true;
      jKnob.style.left = (jox + dx) + 'px'; jKnob.style.top = (joy + dy) + 'px';
    } else if (t.identifier === lookId) {
      player.yaw -= (t.clientX - lastX) * 0.005; player.pitch -= (t.clientY - lastY) * 0.005;
      player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
      lastX = t.clientX; lastY = t.clientY;
    }
  }
  function end(id) {
    if (id === joyId) { joyId = null; player.joy.x = player.joy.y = 0; player.joy.active = false; jBase.classList.add('hidden'); jKnob.classList.add('hidden'); jBase.classList.add('hidden'); }
    if (id === lookId) lookId = null;
    jKnob.classList.remove('hidden');
  }
  addEventListener('touchstart', e => { for (const t of e.changedTouches) start(t); e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => { for (const t of e.changedTouches) move(t); e.preventDefault(); }, { passive: false });
  addEventListener('touchend', e => { for (const t of e.changedTouches) end(t.identifier); e.preventDefault(); }, { passive: false });
  addEventListener('touchcancel', e => { for (const t of e.changedTouches) end(t.identifier); }, { passive: false });
  // botón linterna táctil
  const fb = document.getElementById('btn-flash');
  if (fb) fb.addEventListener('click', (e) => { e.stopPropagation(); player.toggleFlash(); });
}

let touchReady = false;
document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('title').classList.add('hidden'); document.getElementById('hud').classList.remove('hidden');
  audio.start();
  goFullscreenLandscape();
  game.player.requestLock();           // ratón en escritorio
  if (!touchReady) { setupTouch(game.player); touchReady = true; }
  updateRotateHint();
  if (!introStarted) { introStarted = true; introIdx = 0; setTimeout(showIntro, 800); }
});

const batteryFill = document.querySelector('#battery > i');
const clock = new THREE.Clock(); let lastStep = 0; const _pp = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime; windUniform.value = t;
  const { player, built, sky } = game;
  const st = player.update(dt); built.update(dt, player.pos); sky.update(player.pos);
  if (st.moving) { const step = Math.floor(player.bobPhase / Math.PI); if (step !== lastStep) { audio.footstep(st.sprint); lastStep = step; } }
  _pp.copy(player.pos);
  for (let i = 0; i < built.lamps.length; i++) { const lamp = built.lamps[i], near = lamp.worldPos.distanceToSquared(_pp) < 90 * 90; lamp.light.visible = near; if (near) { const f = 0.55 + 0.45 * Math.sin(t * (3 + i) + i), dip = Math.sin(t * 13 + i * 7) > 0.93 ? 0.15 : 1; lamp.light.intensity = lamp.base * f * dip; lamp.bulb.material.emissiveIntensity = 1 + f * 1.5 * dip; } }
  batteryFill.style.width = (player.battery * 100).toFixed(0) + '%';
  renderer.render(scene, camera);
}

boot();

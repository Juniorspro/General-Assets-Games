// Procedural PBR texture generation using <canvas>.
// Everything is generated at runtime so the game ships with zero image deps.
import * as THREE from 'three';

const cache = new Map();

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// --- value noise (tileable) --------------------------------------------------
function rand2(x, y, seed) {
  let n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function valueNoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const w = (a, b) => ((a % period) + period) % period;
  const v00 = rand2(w(xi), w(yi), seed);
  const v10 = rand2(w(xi + 1), w(yi), seed);
  const v01 = rand2(w(xi), w(yi + 1), seed);
  const v11 = rand2(w(xi + 1), w(yi + 1), seed);
  const u = smooth(xf), v = smooth(yf);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(v00, v10, u),
    THREE.MathUtils.lerp(v01, v11, u), v);
}
function fbm(x, y, octaves, basePeriod, seed) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, basePeriod * freq, seed + o * 13);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

// Build a height field then derive a tangent-space normal map from it.
function normalFromHeight(heightData, size, strength) {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => heightData[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out[i] = (dx / len * 0.5 + 0.5) * 255;
      out[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

function texFromCanvas(c, { srgb = false, repeat = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// =====================================================================
// GROUND — grassy soil with patches of dirt
// =====================================================================
export function groundTextures(size = 1024) {
  if (cache.has('ground')) return cache.get('ground');
  const col = canvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size);
  const img = cctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 6, v = y / size * 6;
      const dirtMask = fbm(u * 0.6, v * 0.6, 4, 4, 7);          // where soil shows
      const fine = fbm(u * 9, v * 9, 5, 32, 19);                 // fine grain
      const clump = fbm(u * 2.5, v * 2.5, 4, 16, 3);             // grass clumps
      let r, g, b;
      if (dirtMask > 0.56) {
        // bare soil — brown
        const d = 0.55 + fine * 0.5;
        r = 92 * d; g = 66 * d; b = 44 * d;
      } else {
        // grass — desaturated, dry, with yellow/brown tints
        const dry = clump * 0.6 + fine * 0.4;
        r = (58 + dry * 55);
        g = (66 + dry * 60);
        b = (34 + dry * 22);
        // scatter dead patches
        if (fbm(u * 4, v * 4, 3, 16, 41) > 0.66) { r += 26; g += 14; b -= 6; }
      }
      const i = (y * size + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      heights[y * size + x] = (fine * 0.6 + clump * 0.4);
    }
  }
  cctx.putImageData(img, 0, 0);

  const nrm = canvas(size), nctx = nrm.getContext('2d');
  const ndata = normalFromHeight(heights, size, 2.2);
  nctx.putImageData(new ImageData(ndata, size, size), 0, 0);

  const out = {
    map: texFromCanvas(col, { srgb: true, repeat: 26 }),
    normalMap: texFromCanvas(nrm, { repeat: 26 }),
  };
  cache.set('ground', out);
  return out;
}

// =====================================================================
// DIRT ROAD — packed earth with wheel ruts
// =====================================================================
export function roadTextures(size = 512) {
  if (cache.has('road')) return cache.get('road');
  const col = canvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size);
  const img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const grain = fbm(u * 18, v * 18, 5, 64, 2);
      const cracks = fbm(u * 6, v * 30, 4, 32, 8);
      // two wheel ruts running along V
      const rut = Math.min(
        Math.abs(u - 0.32), Math.abs(u - 0.68));
      const rutMask = THREE.MathUtils.smoothstep(0.08, 0.0, rut);
      let d = 0.5 + grain * 0.55 - rutMask * 0.22;
      let r = 96 * d, g = 74 * d, b = 52 * d;
      // damp puddle tint in ruts
      r -= rutMask * 18; g -= rutMask * 10;
      const i = (y * size + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      heights[y * size + x] = grain * 0.7 - rutMask * 0.5 + cracks * 0.2;
    }
  }
  cctx.putImageData(img, 0, 0);
  const nrm = canvas(size), nctx = nrm.getContext('2d');
  nctx.putImageData(new ImageData(normalFromHeight(heights, size, 3.0), size, size), 0, 0);
  const out = {
    map: texFromCanvas(col, { srgb: true, repeat: 1 }),
    normalMap: texFromCanvas(nrm, { repeat: 1 }),
  };
  cache.set('road', out);
  return out;
}

// =====================================================================
// BARK
// =====================================================================
export function barkTextures(size = 512) {
  if (cache.has('bark')) return cache.get('bark');
  const col = canvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size);
  const img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // vertical fibrous ridges
      const ridge = Math.abs(Math.sin((u * 14 + fbm(u * 4, v * 2, 3, 16, 5) * 3) * Math.PI));
      const grain = fbm(u * 10, v * 40, 5, 64, 11);
      let d = 0.4 + ridge * 0.4 + grain * 0.35;
      let r = 74 * d, g = 56 * d, b = 40 * d;
      // mossy green tint in crevices
      const moss = (1 - ridge) * fbm(u * 5, v * 5, 3, 32, 22);
      r -= moss * 20; g += moss * 16; b -= moss * 10;
      const i = (y * size + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      heights[y * size + x] = ridge * 0.7 + grain * 0.4;
    }
  }
  cctx.putImageData(img, 0, 0);
  const nrm = canvas(size), nctx = nrm.getContext('2d');
  nctx.putImageData(new ImageData(normalFromHeight(heights, size, 3.4), size, size), 0, 0);
  const out = {
    map: texFromCanvas(col, { srgb: true, repeat: 1 }),
    normalMap: texFromCanvas(nrm, { repeat: 1 }),
  };
  cache.set('bark', out);
  return out;
}

// =====================================================================
// LEAF — a cluster of leaves on a transparent card (used as cross-planes)
// =====================================================================
export function leafTexture(size = 256) {
  if (cache.has('leaf')) return cache.get('leaf');
  const c = canvas(size), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  // draw many small leaf blobs to form a dense clump
  const cx = size / 2, cy = size / 2;
  for (let n = 0; n < 150; n++) {
    const a = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.6) * size * 0.46;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    const len = 10 + Math.random() * 18;
    const wid = 4 + Math.random() * 6;
    const rot = a + (Math.random() - 0.5);
    const shade = 0.45 + Math.random() * 0.55;
    const g = Math.floor((90 + Math.random() * 90) * shade);
    const r = Math.floor((40 + Math.random() * 50) * shade);
    const b = Math.floor((22 + Math.random() * 30) * shade);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2);
    ctx.fill();
    // central vein
    ctx.strokeStyle = `rgba(${r + 20},${g + 25},${b + 10},0.6)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(0, len); ctx.stroke();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set('leaf', t);
  return t;
}

// =====================================================================
// CORN — a strip of corn stalk + blades for the billboard cards
// =====================================================================
export function cornTexture(w = 128, h = 512) {
  if (cache.has('corn')) return cache.get('corn');
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  // stalk
  const grad = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
  grad.addColorStop(0, '#5b6b27'); grad.addColorStop(.5, '#869c3a'); grad.addColorStop(1, '#4d5b22');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - 5, 0, 10, h);
  // long blades
  for (let i = 0; i < 14; i++) {
    const y = h * 0.12 + Math.random() * h * 0.8;
    const side = Math.random() > 0.5 ? 1 : -1;
    const len = 30 + Math.random() * 55;
    const droop = 20 + Math.random() * 50;
    const shade = 0.6 + Math.random() * 0.5;
    ctx.fillStyle = `rgb(${Math.floor(96 * shade)},${Math.floor(120 * shade)},${Math.floor(48 * shade)})`;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + side * len * 0.6, y - 4, cx + side * len, y + droop);
    ctx.quadraticCurveTo(cx + side * len * 0.6, y + 6, cx, y + 8);
    ctx.fill();
  }
  // tassel on top
  ctx.strokeStyle = '#c9b76a'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.1);
    ctx.lineTo(cx + (Math.random() - 0.5) * 30, Math.random() * h * 0.09);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set('corn', t);
  return t;
}

// =====================================================================
// WOOD planks (fences / houses)
// =====================================================================
export function plankTextures(size = 512) {
  if (cache.has('plank')) return cache.get('plank');
  const col = canvas(size), cctx = col.getContext('2d');
  const heights = new Float32Array(size * size);
  const img = cctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const plank = Math.floor(v * 6);
      const seam = Math.abs((v * 6) % 1 - 0.0) < 0.04 || Math.abs((v * 6) % 1 - 1) < 0.04;
      const grain = fbm(u * 30, v * 6 + plank * 3, 5, 64, plank * 7 + 1);
      let d = 0.4 + grain * 0.5;
      let r = 96 * d, g = 72 * d, b = 48 * d;
      if (seam) { r *= 0.4; g *= 0.4; b *= 0.4; }
      const i = (y * size + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      heights[y * size + x] = grain * 0.6 - (seam ? 0.6 : 0);
    }
  }
  cctx.putImageData(img, 0, 0);
  const nrm = canvas(size), nctx = nrm.getContext('2d');
  nctx.putImageData(new ImageData(normalFromHeight(heights, size, 2.6), size, size), 0, 0);
  const out = {
    map: texFromCanvas(col, { srgb: true, repeat: 1 }),
    normalMap: texFromCanvas(nrm, { repeat: 1 }),
  };
  cache.set('plank', out);
  return out;
}

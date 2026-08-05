// Coherent world generator: heightfield + the meandering dirt road that is
// carved into it. Everything else (trees, corn, fences, poles, props) queries
// this so it sits correctly on the ground and respects the road corridor.
import * as THREE from 'three';

function hash(x, y, s) {
  let n = Math.sin(x * 127.1 + y * 311.7 + s * 57.13) * 43758.5453;
  return n - Math.floor(n);
}
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  const u = smooth(xf), v = smooth(yf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}
function fbm(x, y, oct, s) {
  let amp = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * vnoise(x * f, y * f, s + o); norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}

export class WorldGen {
  constructor(seed = 1337, half = 240) {
    this.seed = seed;
    this.half = half;            // world extends [-half, half] on x and z
    this.roadWidth = 6.0;        // drivable width
    this.roadShoulder = 11.0;    // blend radius into terrain
    this._buildRoad();
  }

  // raw rolling-hills height (no road)
  baseHeight(x, z) {
    const big = fbm(x * 0.0035 + 10, z * 0.0035 - 5, 4, this.seed) - 0.5;     // broad hills
    const mid = fbm(x * 0.015, z * 0.015, 4, this.seed + 20) - 0.5;            // bumps
    const fine = fbm(x * 0.08, z * 0.08, 3, this.seed + 40) - 0.5;            // micro
    return big * 14 + mid * 3.2 + fine * 0.6;
  }

  _buildRoad() {
    // The road runs roughly along Z, meandering in X. Monotonic in Z so we can
    // index nearest centerline point by Z for fast distance queries.
    const pts = [];
    const step = 2.0;
    for (let z = -this.half - 20; z <= this.half + 20; z += step) {
      const x = Math.sin(z * 0.012) * 38 + Math.sin(z * 0.045 + 1.3) * 10;
      pts.push(new THREE.Vector2(x, z));
    }
    // smoothed height along the centreline
    this.road = pts;
    this.roadZ0 = pts[0].y;
    this.roadStep = step;
    const h = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) h[i] = this.baseHeight(pts[i].x, pts[i].y);
    // smooth height so the road feels graded
    const sm = new Float32Array(pts.length);
    const R = 6;
    for (let i = 0; i < pts.length; i++) {
      let acc = 0, c = 0;
      for (let k = -R; k <= R; k++) { const j = i + k; if (j >= 0 && j < pts.length) { acc += h[j]; c++; } }
      sm[i] = acc / c;
    }
    this.roadH = sm;
  }

  // nearest point on the road centreline
  roadInfo(x, z) {
    const fi = (z - this.roadZ0) / this.roadStep;
    const i0 = Math.max(0, Math.min(this.road.length - 1, Math.round(fi)));
    let best = Infinity, bi = i0, bx = 0;
    for (let i = Math.max(0, i0 - 3); i <= Math.min(this.road.length - 1, i0 + 3); i++) {
      const p = this.road[i];
      const d = (p.x - x) * (p.x - x) + (p.y - z) * (p.y - z);
      if (d < best) { best = d; bi = i; bx = p.x; }
    }
    return { dist: Math.sqrt(best), index: bi, centerX: bx, height: this.roadH[bi] };
  }

  // final terrain height, with the road carved/graded in
  getHeight(x, z) {
    const base = this.baseHeight(x, z);
    const r = this.roadInfo(x, z);
    if (r.dist > this.roadShoulder) return base;
    const t = THREE.MathUtils.smoothstep(r.dist, this.roadWidth * 0.5, this.roadShoulder);
    // inside road: flat graded surface slightly below terrain
    return THREE.MathUtils.lerp(r.height - 0.15, base, t);
  }

  onRoad(x, z, margin = 0) {
    return this.roadInfo(x, z).dist < this.roadWidth * 0.5 + margin;
  }

  // returns a CatmullRom curve in 3D for laying the road ribbon / driving cables
  roadCurve3D() {
    const v = this.road.filter((_, i) => i % 3 === 0).map(p =>
      new THREE.Vector3(p.x, this.getHeight(p.x, p.y) + 0.02, p.y));
    return new THREE.CatmullRomCurve3(v);
  }
}

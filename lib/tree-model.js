/**
 * tree-model.js — Generador procedural de árboles PBR reutilizable.
 *
 * "Modelo guardado" del árbol del visor original, ahora parametrizado por
 * semilla y especie para poder poblar bosques con árboles distintos.
 *
 * Framework: Three.js (>=0.160). Pasá el módulo THREE como primer argumento
 * para no acoplar la versión.
 *
 * Uso:
 *   import { createTree, SPECIES, mulberry32 } from './lib/tree-model.js';
 *   const rng = mulberry32(12345);
 *   const tree = createTree(THREE, { species: 'roble', season: 'summer', radialSegments: 7 }, rng);
 *   // tree.trunkGeometry  -> BufferGeometry (mergeado, espacio local, con atributo 'color' para tinte de corteza)
 *   // tree.leaves         -> [{ matrix: Matrix4, color: Color }]  (transform local de cada hoja)
 *   // tree.height         -> altura aproximada (m)
 *
 * El consumidor decide cómo renderizar las hojas (lo habitual: una única
 * InstancedMesh global para todo el bosque, aplicando la matriz de mundo del
 * árbol a cada matriz local de hoja).
 */

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* PRNG determinista (mulberry32) para árboles reproducibles por semilla. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Definición de especies: cada una varía silueta, corteza y follaje. */
export const SPECIES = {
  roble:  { shape: 'broadleaf', hMin: 4.0, hMax: 5.4, rTrunk: 0.50, taper: 0.74, depth: 5, leafSize: 0.72, tint: [1.00, 0.96, 0.90], leafHue: 0.00,  leafLight: 1.00 },
  abedul: { shape: 'slender',   hMin: 5.2, hMax: 6.8, rTrunk: 0.32, taper: 0.78, depth: 5, leafSize: 0.55, tint: [1.00, 0.99, 0.95], leafHue: 0.02,  leafLight: 1.22 },
  pino:   { shape: 'conifer',   hMin: 6.2, hMax: 8.6, rTrunk: 0.44, taper: 0.70, depth: 4, leafSize: 0.46, tint: [0.86, 0.74, 0.62], leafHue: -0.01, leafLight: 0.7 },
};

/* Paletas estacionales base (HSL). El pino se mantiene perenne. */
const SEASONS = {
  spring: [[0.27, 0.62, 0.55], [0.22, 0.70, 0.60], [0.30, 0.55, 0.70]],
  summer: [[0.30, 0.65, 0.34], [0.27, 0.70, 0.28], [0.33, 0.60, 0.42]],
  autumn: [[0.07, 0.85, 0.45], [0.04, 0.90, 0.50], [0.11, 0.80, 0.40], [0.015, 0.85, 0.42]],
  winter: [[0.10, 0.30, 0.35], [0.08, 0.25, 0.30]],
};

export function leafColor(THREE, species, season, rng) {
  const sp = SPECIES[species];
  // El pino es perenne: verde oscuro salvo leve variación.
  const pal = (species === 'pino')
    ? [[0.32, 0.55, 0.26], [0.30, 0.6, 0.22], [0.34, 0.5, 0.3]]
    : SEASONS[season];
  const p = pal[Math.floor(rng() * pal.length)];
  const c = new THREE.Color();
  c.setHSL(
    p[0] + sp.leafHue + (rng() - 0.5) * 0.03,
    p[1],
    Math.min(0.95, p[2] * sp.leafLight * (0.82 + rng() * 0.4))
  );
  return c;
}

export function createTree(THREE, opts, rng) {
  const species = opts.species || 'roble';
  const season = opts.season || 'summer';
  const radialSegments = opts.radialSegments || 6;
  const sp = SPECIES[species];
  const height = sp.hMin + rng() * (sp.hMax - sp.hMin);

  const UP = new THREE.Vector3(0, 1, 0);
  const geos = [];
  const leafAnchors = [];
  const tint = new Float32Array([sp.tint[0], sp.tint[1], sp.tint[2]]);

  function perpendicular(v) {
    const a = Math.abs(v.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3().crossVectors(v, a).normalize();
  }
  function segment(p0, p1, r0, r1) {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length() || 0.001;
    const g = new THREE.CylinderGeometry(Math.max(r1, 0.008), Math.max(r0, 0.01), len, radialSegments, 1, false);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    g.applyMatrix4(new THREE.Matrix4().compose(mid, quat, new THREE.Vector3(1, 1, 1)));
    g.clearGroups();
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = tint[0]; col[i * 3 + 1] = tint[1]; col[i * 3 + 2] = tint[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }

  // ---- Árbol de hoja ancha / esbelto (recursivo) ----
  function buildBranch(origin, dir, length, radius, depth) {
    const segs = Math.max(2, Math.round(length * 1.4));
    let pos = origin.clone();
    let d = dir.clone().normalize();
    for (let i = 0; i < segs; i++) {
      const segLen = length / segs;
      const bend = perpendicular(d).applyAxisAngle(d, rng() * 6.28);
      d.addScaledVector(bend, 0.07 + (5 - depth) * 0.015);
      d.y -= 0.04 * (1 - radius);
      d.normalize();
      const next = pos.clone().addScaledVector(d, segLen);
      const r0 = radius * (1 - (i / segs) * (1 - sp.taper));
      const r1 = radius * (1 - ((i + 1) / segs) * (1 - sp.taper));
      segment(pos, next, r0, r1);
      pos = next;
      if (depth <= 1) leafAnchors.push(pos.clone());
    }
    const endRadius = radius * sp.taper;
    if (depth <= 0 || endRadius < 0.018) { leafAnchors.push(pos.clone()); return; }

    const slender = sp.shape === 'slender';
    const children = depth >= 4 ? 2 : (2 + (rng() < 0.5 ? 1 : 0));
    const baseRoll = rng() * 6.28;
    for (let c = 0; c < children; c++) {
      const axis = perpendicular(d).applyAxisAngle(d, baseRoll + c * (6.28 / children) + (rng() - 0.5));
      const angle = (slender ? 0.3 : 0.45) + rng() * (slender ? 0.4 : 0.55);
      const childDir = d.clone().applyAxisAngle(axis, angle).normalize();
      buildBranch(pos, childDir, length * (slender ? 0.66 : 0.62) + length * rng() * 0.16, endRadius * (0.78 + rng() * 0.12), depth - 1);
    }
    if (depth >= 3 && rng() < (slender ? 0.95 : 0.85)) {
      buildBranch(pos, d.clone().applyAxisAngle(perpendicular(d), slender ? 0.06 : 0.12).normalize(),
        length * (slender ? 0.78 : 0.7), endRadius * 0.84, depth - 1);
    }
  }

  // ---- Conífera (tronco recto con verticilos descendentes) ----
  function buildConifer(totalH, baseR) {
    const segs = Math.max(8, Math.round(totalH * 1.4));
    let pos = new THREE.Vector3(0, 0, 0);
    let r = baseR;
    let d = new THREE.Vector3((rng() - 0.5) * 0.04, 1, (rng() - 0.5) * 0.04).normalize();
    for (let i = 0; i < segs; i++) {
      const segLen = totalH / segs;
      const next = pos.clone().addScaledVector(d, segLen);
      segment(pos, next, r, r * 0.95);
      const frac = i / segs;
      if (frac > 0.16) {
        const crownR = (1 - frac) * totalH * 0.30 + 0.3;
        const count = 4 + (rng() < 0.5 ? 1 : 0);
        const roll = rng() * 6.28;
        for (let b = 0; b < count; b++) {
          let bd = new THREE.Vector3(Math.cos(roll + b * 6.28 / count), 0, Math.sin(roll + b * 6.28 / count));
          bd.y = -(0.25 + 0.5 * frac); bd.normalize();
          const blen = crownR * (0.7 + rng() * 0.5);
          const tip = next.clone().addScaledVector(bd, blen);
          segment(next, tip, r * 0.4, r * 0.12);
          leafAnchors.push(tip);
          leafAnchors.push(next.clone().addScaledVector(bd, blen * 0.6));
        }
      }
      r *= 0.93; pos = next;
    }
    leafAnchors.push(pos.clone());
  }

  if (sp.shape === 'conifer') buildConifer(height, sp.rTrunk);
  else buildBranch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, 1, 0.02), height * 0.82, sp.rTrunk, sp.depth);

  const trunkGeometry = mergeGeometries(geos, false);
  geos.forEach(g => g.dispose());

  // Distribuir hojas alrededor de los anclajes
  const leaves = [];
  const leafBudget = opts.leafCount || 800;
  const per = Math.max(1, Math.floor(leafBudget / Math.max(leafAnchors.length, 1)));
  const dummy = new THREE.Object3D();
  const spread = sp.shape === 'conifer' ? 0.5 : 0.95;
  for (let a = 0; a < leafAnchors.length; a++) {
    const base = leafAnchors[a];
    const k = (a % 5 === 0) ? per + 2 : per;
    for (let j = 0; j < k; j++) {
      dummy.position.set(
        base.x + (rng() - 0.5) * spread,
        base.y + (rng() - 0.5) * spread,
        base.z + (rng() - 0.5) * spread
      );
      dummy.rotation.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
      const s = sp.leafSize * (0.7 + rng() * 0.7);
      dummy.scale.set(s, s * 1.25, s);
      dummy.updateMatrix();
      leaves.push({ matrix: dummy.matrix.clone(), color: leafColor(THREE, species, season, rng) });
    }
  }

  return { trunkGeometry, leaves, height, species };
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { barkTextures, leafTexture } from './textures.js';

// shared wind uniform, advanced by the game loop
export const windUniform = { value: 0 };

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();

function segment(p0, p1, r0, r1) {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  if (len < 0.001) return null;
  dir.normalize();
  const geo = new THREE.CylinderGeometry(r1, r0, len, 6, 1, true);
  _q.setFromUnitVectors(_up, dir);
  geo.applyQuaternion(_q);
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

function leafCard(center, size, r) {
  const g = new THREE.PlaneGeometry(size, size);
  // random full 3D orientation so clusters read as volume, not flat cards
  g.rotateX(r() * Math.PI);
  g.rotateY(r() * Math.PI);
  g.rotateZ(r() * Math.PI);
  g.translate(
    center.x + (r() - 0.5) * size * 0.5,
    center.y + (r() - 0.5) * size * 0.5,
    center.z + (r() - 0.5) * size * 0.5);
  return g;
}

// Build one tree prototype -> { bark: geometry, leaf: geometry }
function buildPrototype(seed) {
  const r = rng(seed);
  const bark = [];
  const leaf = [];
  const leafSize = 2.0 + r() * 1.2;

  function grow(start, dir, length, radius, depth) {
    // a branch is a few slightly-curved segments
    const segs = depth >= 3 ? 4 : 2;
    let p = start.clone();
    let d = dir.clone().normalize();
    const segLen = length / segs;
    for (let i = 0; i < segs; i++) {
      // gravity / curve
      d.y -= 0.06 * (4 - depth);
      d.x += (r() - 0.5) * 0.12;
      d.z += (r() - 0.5) * 0.12;
      d.normalize();
      const next = p.clone().addScaledVector(d, segLen);
      const r0 = radius * (1 - i / segs * 0.4);
      const r1 = radius * (1 - (i + 1) / segs * 0.4);
      const g = segment(p, next, r0, r1);
      if (g) bark.push(g);
      p = next;
    }

    if (depth <= 0) {
      // foliage at the tip
      const n = 5 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) leaf.push(leafCard(p, leafSize * (0.7 + r() * 0.6), r));
      return;
    }

    // children
    const kids = depth >= 3 ? 3 : (2 + Math.floor(r() * 2));
    for (let i = 0; i < kids; i++) {
      const axis = new THREE.Vector3(r() - 0.5, r() * 0.4, r() - 0.5).normalize();
      const ang = 0.5 + r() * 0.7;
      const nd = d.clone().applyAxisAngle(axis, ang);
      nd.y = Math.max(nd.y, 0.1);
      nd.normalize();
      grow(p.clone(), nd, length * (0.62 + r() * 0.18), radius * 0.6, depth - 1);
    }
    // a few leaves on mid-branches too, for fullness
    if (depth <= 2) {
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) leaf.push(leafCard(p, leafSize * 0.8, r));
    }
  }

  const trunkH = 7 + r() * 5;
  const trunkR = 0.5 + r() * 0.35;
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2),
       trunkH, trunkR, 4);

  return {
    bark: mergeGeometries(bark, false),
    leaf: mergeGeometries(leaf, false),
  };
}

function makeLeafMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    map: leafTexture(),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0.0,
    color: 0x6a7a4a,
    vertexColors: true,
  });
  // wind sway in the vertex shader, stronger toward the top
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = windUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uWind;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float wph = instanceMatrix[3][0] + instanceMatrix[3][2];
        float sway = sin(uWind * 1.3 + wph * 0.5) * 0.18 + sin(uWind * 2.7 + wph) * 0.07;
        transformed.x += sway * max(position.y * 0.0 + 1.0, 0.0) * 0.35;
        transformed.z += cos(uWind + wph) * 0.12;`);
  };
  return mat;
}

// Scatter trees, returning the group of instanced meshes.
export function buildTrees(world, placements) {
  const group = new THREE.Group();
  group.name = 'trees';
  const barkTex = barkTextures();
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex.map, normalMap: barkTex.normalMap,
    roughness: 0.95, metalness: 0.0, color: 0x8a8278,
  });
  const leafMat = makeLeafMaterial();

  // group placements by prototype
  const protoCount = 4;
  const protos = [];
  for (let i = 0; i < protoCount; i++) protos.push(buildPrototype(91 + i * 777));

  const buckets = Array.from({ length: protoCount }, () => []);
  for (const p of placements) buckets[p.proto % protoCount].push(p);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  buckets.forEach((list, pi) => {
    if (!list.length) return;
    const proto = protos[pi];
    const barkInst = new THREE.InstancedMesh(proto.bark, barkMat, list.length);
    const leafInst = new THREE.InstancedMesh(proto.leaf, leafMat, list.length);
    barkInst.castShadow = true; barkInst.receiveShadow = true;
    leafInst.castShadow = false; // avoid blocky alpha-card shadows
    leafInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);

    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set((Math.random() - 0.5) * 0.06, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.06);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      barkInst.setMatrixAt(i, dummy.matrix);
      leafInst.setMatrixAt(i, dummy.matrix);
      // sickly autumnal variation — some trees half dead
      const dead = Math.random();
      col.setHSL(0.18 + dead * 0.07, 0.35 + Math.random() * 0.25, 0.28 + Math.random() * 0.15);
      leafInst.setColorAt(i, col);
    });
    barkInst.instanceMatrix.needsUpdate = true;
    leafInst.instanceMatrix.needsUpdate = true;
    group.add(barkInst, leafInst);
  });

  return group;
}

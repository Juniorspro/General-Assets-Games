import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cornTexture } from './textures.js';
import { windUniform } from './trees.js';

function cornStalkGeo() {
  const h = 2.6, w = 1.5;
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  return mergeGeometries([a, b], false);
}

function makeMaterial() {
  const mat = new THREE.MeshStandardMaterial({
    map: cornTexture(),
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0,
    vertexColors: true,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = windUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uWind;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float ph = instanceMatrix[3][0] * 0.3 + instanceMatrix[3][2] * 0.3;
        float h01 = clamp(position.y / 2.6, 0.0, 1.0);
        float gust = sin(uWind * 1.1 + ph) * 0.5 + sin(uWind * 2.3 + ph * 1.7) * 0.25;
        transformed.x += gust * h01 * h01 * 0.55;
        transformed.z += cos(uWind * 0.9 + ph) * h01 * h01 * 0.35;`);
  };
  return mat;
}

// fields: [{cx,cz,w,d,rot}], spacing controls row density
export function buildCornField(world, fields, spacing = 1.0) {
  const instances = [];
  for (const f of fields) {
    const cos = Math.cos(f.rot), sin = Math.sin(f.rot);
    for (let lx = -f.w / 2; lx <= f.w / 2; lx += spacing) {
      for (let lz = -f.d / 2; lz <= f.d / 2; lz += spacing * 1.4) {
        // jitter inside the row
        const jx = lx + (Math.random() - 0.5) * spacing * 0.5;
        const jz = lz + (Math.random() - 0.5) * spacing * 0.4;
        const wx = f.cx + jx * cos - jz * sin;
        const wz = f.cz + jx * sin + jz * cos;
        if (world.onRoad(wx, wz, 2.5)) continue; // keep the road clear
        instances.push({ x: wx, z: wz });
      }
    }
  }

  const geo = cornStalkGeo();
  const mat = makeMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, instances.length);
  mesh.name = 'corn';
  mesh.castShadow = false; // alpha cards + huge count: skip shadow pass for perf
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(instances.length * 3), 3);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  instances.forEach((p, i) => {
    dummy.position.set(p.x, world.getHeight(p.x, p.z) - 0.05, p.z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.12);
    dummy.scale.set(0.9 + Math.random() * 0.4, 0.85 + Math.random() * 0.5, 0.9 + Math.random() * 0.4);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    col.setHSL(0.18 + Math.random() * 0.06, 0.4, 0.32 + Math.random() * 0.18);
    mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

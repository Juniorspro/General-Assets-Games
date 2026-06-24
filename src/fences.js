import * as THREE from 'three';
import { plankTextures } from './textures.js';

// lines: array of polylines, each an array of {x,z}
export function buildFences(world, lines, opts = {}) {
  const spacing = opts.spacing ?? 2.4;
  const postH = opts.postH ?? 1.3;
  const group = new THREE.Group();
  group.name = 'fences';

  const t = plankTextures();
  const mat = new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughness: 0.95, metalness: 0, color: 0x9a8f7e,
  });

  const posts = [];   // matrices
  const rails = [];   // {len, mid, angle, y}

  for (const line of lines) {
    for (let s = 0; s < line.length - 1; s++) {
      const a = line[s], b = line[s + 1];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.max(1, Math.round(segLen / spacing));
      const angle = Math.atan2(b.z - a.z, b.x - a.x);
      for (let i = 0; i <= n; i++) {
        if (s > 0 && i === 0) continue; // avoid duplicate shared post
        const tt = i / n;
        const x = THREE.MathUtils.lerp(a.x, b.x, tt);
        const z = THREE.MathUtils.lerp(a.z, b.z, tt);
        posts.push({ x, z, y: world.getHeight(x, z) });
      }
      // rails along this segment, slightly drooping older fence look
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const my = (world.getHeight(a.x, a.z) + world.getHeight(b.x, b.z)) / 2;
      rails.push({ len: segLen, x: mx, z: mz, y: my, angle });
    }
  }

  // posts
  const postGeo = new THREE.BoxGeometry(0.14, postH, 0.14);
  const postMesh = new THREE.InstancedMesh(postGeo, mat, posts.length);
  postMesh.castShadow = true; postMesh.receiveShadow = true;
  const d = new THREE.Object3D();
  posts.forEach((p, i) => {
    d.position.set(p.x, p.y + postH / 2 - 0.1, p.z);
    d.rotation.set((Math.random() - 0.5) * 0.05, Math.random(), (Math.random() - 0.5) * 0.06);
    d.scale.set(1, 0.9 + Math.random() * 0.2, 1);
    d.updateMatrix(); postMesh.setMatrixAt(i, d.matrix);
  });
  postMesh.instanceMatrix.needsUpdate = true;
  group.add(postMesh);

  // rails (two heights)
  const railGeo = new THREE.BoxGeometry(1, 0.09, 0.05);
  const railMesh = new THREE.InstancedMesh(railGeo, mat, rails.length * 2);
  railMesh.castShadow = true;
  let ri = 0;
  for (const r of rails) {
    for (const hy of [postH * 0.32, postH * 0.72]) {
      d.position.set(r.x, r.y + hy - 0.1 + (Math.random() - 0.5) * 0.04, r.z);
      d.rotation.set(0, -r.angle, (Math.random() - 0.5) * 0.02);
      d.scale.set(r.len, 1, 1);
      d.updateMatrix(); railMesh.setMatrixAt(ri++, d.matrix);
    }
  }
  railMesh.instanceMatrix.needsUpdate = true;
  group.add(railMesh);

  return group;
}

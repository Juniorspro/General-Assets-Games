import * as THREE from 'three';
import { groundTextures, roadTextures } from './textures.js';

export function buildTerrain(world) {
  const size = world.half * 2;
  const seg = Math.floor(size / 1.6);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, world.getHeight(x, z));
  }
  geo.computeVertexNormals();

  const t = groundTextures();
  const mat = new THREE.MeshStandardMaterial({
    map: t.map,
    normalMap: t.normalMap,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 0.97,
    metalness: 0.0,
    color: 0x8a8a82,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

export function buildRoad(world) {
  // Ribbon following the centreline, with proper perpendicular offsets.
  const pts = world.road;
  const half = world.roadWidth * 0.5 + 0.4;
  const positions = [];
  const uvs = [];
  const normals = [];
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const dir = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x);
    if (i > 0) dist += Math.hypot(p.x - prev.x, p.y - prev.y);
    const y = world.getHeight(p.x, p.y) + 0.06;
    const lx = p.x + perp.x * half, lz = p.y + perp.y * half;
    const rx = p.x - perp.x * half, rz = p.y - perp.y * half;
    positions.push(lx, world.getHeight(lx, lz) + 0.06, lz);
    positions.push(rx, world.getHeight(rx, rz) + 0.06, rz);
    const v = dist / 8;
    uvs.push(0, v, 1, v);
    normals.push(0, 1, 0, 0, 1, 0);
  }
  const indices = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const t = roadTextures();
  const mat = new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap,
    roughness: 1.0, metalness: 0.0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'road';
  return mesh;
}

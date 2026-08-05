import * as THREE from 'three';
import { buildTerrain, buildRoad } from './terrain.js';
import { buildTrees } from './trees.js';
import { buildCornField } from './cornfield.js';
import { buildFences } from './fences.js';
import { buildLightPoles } from './lightpoles.js';
import { makeInstance } from './models.js';

export function buildWorld(scene, world, assets) {
  const obstacles = [];
  const npcs = [];

  scene.add(buildTerrain(world));
  scene.add(buildRoad(world));

  // ---- corn fields (long rows beside the road) ----
  const fields = [
    { cx: 70, cz: -60, w: 90, d: 130, rot: 0.05 },
    { cx: -78, cz: 40, w: 100, d: 150, rot: -0.04 },
    { cx: 95, cz: 120, w: 80, d: 110, rot: 0.0 },
    { cx: -60, cz: -150, w: 80, d: 120, rot: 0.08 },
  ];
  const inCorn = (x, z) => fields.some(f => {
    const c = Math.cos(-f.rot), s = Math.sin(-f.rot);
    const lx = (x - f.cx) * c - (z - f.cz) * s;
    const lz = (x - f.cx) * s + (z - f.cz) * c;
    return Math.abs(lx) < f.w / 2 + 2 && Math.abs(lz) < f.d / 2 + 2;
  });
  scene.add(buildCornField(world, fields, 1.1));

  // ---- trees: clustered groves + an avenue along the road ----
  const placements = [];
  const pushTree = (x, z, proto, scale) => {
    if (world.onRoad(x, z, 5) || inCorn(x, z)) return;
    const y = world.getHeight(x, z);
    placements.push({ x, y, z, proto, scale });
    obstacles.push({ x, z, r: 0.7 });
  };
  // groves
  for (let g = 0; g < 14; g++) {
    const gx = (Math.random() - 0.5) * world.half * 1.8;
    const gz = (Math.random() - 0.5) * world.half * 1.8;
    const n = 5 + Math.floor(Math.random() * 9);
    for (let i = 0; i < n; i++) {
      pushTree(gx + (Math.random() - 0.5) * 26, gz + (Math.random() - 0.5) * 26,
        Math.floor(Math.random() * 4), 0.8 + Math.random() * 0.9);
    }
  }
  // avenue along the road
  for (let z = -world.half + 20; z < world.half - 20; z += 16) {
    const cx = world.roadInfo(0, z).centerX;
    for (const side of [1, -1]) {
      if (Math.random() < 0.35) continue;
      pushTree(cx + side * (world.roadWidth / 2 + 7 + Math.random() * 3),
        z + (Math.random() - 0.5) * 6, Math.floor(Math.random() * 4), 0.9 + Math.random() * 0.6);
    }
  }
  scene.add(buildTrees(world, placements));

  // ---- fences along the road and around the fields ----
  const roadFenceL = [], roadFenceR = [];
  for (let i = 0; i < world.road.length; i += 2) {
    const p = world.road[i];
    const prev = world.road[Math.max(0, i - 1)];
    const dir = new THREE.Vector2(p.x - prev.x, p.y - prev.y).normalize();
    const perp = new THREE.Vector2(-dir.y, dir.x);
    const off = world.roadWidth / 2 + 1.4;
    roadFenceL.push({ x: p.x + perp.x * off, z: p.y + perp.y * off });
    roadFenceR.push({ x: p.x - perp.x * off, z: p.y - perp.y * off });
  }
  const fieldFences = fields.map(f => {
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => {
      const lx = sx * f.w / 2, lz = sz * f.d / 2;
      return { x: f.cx + lx * c - lz * s, z: f.cz + lx * s + lz * c };
    });
    return corners;
  });
  scene.add(buildFences(world, [roadFenceL, roadFenceR, ...fieldFences]));

  // ---- light poles + tangled cables ----
  const poles = buildLightPoles(world);
  scene.add(poles.group);
  for (const lamp of poles.lamps) obstacles.push({ x: lamp.worldPos.x, z: lamp.worldPos.z, r: 0.5 });

  // ---- placed models -------------------------------------------------
  const placeOnRoadSide = (z, side, dist) => {
    const cx = world.roadInfo(0, z).centerX;
    return { x: cx + side * dist, z };
  };

  function add(model, x, z, ry = 0, obstacleR = 0) {
    if (!model) return null;
    model.position.set(x, world.getHeight(x, z), z);
    model.rotation.y = ry;
    scene.add(model);
    if (obstacleR > 0) obstacles.push({ x, z, r: obstacleR });
    return model;
  }

  // farmhouse + a couple houses along the road
  const h1 = placeOnRoadSide(-30, 1, 24);
  add(makeInstance(assets.japanHouse, { targetH: 7 }), h1.x, h1.z, -Math.PI / 2 + 0.2, 6);
  const h2 = placeOnRoadSide(90, -1, 22);
  add(makeInstance(assets.ozoneHouse, { targetH: 6 }), h2.x, h2.z, Math.PI / 2, 5);
  const h3 = placeOnRoadSide(170, 1, 26);
  add(makeInstance(assets.ozoneHouse, { targetH: 6 }), h3.x, h3.z, -Math.PI / 2 - 0.3, 5);

  // the broken-down car near spawn, plus a truck by the farm and a parked car
  const wreck = placeOnRoadSide(8, 0, 1.5);
  add(makeInstance(assets.rustyCar, { targetH: 1.6 }), wreck.x, wreck.z, 0.4, 2.4);
  const truck = placeOnRoadSide(-34, 1, 14);
  add(makeInstance(assets.truck, { targetH: 2.6 }), truck.x, truck.z, 1.2, 2.6);
  const parked = placeOnRoadSide(92, -1, 14);
  add(makeInstance(assets.carPack, { targetH: 1.6 }), parked.x, parked.z, -0.6, 2.4);

  // clergy / graveyard set-dressing near the first house
  add(makeInstance(assets.clergy, { targetH: 3 }), h1.x + 8, h1.z + 6, 0.5);

  // background pines at the far edges
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = world.half * (0.75 + Math.random() * 0.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) > world.half - 6 || Math.abs(z) > world.half - 6) continue;
    add(makeInstance(assets.pines, { targetH: 12 + Math.random() * 6 }), x, z, Math.random() * 6.28);
  }

  // ---- the watchers: PS1 figures standing in the dark ----------------
  const watcherSpots = [
    placeOnRoadSide(40, 1, 9),
    placeOnRoadSide(-80, -1, 11),
    placeOnRoadSide(130, 1, 8),
    placeOnRoadSide(-140, 1, 12),
    placeOnRoadSide(60, -1, 16),
    placeOnRoadSide(200, -1, 10),
  ];
  watcherSpots.forEach((spot, i) => {
    const src = i % 2 === 0 ? assets.highSchool : assets.rigged;
    const w = makeInstance(src, { targetH: 1.8, skinned: true });
    if (!w) return;
    w.position.set(spot.x, world.getHeight(spot.x, spot.z), spot.z);
    scene.add(w);
    let mixer = null;
    const clips = w.userData.animations;
    if (clips && clips.length) {
      mixer = new THREE.AnimationMixer(w.userData.inner);
      mixer.clipAction(clips[0]).play();
    }
    npcs.push({ obj: w, mixer, turnSpeed: 0.3 + Math.random() * 0.5 });
    obstacles.push({ x: spot.x, z: spot.z, r: 0.6 });
  });

  return {
    lamps: poles.lamps,
    obstacles,
    npcs,
    update(dt, playerPos) {
      for (const n of npcs) {
        if (n.mixer) n.mixer.update(dt);
        // slowly rotate to face the player — they are always watching
        const dx = playerPos.x - n.obj.position.x;
        const dz = playerPos.z - n.obj.position.z;
        const target = Math.atan2(dx, dz);
        let cur = n.obj.rotation.y;
        let diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
        n.obj.rotation.y = cur + diff * Math.min(1, dt * n.turnSpeed);
      }
    },
  };
}

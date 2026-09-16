---
name: open-world-streaming
description: Architect large, complex web game worlds that stay at 60fps — chunked streaming, LOD hierarchies, ECS entity management, spatial indexing with three-mesh-bvh, procedural terrain and placement, save/load, and the fixed-timestep game loop that ties it together. Use this skill whenever the user is building an open world, large level, infinite terrain, city, dungeon generator, or any game with more content than fits in memory; whenever they mention chunks, streaming, LOD, culling, ECS, entity systems, procedural generation, seeds, or world persistence; and whenever a scene runs fine small but degrades as they add content, hitches while loading, or they're deciding how to structure a complex game project.
---

# Building large worlds that run in a browser

The constraint is never "how much can I model" — it's how much can be resident, updated, and drawn per frame. A large world is an exercise in deciding what *not* to have loaded. Design the streaming architecture before building content, because retrofitting it means rebuilding everything.

## Architecture: separate the four layers

Most complex web games fail from tangling these together. Keep them separate from day one:

1. **World data** — the authoritative description of what exists and where. Serializable, no three.js objects. Survives a reload.
2. **Simulation** — physics and gameplay logic operating on data. Fixed timestep.
3. **Presentation** — three.js meshes, materials, animation. Created and destroyed as things stream in and out. Never the source of truth.
4. **Streaming** — decides which parts of layers 2 and 3 exist right now.

The test: you should be able to destroy every mesh in the scene and rebuild it from world data without losing game state.

## The game loop

One loop, fixed simulation, interpolated rendering:

```js
const FIXED_DT = 1 / 60;
let accumulator = 0, last = performance.now();

function frame(now) {
  const delta = Math.min((now - last) / 1000, 0.25);
  last = now;

  input.poll();

  accumulator += delta;
  let steps = 0;
  while (accumulator >= FIXED_DT && steps++ < 5) {
    simulate(FIXED_DT);          // physics + gameplay, deterministic
    accumulator -= FIXED_DT;
  }

  streaming.update(camera.position, delta);   // budgeted, see below
  presentation.sync(accumulator / FIXED_DT);  // interpolate transforms
  animation.update(delta);                    // render-rate, not fixed
  render();

  requestAnimationFrame(frame);
}
```

## Chunking

Divide the world into fixed-size cells. Size them so a chunk is a meaningful unit of work — 64 m for a detailed world, 256 m for a sparse one. Too small means thousands of chunks and management overhead; too large means visible loading hitches.

```js
const CHUNK = 64;
const key = (cx, cz) => `${cx},${cz}`;
const toChunk = (x, z) => [Math.floor(x / CHUNK), Math.floor(z / CHUNK)];
```

Three concentric rings around the player, each doing more:

| Ring | Radius | What exists |
|---|---|---|
| Active | 1–2 chunks | Full mesh, colliders, entities simulating, animation |
| Near | 3–5 chunks | Full mesh, no colliders, entities frozen |
| Far | 6–12 chunks | Impostor / lowest LOD only, no entities |
| Beyond | — | Unloaded, data only |

```js
class Streaming {
  update(playerPos, delta) {
    const [pcx, pcz] = toChunk(playerPos.x, playerPos.z);
    const wanted = new Set();
    for (let dz = -FAR; dz <= FAR; dz++) {
      for (let dx = -FAR; dx <= FAR; dx++) {
        const d = Math.hypot(dx, dz);
        if (d > FAR) continue;
        wanted.add(key(pcx + dx, pcz + dz));
      }
    }
    for (const k of wanted) if (!this.loaded.has(k)) this.enqueueLoad(k, distanceOf(k));
    for (const k of this.loaded.keys()) if (!wanted.has(k)) this.enqueueUnload(k);
    this.processQueue();
  }
}
```

## Budget the work per frame — this is the whole game

The difference between a world that streams smoothly and one that stutters is refusing to do unbounded work in a single frame.

```js
processQueue() {
  const budgetMs = 4;                     // hard ceiling
  const start = performance.now();
  this.queue.sort((a, b) => a.dist - b.dist);   // nearest first, always
  while (this.queue.length && performance.now() - start < budgetMs) {
    const job = this.queue.shift();
    job.run();                            // ONE unit of work
  }
}
```

Break loading into small units: parse geometry, build mesh, upload texture, create collider, spawn entities — each a separate job. Never "load an entire chunk" as one synchronous call.

**Move heavy work off the main thread.** Terrain generation, mesh building, pathfinding graphs, and noise sampling belong in a Web Worker returning transferable `Float32Array`s. The main thread should only do the GPU upload, which cannot be moved.

```js
// worker returns { positions, normals, uvs, indices } as transferables
worker.postMessage({ cx, cz, seed }, []);
worker.onmessage = ({ data }) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  g.setIndex(new THREE.BufferAttribute(data.indices, 1));
  // ...
};
```

**Pool everything.** Creating and disposing geometries and materials causes GC pauses and GPU stalls. Keep a pool of chunk meshes and reuse their buffers by writing into existing attributes with `needsUpdate = true`.

Disposal is not automatic. Every unload must call `geometry.dispose()`, `material.dispose()`, and `texture.dispose()`, or you leak GPU memory until the tab dies.

## Entity management with an ECS

Once you have hundreds of entities of different kinds, class hierarchies collapse. Use an ECS — `bitECS` for maximum performance, `miniplex` for ergonomics.

```js
import { createWorld, defineComponent, defineQuery, addEntity, addComponent, Types } from 'bitecs';

const Position = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 });
const Velocity = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 });
const Renderable = defineComponent({ meshId: Types.ui16 });
const ChunkOwned = defineComponent({ cx: Types.i16, cz: Types.i16 });

const movingQuery = defineQuery([Position, Velocity]);

function movementSystem(world, dt) {
  for (const eid of movingQuery(world)) {
    Position.x[eid] += Velocity.x[eid] * dt;
    Position.z[eid] += Velocity.z[eid] * dt;
  }
}
```

The payoff beyond performance: streaming becomes trivial. Tag entities with the chunk that owns them, and unloading a chunk is a query and a batch remove. Saving is serializing component arrays.

**Level of detail for simulation, not just meshes.** Distant entities should tick at 5 Hz instead of 60, or not at all. Run a `simulationLOD` value per entity based on distance and let each system skip accordingly. This scales further than any rendering optimization.

## Spatial queries

Naive distance loops over all entities kill you at scale. Use a uniform grid for entities (cheap, dynamic) and BVH for geometry (raycasting, collision).

```js
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

terrainGeometry.computeBoundsTree();   // then raycasts are orders of magnitude faster
```

A uniform grid for entity proximity:

```js
class SpatialGrid {
  constructor(cell = 8) { this.cell = cell; this.buckets = new Map(); }
  key(x, z) { return `${Math.floor(x/this.cell)},${Math.floor(z/this.cell)}`; }
  insert(eid, x, z) {
    const k = this.key(x, z);
    if (!this.buckets.has(k)) this.buckets.set(k, new Set());
    this.buckets.get(k).add(eid);
  }
  queryRadius(x, z, r, out = []) {
    const c = Math.ceil(r / this.cell);
    const [bx, bz] = [Math.floor(x/this.cell), Math.floor(z/this.cell)];
    for (let dz = -c; dz <= c; dz++) for (let dx = -c; dx <= c; dx++) {
      const b = this.buckets.get(`${bx+dx},${bz+dz}`);
      if (b) for (const e of b) out.push(e);
    }
    return out;
  }
}
```

Rebuild the grid each fixed step for moving entities — it's cheaper than incremental updates and avoids stale-bucket bugs.

## Procedural generation

**Everything derives from a seed.** A world you can't regenerate identically is a world you can't debug, can't share, and can't save cheaply.

```js
// Deterministic hash-based RNG — same input always gives same output
function rng(seed, x, z, salt = 0) {
  let h = seed ^ (x * 374761393) ^ (z * 668265263) ^ (salt * 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
```

Never use `Math.random()` in generation. Chunks must generate identically whether reached from the north or the south, and whether generated now or after a reload.

**Terrain**: layered value or simplex noise (`simplex-noise` on npm), typically 4–6 octaves. Use domain warping (offsetting sample coordinates by another noise field) to break up the characteristic smooth-blobby look that reads as "procedural". Apply a separate low-frequency noise as a biome mask rather than deriving biomes from height, or every mountain looks the same.

**Placement**: Poisson-disk sampling for natural-looking scatter of trees and rocks — pure random gives visible clumps and gaps. Seed the sampler per chunk so placement is deterministic and chunk-local.

**Chunk seams** are the classic bug. Sample noise in world space, never chunk-local space, and generate one row of overlap on each edge so normals at the boundary are computed with the neighbor's data. Otherwise you get visible lighting cracks at every chunk border.

**Hand-authored + procedural** beats pure procedural. Generate the base world, then overlay hand-placed points of interest from a data file. Pure procedural worlds feel empty because nothing is *intentional*.

## Draw call management at world scale

This is what actually limits how big your world can look.

- **InstancedMesh** for repeated geometry (trees, rocks, grass). One draw call for thousands of instances. Update `instanceMatrix` and set `needsUpdate`.
- **BatchedMesh** for many *different* static meshes sharing one material — it supports per-instance geometry with a single draw call, plus built-in frustum culling per sub-mesh.
- **Texture atlases** so batching is possible at all. Objects can only batch if they share a material, which means sharing a texture.
- **Frustum + distance culling** on chunks before individual objects. Culling a chunk removes hundreds of objects with one test.
- **Occlusion culling** is rarely worth it in WebGL. Better returns come from designing levels with natural occluders and streaming aggressively.

Target under 300 draw calls in view. Check with `renderer.info.render.calls` every frame during development and log a warning when it exceeds budget — you catch regressions the day they happen instead of a month later.

## Save and load

Because world data is separate and generation is seeded, saves stay small: store the seed plus a diff of everything that changed.

```js
const save = {
  version: 3,
  seed: 1234567,
  player: { pos: [x, y, z], rot: [...], inventory: [...] },
  modified: {              // only chunks the player altered
    '4,-2': { removed: [117, 208], added: [{ type: 'chest', pos: [...] }] },
  },
  flags: { questA: 'complete' },
};
```

Version the save format from the first save you ever write, and write a migration function per version bump. Retrofitting versioning after players have saves is painful.

Persist with IndexedDB (`idb-keyval` is a thin wrapper), not localStorage — localStorage is synchronous, ~5 MB, and blocks the main thread.

## Loading and first-run experience

Streaming solves the ongoing case; the first load still needs handling. Load in priority order: the player's immediate chunk and shell UI first, then the surrounding ring, then everything else in the background while the player is already playing. A game that's interactive in 3 seconds and still streaming beats one that's fully loaded in 20.

Warm up shaders during the loading screen with `await renderer.compileAsync(scene, camera)` — otherwise the first appearance of each new material causes a visible hitch mid-gameplay.

## Instrumentation

Build these on day one, not when things break:

- Frame time graph, split into simulate / stream / render
- Draw calls, triangles, active programs, texture memory
- Chunk state overlay: which are loaded, queued, unloading
- Entity count by component type
- A key to toggle physics debug rendering and BVH visualization
- A "teleport to coordinates" console command

Diagnosing a streaming stutter without these is guesswork. With them it takes a minute.

## Related skills

- `game-physics-rapier` — creating and destroying colliders in step with chunk streaming.
- `realtime-rendering-quality` — the visual layer, and where the frame budget goes.
- `game-asset-pipeline` — LODs, compression, and the manifest that streaming reads.

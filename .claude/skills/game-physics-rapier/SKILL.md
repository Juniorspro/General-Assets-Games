---
name: game-physics-rapier
description: Build physics for three.js web games with Rapier — rigid bodies, colliders, fixed-timestep simulation with render interpolation, kinematic character controllers, raycasts and queries, joints, vehicles, ragdolls, triggers, and collision filtering. Use this skill whenever the user needs collision, gravity, jumping, movement that respects walls, falling objects, destruction, vehicles, or ragdolls in a web game; whenever they mention Rapier, cannon-es, Ammo, or "physics engine"; and whenever something is jittering, tunneling through walls, sinking into the floor, feels floaty, or the simulation behaves differently at different framerates.
---

# Physics with Rapier

Rapier is the right default for web games: Rust compiled to WASM, deterministic given a fixed timestep, and much faster than cannon-es or Ammo at scale. Use `@dimforge/rapier3d-compat`, which bundles the WASM inline and avoids top-level-await build configuration.

```bash
npm i @dimforge/rapier3d-compat
```

```js
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();                       // must await before anything else
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
```

## The one thing that matters most: fixed timestep

Variable timestep physics is non-deterministic, framerate-dependent, and the root cause of most "it works on my machine" bugs. Step at a fixed rate, accumulate leftover time, and interpolate for rendering.

```js
const FIXED_DT = 1 / 60;
world.timestep = FIXED_DT;

let accumulator = 0;
const MAX_STEPS = 5;   // spiral-of-death guard

function frame(now) {
  const frameDelta = Math.min((now - last) / 1000, 0.25);
  last = now;
  accumulator += frameDelta;

  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_STEPS) {
    savePreviousTransforms();     // for interpolation
    world.step(eventQueue);
    drainEvents(eventQueue);
    accumulator -= FIXED_DT;
    steps++;
  }
  if (steps === MAX_STEPS) accumulator = 0;   // we fell behind; drop the debt

  const alpha = accumulator / FIXED_DT;
  syncGraphics(alpha);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
```

`syncGraphics` lerps position and slerps rotation between the previous and current physics transforms:

```js
function syncGraphics(alpha) {
  for (const e of entities) {
    const t = e.body.translation(), r = e.body.rotation();
    e.mesh.position.lerpVectors(e.prevPos, tmpVec.set(t.x, t.y, t.z), alpha);
    e.mesh.quaternion.slerpQuaternions(e.prevRot, tmpQuat.set(r.x, r.y, r.z, r.w), alpha);
  }
}
```

Without interpolation, a 60 Hz simulation on a 144 Hz display looks visibly steppy. This is the difference between "feels cheap" and "feels solid".

## Bodies and colliders

A rigid body is the simulated object; colliders are its shapes. One body can hold several colliders.

```js
// Dynamic — moved by forces
const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0, 5, 0)
  .setLinearDamping(0.1)
  .setCcdEnabled(true);              // for fast objects
const body = world.createRigidBody(bodyDesc);

const colDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)   // HALF-extents
  .setRestitution(0.3)
  .setFriction(0.8)
  .setDensity(1.0);
world.createCollider(colDesc, body);
```

Note cuboid takes **half-extents** — `cuboid(0.5, 0.5, 0.5)` is a 1×1×1 cube. Getting this wrong is the most common first bug.

Body types:
- **dynamic** — full simulation. Use for props, debris, vehicles.
- **fixed** — immovable. Use for terrain, walls, static geometry.
- **kinematicPositionBased** — you set the position, it pushes dynamics. Use for character controllers, moving platforms, elevators.
- **kinematicVelocityBased** — you set velocity, it integrates. Convenient for constant-motion platforms.

Never move a dynamic body by setting its translation directly; that teleports it and breaks contacts. Use forces, impulses, or make it kinematic.

**Collider shape choice, in cost order:** ball < cuboid < capsule < cylinder/cone < convex hull < trimesh. Use a trimesh only for static geometry — trimesh-vs-trimesh collision doesn't work and trimesh dynamic bodies are unreliable. For dynamic complex shapes, use `convexDecomposition` or approximate with several primitives.

Building a trimesh collider from loaded level geometry:

```js
const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
const verts = g.attributes.position.array;
const idx = g.index.array;
world.createCollider(RAPIER.ColliderDesc.trimesh(verts, idx));
```

## Character controller

Don't build the player as a dynamic capsule — it tips over, sticks to walls, and can't be tuned to feel good. Use Rapier's kinematic character controller.

```js
const controller = world.createCharacterController(0.01);  // collision offset
controller.enableAutostep(0.5, 0.2, true);   // maxHeight, minWidth, dynamicBodies
controller.enableSnapToGround(0.5);          // keeps you glued going downhill
controller.setApplyImpulsesToDynamicBodies(true);
controller.setSlideEnabled(true);
controller.setMaxSlopeClimbAngle(50 * Math.PI / 180);
controller.setMinSlopeSlideAngle(35 * Math.PI / 180);

// Each fixed step:
const desired = { x: moveX * speed * dt, y: velocityY * dt, z: moveZ * speed * dt };
controller.computeColliderMovement(playerCollider, desired);
const applied = controller.computedMovement();
const p = playerBody.translation();
playerBody.setNextKinematicTranslation({
  x: p.x + applied.x, y: p.y + applied.y, z: p.z + applied.z
});

const grounded = controller.computedGrounded();
if (grounded && velocityY < 0) velocityY = -1;   // small downward bias keeps snap working
else velocityY -= 25 * dt;                        // gravity; tune independently of world gravity
```

**Movement feel is tuned, not physical.** Real gravity (9.81) feels floaty in games. Use 20–30 for gravity, then set jump velocity from the height you want: `v = sqrt(2 * g * jumpHeight)`. Add coyote time (~0.12s of grace after leaving ground) and jump buffering (~0.15s of remembered input before landing). These two make jumping feel responsive more than anything else.

Use a **capsule** collider for the player, radius ~0.3, half-height ~0.6 for a 1.8 m character. Capsules slide over steps and edges; boxes catch on everything.

## Queries

```js
// Raycast
const ray = new RAPIER.Ray({ x: 0, y: 2, z: 0 }, { x: 0, y: -1, z: 0 });
const hit = world.castRay(ray, 100, true, undefined, undefined, undefined, playerBody);
if (hit) {
  const point = ray.pointAt(hit.timeOfImpact);
  const collider = hit.collider;
}

// Shapecast — better for "can I move here"
const shapeHit = world.castShape(pos, rot, velocity, shape, 0, maxToi, true);

// Overlap sphere — for explosions, AoE
world.intersectionsWithShape(center, rot, new RAPIER.Ball(5.0), (collider) => {
  applyExplosionForce(collider);
  return true;  // continue
});
```

Pass the excluded body as the last argument to `castRay` or you will constantly hit yourself.

## Events, triggers, and filtering

```js
const eventQueue = new RAPIER.EventQueue(true);
world.step(eventQueue);

eventQueue.drainCollisionEvents((h1, h2, started) => {
  const a = world.getCollider(h1), b = world.getCollider(h2);
  if (started) onCollisionStart(a, b);
});
eventQueue.drainContactForceEvents((event) => {
  if (event.totalForceMagnitude() > 500) playImpactSound();
});
```

Enable events per collider — they're off by default:

```js
colDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
colDesc.setSensor(true);   // trigger volume: detects, doesn't block
```

**Collision groups** are a 32-bit value: upper 16 bits are the collider's membership, lower 16 are what it collides with.

```js
const GROUP = { PLAYER: 0x0001, ENEMY: 0x0002, TERRAIN: 0x0004, PICKUP: 0x0008 };
// Player belongs to PLAYER, collides with TERRAIN | ENEMY
colDesc.setCollisionGroups((GROUP.PLAYER << 16) | (GROUP.TERRAIN | GROUP.ENEMY));
```

Get this wrong and pickups block movement or bullets hit their shooter.

## Joints

```js
// Revolute — hinge (doors, wheels)
world.createImpulseJoint(
  RAPIER.JointData.revolute({x:0,y:0,z:0}, {x:0,y:1,z:0}, {x:0,y:1,z:0}),
  bodyA, bodyB, true);

// Spherical — ragdoll limbs
RAPIER.JointData.spherical({x:0,y:-0.5,z:0}, {x:0,y:0.5,z:0});
// Fixed — weldable breakable connections
RAPIER.JointData.fixed(a1, r1, a2, r2);
```

**Ragdolls**: one capsule per limb segment, spherical joints at articulations, with joint limits set — an unlimited ragdoll flails like a rubber toy. Build the ragdoll bodies to match the character's bone transforms at the moment of activation, then read body transforms back onto bones each frame instead of running the mixer.

**Vehicles**: use `DynamicRayCastVehicleController` rather than simulating wheels as bodies. Ray-cast wheels are stable, tunable, and what shipped games use.

## Performance

- Static geometry should be `fixed` bodies, never dynamic with zero velocity.
- Rapier auto-sleeps resting bodies. Don't defeat this by applying tiny forces every frame.
- Fewer, larger colliders beat many small ones. Merge static level collision into a handful of trimeshes.
- CCD is expensive — enable only on genuinely fast objects (projectiles), not on everything.
- Beyond ~1000 active dynamic bodies, move the world into a Web Worker and post transforms back via a `SharedArrayBuffer` or transferable `Float32Array`. Keep the render thread free.

## Debug rendering

Indispensable, and often the fastest path to seeing the bug:

```js
const { vertices, colors } = world.debugRender();
debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
debugLines.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
```

Bind it to a key. When collision "doesn't work", the collider is usually somewhere other than where the mesh is.

## Diagnosing common failures

| Symptom | Cause |
|---|---|
| Objects jitter at rest | Variable timestep, or colliders overlapping at spawn |
| Fast objects pass through walls | CCD off, or timestep too large |
| Character sinks into floor | Collision offset too small, or capsule half-height wrong |
| Character sticks to walls | Slide disabled, or using a box instead of a capsule |
| Character floats down stairs | Snap-to-ground distance too short |
| Simulation differs across machines | Not using a fixed timestep |
| Everything is slow motion | Passing milliseconds where seconds are expected |

## Related skills

- `threejs-animation` — driving character visuals from controller state; run the mixer on render delta, not physics delta.
- `open-world-streaming` — creating and destroying colliders as chunks load.

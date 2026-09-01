---
name: threejs-animation
description: Build character and object animation systems in three.js for web games — skeletal animation with AnimationMixer, crossfade and additive blending, animation state machines, root motion, IK, retargeting rigs between skeletons, and procedural/secondary motion. Use this skill whenever the user is animating anything in a three.js or React Three Fiber project — characters walking or running, blending between clips, "my animation snaps/pops/slides", foot sliding, aiming or look-at, ragdoll-to-animation transitions, GLTF/FBX rigs, Mixamo animations, or driving a character controller's visuals. Also use it when they mention animation performance with many characters on screen.
---

# Animation systems in three.js

Animation is where web games most often look cheap. The fix is almost never a better model — it is blending, timing, and the transitions between states. Build the state machine first, then the clips.

## Core loop

`AnimationMixer` is per-animated-object, not global. One mixer per character instance.

```js
import * as THREE from 'three';

const mixer = new THREE.AnimationMixer(gltf.scene);
const actions = new Map();
for (const clip of gltf.animations) {
  const action = mixer.clipAction(clip);
  actions.set(clip.name, action);
}

// In the render loop — always feed it real delta seconds
mixer.update(delta);
```

Feed `mixer.update()` the *render* delta, not the fixed physics delta. Physics steps at a fixed rate; animation should run at display rate so it looks smooth. If you interpolate physics transforms for rendering (see the `game-physics-rapier` skill), update the mixer after applying the interpolated transform.

## Never snap between clips — always crossfade

The single biggest quality difference. `action.play()` on its own produces a pop.

```js
function playAction(name, fadeSeconds = 0.2) {
  const next = actions.get(name);
  if (!next || next === current) return;
  next.reset();
  next.setEffectiveTimeScale(1);
  next.setEffectiveWeight(1);
  next.play();
  if (current) current.crossFadeTo(next, fadeSeconds, false);
  current = next;
}
```

Fade durations that read well: 0.1–0.15s for reactive changes (idle→run when input arrives), 0.25–0.4s for relaxed changes (run→idle), 0.05s for hit reactions. Longer than ~0.5s feels like mud.

### Synchronized crossfade for locomotion

Blending run→walk without syncing phase makes the feet stutter. Match the normalized time before fading:

```js
function syncedFade(from, to, duration) {
  const ratio = to.getClip().duration / from.getClip().duration;
  to.time = from.time * ratio;
  from.crossFadeTo(to, duration, true); // warping = true
}
```

## Blend by speed, not by if/else

For locomotion, a 1D blend on speed beats discrete states. Run idle/walk/run simultaneously and weight them:

```js
function setLocomotion(speed, walkSpeed = 1.8, runSpeed = 5.0) {
  let wIdle = 0, wWalk = 0, wRun = 0;
  if (speed <= 0.01) {
    wIdle = 1;
  } else if (speed < walkSpeed) {
    wWalk = speed / walkSpeed;
    wIdle = 1 - wWalk;
  } else {
    wRun = Math.min(1, (speed - walkSpeed) / (runSpeed - walkSpeed));
    wWalk = 1 - wRun;
  }
  actions.get('Idle').setEffectiveWeight(wIdle);
  actions.get('Walk').setEffectiveWeight(wWalk);
  actions.get('Run').setEffectiveWeight(wRun);
  // Keep clip phase aligned so feet don't fight each other
  const t = actions.get('Walk').time;
  actions.get('Run').time = t * (runClipDur / walkClipDur);
}
```

All three actions stay `.play()`ed permanently; only weights change.

## Additive layers for upper body

Aiming, leaning, breathing, and reacting should ride *on top* of locomotion rather than replacing it. Convert a clip to additive, then blend it in:

```js
const aimClip = THREE.AnimationUtils.makeClipAdditive(rawAimClip);
const aimAction = mixer.clipAction(aimClip);
aimAction.blendMode = THREE.AdditiveAnimationBlendMode;
aimAction.play();
aimAction.setEffectiveWeight(isAiming ? 1 : 0);
```

`makeClipAdditive` subtracts a reference pose (frame 0 by default) from every frame, so what's left is the *difference*. The source clip must be authored from the same base pose as the locomotion, or the result twists.

To restrict an additive layer to the upper body, either author it that way, or filter tracks by bone name when constructing the clip:

```js
const upperBones = new Set(['Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']);

const upperOnly = new THREE.AnimationClip(
  clip.name + '_upper',
  clip.duration,
  clip.tracks.filter(t => upperBones.has(t.name.split('.')[0]))
);
```

## Animation state machine

Keep animation state separate from gameplay state. Gameplay decides "is grounded, speed 4.2, is attacking"; the animation layer maps that to clips. Mixing them creates bugs you can't reason about.

```js
class AnimationStateMachine {
  constructor(mixer, actions) {
    this.mixer = mixer; this.actions = actions;
    this.state = 'idle'; this.locked = false;
  }

  // states: { name: { clip, loop, fade, lockUntilFinish, next } }
  request(name) {
    if (this.locked) return false;      // one-shots own the body until done
    if (name === this.state) return true;
    const def = this.states[name];
    playAction(def.clip, def.fade ?? 0.2);
    if (def.loop === false) {
      const a = this.actions.get(def.clip);
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      if (def.lockUntilFinish) this.locked = true;
    }
    this.state = name;
    return true;
  }

  init() {
    this.mixer.addEventListener('finished', (e) => {
      this.locked = false;
      const def = this.states[this.state];
      if (def?.next) this.request(def.next);
    });
  }
}
```

`clampWhenFinished = true` plus `LoopOnce` holds the last frame instead of snapping back to the bind pose — without it, one-shot attacks flick to T-pose for a frame.

## Root motion

Mixamo and most libraries bake forward movement into the hips track. If your physics controller also moves the body, the character slides or double-moves. Two options:

**Strip it** (simplest, works with a physics character controller):

```js
function stripRootMotion(clip, rootName = 'mixamorigHips') {
  const track = clip.tracks.find(t => t.name === `${rootName}.position`);
  if (!track) return clip;
  const v = track.values;
  // Freeze horizontal, keep vertical bob
  for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; }
  return clip;
}
```

**Extract and drive it** (better fidelity, harder): read the hips delta each frame, feed it to the controller as desired velocity, then zero it on the visual. Do this only if the animation set was authored for it.

Foot sliding after stripping means the clip's authored speed doesn't match your movement speed. Fix by scaling `action.setEffectiveTimeScale(actualSpeed / clipAuthoredSpeed)` rather than by tweaking the movement speed.

## Retargeting between skeletons

To reuse one animation library across characters with different rigs, use `SkeletonUtils`:

```js
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Cloning a skinned character correctly (plain .clone() breaks skinning)
const instance = SkeletonUtils.clone(gltf.scene);

// Retargeting a clip authored on sourceSkeleton onto targetModel
const retargeted = SkeletonUtils.retargetClip(targetModel, sourceModel, clip, {
  hip: 'mixamorigHips',
  names: { 'mixamorigSpine': 'spine_01' /* map differing bone names */ },
});
```

Retargeting works cleanly when both rigs share bone orientation conventions and roughly proportional limb lengths. If limb proportions differ a lot, hands will miss their marks and you need IK correction on top.

Practical rule: standardize on one skeleton (Mixamo's is a reasonable default because so much content targets it) and generate all characters against it. Retarget only when you can't.

## Inverse kinematics

Use IK for the things that must *touch* the world: feet on uneven ground, hands on a ladder or steering wheel, head look-at.

```js
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';

const iks = [{
  target: targetBoneIndex,
  effector: footBoneIndex,
  links: [
    { index: calfIndex, rotationMin: new THREE.Vector3(-2.2, 0, 0),
                        rotationMax: new THREE.Vector3(0, 0, 0) },   // knee hinge only
    { index: thighIndex },
  ],
  iteration: 8,
  minAngle: 0.0, maxAngle: 1.0,
}];
const solver = new CCDIKSolver(skinnedMesh, iks);
// after mixer.update(), before render
solver.update();
```

Constrain the knee and elbow to a single rotation axis or you get bones bending backwards. Order matters: run the mixer first, then IK, then render — IK corrects the animated pose.

**Foot planting** is the highest-value IK use. Raycast down from each foot bone each frame, and if the ground is higher than the animated foot, raise the IK target to the hit point and lower the hips by the larger of the two corrections. Smooth the hip offset over ~0.1s or it jitters.

Head look-at is cheaper without IK: clamp a direct quaternion rotation on the neck and head bones toward the target, applied after `mixer.update()`, weighted so it fades out beyond ~110 degrees.

## Procedural secondary motion

Cheap and disproportionately effective:

- **Spring bones** for hair, cloth, antennae, tails. Store a target position per bone, integrate toward it with a damped spring, and rotate the bone to point at the result. Two or three bones per chain is enough.
- **Camera-relative lean** on turns: add a small roll to the spine proportional to angular velocity.
- **Breathing**: a slow sine on chest scale or spine rotation, weight ~0.02. Invisible until you turn it off.
- **Impact shake**: on landing, drive a decaying sine into the hip Y offset.

These sell "alive" far more than higher-poly models.

## Performance with many characters

- Reuse `AnimationClip` objects across instances. Clips are immutable data; mixers are the per-instance state. Never re-parse.
- Beyond ~30 skinned characters, skinning cost dominates. Drop distant characters to a lower LOD mesh with fewer bones, and reduce their mixer update rate: update every 2nd or 3rd frame with an accumulated delta.
- Cull mixer updates entirely for characters outside the frustum plus a margin, but keep a timer so their animation phase advances — otherwise they pop when re-entering view.
- `THREE.BatchedMesh` does not skin. For crowds, either bake animation into a vertex-texture (VAT) and use `InstancedMesh`, or accept the skinned cost for a limited count.

## Debugging checklist

When an animation "doesn't work", check in this order:

1. Is `mixer.update(delta)` being called with seconds, not milliseconds?
2. Does `gltf.animations` actually contain clips? Log the names — exporters rename them.
3. Do track names match bone names in the loaded model? A retarget or a renamed root breaks every track silently.
4. Was the model cloned with `SkeletonUtils.clone` rather than `.clone()`?
5. Is another action still at weight > 0 fighting the one you want?

## Related skills

- `game-physics-rapier` — the controller that decides *where* the character is; this skill decides how it looks getting there.
- `game-asset-pipeline` — getting rigged, animated GLTFs in and optimized.

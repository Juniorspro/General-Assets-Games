---
name: analog-horror-vhs
description: Production-ready VHS / analog-horror / found-footage / Backrooms rendering for browser-first Three.js games. Use for horror games needing realistic VHS simulation (scanlines, chromatic aberration, tape tracking artifacts, temporal grain, fisheye, vignette, bloom, exposure adaptation, color grading), handheld camera realism, screen-space refraction "entities", fluorescent Backrooms environments, ECS + Rapier architecture, and mobile optimization. Built on the studied repos pmndrs/postprocessing (v6.39) and drcmda/the-substance.
---

# Analog Horror / VHS Rendering Pipeline

Distilled from **pmndrs/postprocessing v6.39** and **drcmda/the-substance**. Apply on
every horror/Backrooms/found-footage task. Favor immersion *and* performance equally.

## 1. Dependencies & version matrix (IMPORTANT)

`pmndrs/postprocessing@6.39` declares `peerDependencies.three: ">=0.168.0 <0.185.0"`.
Do **not** pair it with three 0.160 (older game files in this repo). Target three **0.170.x**.

Single-file / browser importmap (CDN, ESM):
```html
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
  "postprocessing": "https://cdn.jsdelivr.net/npm/postprocessing@6.39.1/build/index.js",
  "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/+esm"
}}</script>
```
npm equivalent: `three@^0.170 postprocessing@^6.39 @dimforge/rapier3d-compat`.

## 2. Why pmndrs/postprocessing over three's stock EffectComposer

**`EffectPass` merges many `Effect`s into ONE fullscreen shader pass.** Three's stock
postprocessing runs one full-screen draw *per* pass. For a VHS stack of 8+ effects this is
the single biggest mobile win — ~1 pass instead of ~8. Always group color-domain effects
into a single `EffectPass`.

Each `Effect` exposes two optional GLSL hooks that the EffectPass concatenates:
- `void mainUv(inout vec2 uv)` — UV-domain warp (lens distortion, tape jitter). Runs first.
- `void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)` — color domain.
- `time` uniform is injected automatically (used for temporal grain/scanline scroll).

**Merge rule:** an effect tagged `EffectAttribute.CONVOLUTION` reads neighbour texels and
**cannot share an EffectPass with another convolution effect** — it gets its own pass.
`ChromaticAberrationEffect` is CONVOLUTION. Consequences:
- On mid/high tier: one EffectPass for CA (convolution) + one EffectPass for the rest.
- On low tier: skip the standalone CA effect and fold a cheap 3-tap RGB split into the
  custom VHS shader's `mainImage` (no extra pass).

## 3. Effect → visual-standard mapping (all stock except the custom VHS effect)

| Standard | Effect | Recommended params |
|---|---|---|
| Mild fisheye (5–10%) | `LensDistortionEffect` | `distortion: new Vector2(0.06, 0.06)` (radial barrel) |
| Chromatic aberration | `ChromaticAberrationEffect` | `offset: Vector2(8e-4,4e-4)`, `radialModulation:true`, `modulationOffset:0.15` (stronger at edges) |
| Scanlines | `ScanlineEffect` | `density: 1.25`, `scrollSpeed: 0.02`, blend OVERLAY |
| Temporal film grain | `NoiseEffect` | blend SCREEN, `premultiply:true` (grain rides luminance). Animated via injected `time` |
| Vignette | `VignetteEffect` | `offset: 0.3`, `darkness: 0.85` |
| Bloom (fluorescent glow) | `BloomEffect` (mipmap) | `intensity: 0.6`, `luminanceThreshold: 0.7`, `mipmapBlur:true` (cheap). Use `SelectiveBloomEffect` for emissive-only |
| Exposure adaptation | `ToneMappingEffect` | `mode: ToneMappingMode.REINHARD2_ADAPTIVE`, `adaptationRate: 1.0`, `resolution: 256` — optic-nerve light adaptation when entering bright/dark rooms |
| Color grading | `ToneMappingMode.AGX` (filmic) or `LUT3DEffect` (.cube), + `HueSaturationEffect` / `BrightnessContrastEffect` | sickly green/teal Backrooms grade |
| VHS tracking artifacts | `GlitchEffect` | `delay:Vector2(4,9)`, `duration:Vector2(0.2,0.5)`, `columns:0.04`, can drive a `ChromaticAberrationEffect.offset` |
| Low-res / quantized color | `PixelationEffect` (granularity ~3) or `ColorDepthEffect` (`bits: 16`) | VHS chroma subsampling feel |

Recommended EffectPass order (single pass unless CONVOLUTION forces a split):
`LensDistortion (mainUv)` → custom VHS (mainUv tape jitter + mainImage tape noise) →
`Scanline` → `Noise` → `Vignette` → `ToneMapping` → grading. Bloom/CA as their own passes.

## 4. Custom VHS effect (write one — more authentic than stacking generics)

Subclass `Effect` and put authentic tape behavior in a single shader so it merges into the
main EffectPass (no extra draw call). Cover what stock effects miss:
- `mainUv`: horizontal **tape jitter** (per-scanline `sin/hash` offset), vertical **roll/tracking**
  drift, and a **head-switching** torn band in the bottom ~6% of the frame.
- `mainImage`: **luma/chroma bleed** (sample slightly offset for R/B), dropout streaks,
  occasional white tracking noise lines, and dark "ringing" after high-contrast edges.

Skeleton:
```js
import { Effect } from "postprocessing";
import { Uniform } from "three";
const frag = /* glsl */`
  uniform float intensity; uniform float tracking;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void mainUv(inout vec2 uv){
    float line = floor(uv.y*240.0);
    float jitter = (hash(vec2(line, floor(time*24.0)))-0.5) * 0.004 * tracking;
    uv.x += jitter;
    if(uv.y < 0.06){ uv.x += (hash(vec2(time))-0.5)*0.05*tracking; } // head-switch band
  }
  void mainImage(const in vec4 c, const in vec2 uv, out vec4 o){
    float o2 = 0.0015*intensity;
    float r = texture2D(inputBuffer, uv+vec2(o2,0.0)).r;
    float b = texture2D(inputBuffer, uv-vec2(o2,0.0)).b;
    vec3 col = vec3(r, c.g, b);
    float n = hash(uv*vec2(2.0,400.0)+time);
    col += step(0.995, n) * 0.6 * intensity;            // white tracking specks
    o = vec4(col, c.a);
  }`;
export class VHSEffect extends Effect {
  constructor({ intensity = 1, tracking = 1 } = {}) {
    super("VHSEffect", frag, { uniforms: new Map([
      ["intensity", new Uniform(intensity)], ["tracking", new Uniform(tracking)] ]) });
  }
}
```
(`inputBuffer` and `time` are provided by EffectPass.) Drive `tracking` up briefly on
scares/teleports for a tape-dropout spike.

## 5. Motion blur & tape ghosting (gap in pp v6)

pp v6 ships no velocity motion-blur effect. Two browser-cheap options, both fitting VHS:
1. **Frame-feedback ghosting** (preferred for VHS): keep an accumulation `WebGLRenderTarget`,
   each frame blend current result over previous at ~0.12 — authentic tape smear/trailing,
   ~free. Implement as a tiny custom Pass with a `CopyPass`-style blend.
2. **Camera-velocity directional blur**: pass camera delta to a small custom `Effect`,
   blur a few taps along screen-space velocity. Tier-gate to high only.

## 6. Screen-space refraction "entity" (ported from the-substance)

the-substance's reusable gem is a **two-pass refraction** for glass/heat-haze/an analog
"substance" creature. Port the *technique* to modern three (its code is three r0.111/r3f-beta):
1. Render scene/env to `envFbo`.
2. Put the refractor on its own **layer**; render its **backfaces** (a `BackfaceMaterial`
   writing view-space normals) into `backfaceFbo`.
3. Render scene to screen; then render the refractor with a `RefractionMaterial` that samples
   `envFbo` at `uv + refract(viewDir, normal, ior)`, where `normal` blends front normal with
   the backface normal (thickness approx), plus a Fresnel rim.
Orchestration: `renderer.autoClear=false`, `camera.layers.set(...)`, manual
`setRenderTarget`/`clearDepth`. Material supports `#ifdef USE_INSTANCING` (`instanceMatrix`)
→ many refractive shards in one draw. Horror uses: invisible-but-refractive stalker,
wet camera lens, window/glass, shimmering air near the threat.

## 7. Handheld camera realism (CameraRig)

- **Breathing**: low-freq sine on pitch + eye height (~0.15 Hz).
- **Handheld shake**: layered value-noise on yaw/pitch/roll (small amplitude), amplitude scales
  with movement and with fear/sprint state.
- **Step bob + banking**: reuse the walk-cycle bob; add slight roll when strafing.
- **Subtle DOF** (`DepthOfFieldEffect`, high tier only) + **frame-feedback ghosting** sells
  "camcorder". Keep amplitudes small — readability first.

## 8. Mobile tiering (detect tier; scale the stack)

| | low | medium | high |
|---|---|---|---|
| DPR cap | 1.25 | 1.6 | 2.0 |
| CA | folded into VHS shader | standalone CONVOLUTION pass | standalone |
| Bloom | mipmap, half-res | mipmap | mipmap + selective |
| Adaptive tone-map | off (static AgX) | on | on |
| Glitch / refraction entity | off | light | on |
| Frame-feedback ghosting | off | optional | on |

General: cap DPR; minimize draw calls (single EffectPass); instance everything; GLTF assets;
pause RAF when `document.hidden`.

## 9. ECS integration (reusable patterns)

- `PostFxSystem` — owns the `EffectComposer`, the `EffectPass`(es), and a `VHSParams`
  singleton component (intensity, tracking, grade). Other systems mutate `VHSParams`.
- `CameraRigSystem` — reads `Velocity`/`Fear` components, writes camera shake/bob/roll.
- `FlickerSystem` — drives fluorescent light flicker (see §10) via `Light` + `Flicker` components.
- `RenderSystem` runs last; physics via Rapier in a fixed-timestep `PhysicsSystem`.
- Keep effects data-driven: a `Scare` event spikes `VHSParams.tracking` + glitch + audio.

## 10. Backrooms environment standards

- **Modular tiles** (wall/floor/ceiling/light/door) as GLTF, placed on a grid and **instanced**
  per mesh type → few draw calls for huge mazes. Realistic scale (~3 m ceilings, 1 m doors).
- **Fluorescent lighting**: emissive ceiling panels + a few real lights; `FlickerSystem`
  randomly dims/buzzes them; pair with `SelectiveBloom` on the emissive panels. Sickly
  yellow-green color (~#d8d6a0) + AgX/LUT grade. Buzzing audio loop.
- **Low-res environmental textures**: small (128–256px) tileable albedo with strong tiling —
  the VHS pass + grain hides the low res and *adds* to the aesthetic.
- **Found-footage presentation**: REC ●, timestamp/tape counter overlay (HTML DOM, cheap),
  battery icon, occasional autofocus hunt (DOF pulse) + tracking spike.
- **Rapier**: kinematic character controller for the player; static colliders from tile
  bounds (or trimesh on the merged level); keep colliders simple (boxes) for mobile.

## 11. Checklist before shipping horror code
- [ ] three 0.170.x paired with postprocessing 6.39.
- [ ] Color-domain effects merged into ONE EffectPass; CA/bloom split only as needed.
- [ ] Custom VHS effect present (jitter + head-switch + chroma bleed), tracking spikes on scares.
- [ ] Exposure adaptation via REINHARD2_ADAPTIVE; AgX/LUT grade.
- [ ] Handheld shake + bob + (high) ghosting; amplitudes keep the scene readable.
- [ ] Instanced modular tiles, GLTF, capped DPR, tiered stack, RAF pause on hidden.
- [ ] Explain each technical decision in the delivery.

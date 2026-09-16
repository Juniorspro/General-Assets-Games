---
name: realtime-rendering-quality
description: Push three.js rendering toward AAA visual quality — correct color management and tone mapping, physically-based lighting with HDRI environments, shadow tuning, and a postprocessing stack with bloom, SSAO, screen-space reflections, depth of field, motion blur, and antialiasing, plus the performance budget to afford it. Use this skill whenever the user says their game or scene looks flat, plasticky, washed out, blown out, "like a prototype", or wants it to look cinematic, realistic, next-gen, or AAA; whenever they mention postprocessing, bloom, ambient occlusion, reflections, HDRI, tone mapping, PBR materials, or shadow quality; and whenever they're deciding between WebGL and WebGPU or chasing frame rate after adding effects.
---

# Making a three.js game look expensive

Visual quality is mostly lighting and post, not polygons. A 5k-triangle prop under correct lighting with a good post stack beats a 200k-triangle one under a default `DirectionalLight`. Work in this order: color pipeline, then lighting, then materials, then post. Fixing post before color is painting over a broken base.

## 1. Color pipeline — do this first

Nothing else looks right until this is correct. Most "my scene looks washed out / muddy" complaints are here.

```js
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
```

`antialias: false` is deliberate — with a postprocessing stack, MSAA on the default framebuffer does nothing, and you'll use SMAA or TAA instead.

**Tone mapping choice:** ACES Filmic is the safe cinematic default — it rolls off highlights instead of clipping them to white. `AgXToneMapping` (three r16x+) desaturates highlights less aggressively and is the better choice for scenes with saturated lights. `NoToneMapping` for stylized/flat looks. Never leave it on `LinearToneMapping` for a realistic game; bright areas clip to flat white.

**Texture color spaces** must be set per-map, and getting one wrong is invisible until it isn't:

- `map`, `emissiveMap`, `specularColorMap` → `THREE.SRGBColorSpace`
- `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`, `displacementMap` → `THREE.NoColorSpace`

GLTFLoader handles this. Manually-loaded textures do not — a normal map loaded as sRGB produces subtly wrong, over-contrasted shading.

## 2. Lighting — the environment does the heavy lifting

The largest single quality jump in any three.js scene is replacing ambient light with an HDRI environment. `AmbientLight` adds flat uniform light with no directionality; an environment map provides directional ambient, correct reflections, and grounding all at once.

```js
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const hdr = await new RGBELoader().loadAsync('/env/studio_1k.hdr');
const envMap = pmrem.fromEquirectangular(hdr).texture;
scene.environment = envMap;              // lights everything
scene.background = envMap;               // optional — or use a separate sky
scene.environmentIntensity = 1.0;
hdr.dispose(); pmrem.dispose();
```

Free HDRIs from Poly Haven. A 1k HDRI is plenty for lighting; use 2k–4k only if it's also the visible background. Convert to `.hdr` or compress to KTX2 — a 4k HDR is 30 MB unoptimized.

**Delete every `AmbientLight` in the scene once you have an environment.** They fight each other and flatten everything.

A three-light setup on top of the environment, for characters and hero props:

```js
const key = new THREE.DirectionalLight(0xfff4e6, 3.0);   // warm, casts shadows
key.position.set(5, 8, 3);
const fill = new THREE.DirectionalLight(0xc9d9ff, 0.6);  // cool, no shadow
fill.position.set(-4, 2, -2);
const rim = new THREE.DirectionalLight(0xffffff, 2.0);   // separates from background
rim.position.set(-2, 4, -6);
```

Lights in three.js are physically-based since r155, so intensities read differently than older tutorials suggest. `DirectionalLight` intensity is in lux-like units; values of 2–5 are normal for a sun. Point and spot lights use candela and fall off with distance squared, so they need much larger numbers than you'd expect (hundreds).

## 3. Shadows — tuned, not just enabled

Default shadows are the second-biggest tell of an amateur scene: blocky, detached, or covering everything in acne.

```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;        // fixes acne better than bias alone
key.shadow.camera.near = 1;
key.shadow.camera.far = 60;
// Fit the ortho box TIGHTLY around what actually needs shadows
key.shadow.camera.left = -25; key.shadow.camera.right = 25;
key.shadow.camera.top = 25;   key.shadow.camera.bottom = -25;
key.shadow.camera.updateProjectionMatrix();
```

Shadow resolution is spread across the shadow camera's box. A box twice as large halves your effective resolution. Fit it to the visible area, not the whole world.

For large outdoor scenes, one shadow map cannot cover both near and far. Use **cascaded shadow maps** (`three-csm` on npm) with 3–4 cascades — near cascade tight and sharp, far cascade broad and soft. This is what makes open-world lighting hold up.

Contact hardening matters: shadows should be sharp where objects touch the ground and soften with distance. `VSMShadowMap` gives softness but leaks light; PCF with a small radius plus SSAO for contact darkening is the more reliable combination.

Bake static shadows where you can. A static building casting a dynamic shadow every frame is pure waste — bake it to a lightmap and reserve dynamic shadows for moving objects.

## 4. Materials

`MeshStandardMaterial` is correct for most things. `MeshPhysicalMaterial` adds clearcoat, transmission, sheen, and iridescence at real cost — use it only where those features are visible.

Values that look right:

| Surface | metalness | roughness | Notes |
|---|---|---|---|
| Polished metal | 1.0 | 0.1–0.25 | Needs an environment map or it looks black |
| Worn metal | 1.0 | 0.4–0.6 | Roughness variation is what sells wear |
| Plastic | 0.0 | 0.3–0.5 | |
| Painted wood | 0.0 | 0.6–0.8 | |
| Skin | 0.0 | 0.5–0.6 | Add subtle sheen or subsurface if available |
| Fabric | 0.0 | 0.8–0.95 | `MeshPhysicalMaterial.sheen` helps a lot |

**Metalness is binary in reality** — a surface is metal or it isn't. Values between 0.1 and 0.9 are almost always a mistake, except at transition edges in a texture.

The thing that separates good materials from flat ones is **roughness variation**. A uniform roughness value reads as CG immediately. Even a cheap noise texture driving roughness between 0.35 and 0.55 transforms a surface. This costs almost nothing and matters more than resolution.

## 5. Postprocessing stack

Use the `postprocessing` package (pmndrs), not three's `EffectComposer` examples — it merges effects into fewer passes, which is dramatically faster.

```bash
npm i postprocessing
```

```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect,
         ToneMappingEffect, ToneMappingMode, VignetteEffect, NoiseEffect,
         BlendFunction } from 'postprocessing';

const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType,     // required for HDR bloom
});
composer.addPass(new RenderPass(scene, camera));

const bloom = new BloomEffect({
  intensity: 0.6,
  luminanceThreshold: 0.85,
  luminanceSmoothing: 0.3,
  mipmapBlur: true,
});

composer.addPass(new EffectPass(camera,
  bloom,
  new VignetteEffect({ darkness: 0.35, offset: 0.3 }),
  new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: true }),
  new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
  new SMAAEffect(),
));

// Replace renderer.render with:
composer.render(delta);
```

When tone mapping happens in the composer, set `renderer.toneMapping = THREE.NoToneMapping` so it isn't applied twice.

**Effect priorities, highest value first:**

1. **Bloom** — cheap, immediately cinematic. Keep the threshold high (0.8+) so only genuinely bright things glow. Low thresholds produce the hazy "everything is glowing" look that reads as amateur.
2. **SSAO / GTAO** — grounds objects, adds contact shadows, adds perceived depth. `N8AO` (npm `n8ao`) is faster and better-looking than the built-in SSAO. This is the second-biggest quality jump after HDRI lighting.
3. **Antialiasing** — SMAA for still-heavy scenes, TAA if you have motion vectors and want the best result. Without AA, everything looks like a 2005 web demo.
4. **Depth of field** — powerful for cinematics and menus, risky in gameplay (players hate blurry gameplay). Use a shallow effect or reserve it for cutscenes.
5. **Screen-space reflections** — expensive and artifact-prone (things off-screen don't reflect). Often a cube-map probe or a simple reflective floor gives 80% of the look for 10% of the cost.
6. **Motion blur / chromatic aberration / film grain** — subtle amounts only. Grain at very low intensity hides banding and unifies the image, which is why almost every shipped game has it.

**Noise and grain are underrated.** A tiny amount of overlay noise breaks up gradient banding in skies and dark areas, and makes the whole frame read as photographic rather than synthetic.

## 6. The performance budget

Every effect above costs frame time. Measure before and after each addition — `stats.js` plus `renderer.info` (draw calls, triangles, programs).

Targets for a 60 fps web game: **16.6 ms total**, roughly 8 ms scene render, 4 ms post, 2 ms physics, 2 ms logic.

Where frame time actually goes, in order of usual severity:

- **Draw calls.** Under 300 is comfortable, 1000+ is trouble. Merge static geometry, use `InstancedMesh` for repeats, `BatchedMesh` for varied static meshes sharing a material. This dominates on low-end hardware.
- **Overdraw from transparency.** Transparent objects can't z-cull. A few full-screen transparent layers will halve your framerate. Prefer alpha-test (`alphaTest: 0.5`, `transparent: false`) for foliage and cutouts.
- **Shadow map rendering.** Every shadow-casting light re-renders the scene. Two shadow-casting lights is usually the maximum; one plus ambient occlusion is better.
- **Postprocessing at high pixel ratio.** Post cost scales with pixel count. Capping `pixelRatio` at 2 (or 1.5 on mobile) is the single easiest win.
- **Material/program count.** Each unique material compiles a shader. Hundreds of unique materials cause visible hitching on first render. Share materials aggressively and warm up shaders during loading with `renderer.compileAsync()`.

**Quality tiers.** Ship a settings menu with three presets and detect a sensible default from a quick benchmark on first load. High: full post, 2048 shadows, pixelRatio 2. Medium: bloom + SMAA + AO, 1024 shadows, pixelRatio 1.5. Low: bloom + SMAA only, no shadows or baked only, pixelRatio 1. This costs an afternoon and triples the range of devices you run on.

## WebGPU

`three/webgpu` with `WebGPURenderer` gives compute shaders, better draw call batching, and TSL (a node-based shading language that compiles to both WGSL and GLSL). Worth using when the game is compute-heavy — large particle systems, GPU-driven culling, procedural generation.

Not worth it yet if you need maximum browser reach, since Safari support arrived late and driver-level issues persist. If you do adopt it, write materials in TSL so you keep a WebGL fallback path.

## The five-minute upgrade

If someone's scene looks flat and you can only do a few things:

1. Add an HDRI environment, delete `AmbientLight`.
2. Set ACES tone mapping and `SRGBColorSpace` output.
3. Add bloom with threshold 0.85 and N8AO.
4. Tighten the shadow camera and add `normalBias`.
5. Add roughness variation to the dominant material.

That sequence transforms almost any scene, and none of it requires new assets.

## Related skills

- `game-asset-pipeline` — assets with baked-in lighting or wrong color space will look wrong no matter how good the renderer is.
- `open-world-streaming` — keeping draw calls low at world scale.

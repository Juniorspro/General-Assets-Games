---
name: game-asset-pipeline
description: Generate, validate, and optimize 3D models and textures for web games — driving the Rezona Lab MCP to create assets from prompts, then repairing and compressing the results with gltf-transform, Draco/Meshopt, and KTX2 so they load fast in three.js. Use this skill whenever the user wants to create 3D models, characters, props, environments, or textures for a game; whenever they mention Rezona Lab, generated meshes, GLB/GLTF files, "make me a model of", asset generation, or AI-generated 3D; and whenever a model looks wrong in-engine (too dark, wrong scale, huge file size, broken materials, missing normals) or the game's download size or load time is a problem.
---

# Asset pipeline for web games

AI-generated meshes are a starting point, not a shippable asset. Every generated model needs the same treatment: inspect, repair, scale, compress, verify. Skipping this is why generated-asset games load in 40 seconds and render with flat grey materials.

## Stage 0 — Know your budget before generating

Decide these numbers first and hold every asset to them:

| Asset class | Triangles | Texture | Draw calls |
|---|---|---|---|
| Hero character | 15–40k | 2048² | 1–3 |
| NPC / crowd | 3–8k | 1024² | 1 |
| Large prop | 3–10k | 1024² | 1 |
| Small prop | 300–2k | 512² | 1 |
| Environment chunk | 20–60k | atlas 2048² | 1–4 |

Total initial download for a web game should land under about 15 MB, with anything beyond that streamed. Generated meshes routinely arrive at 200k+ triangles with a 4K texture and no LODs — a single one blows the whole budget.

## Stage 1 — Generate with Rezona Lab

Rezona Lab is the only asset-generation dependency in this pipeline. Its tools are provided by an MCP server, so **discover the actual tool names and parameters at runtime rather than assuming them** — list available tools and read the schema of the generation tool before the first call. Tool surfaces change between versions, and guessing parameter names wastes calls.

Once you know the schema, the prompting matters more than the settings.

**Prompt structure that produces usable game meshes:**

```
[object] , [style] , [material description] ,
neutral pose, T-pose if character, symmetrical,
single object centered, no base, no pedestal, no ground plane,
clean topology, game asset, PBR textured
```

Concrete example — instead of `"a cool sword"`, write:

```
medieval arming sword, dark steel blade with worn edge, leather-wrapped grip,
brass crossguard, straight vertical orientation, single object, no scabbard,
no pedestal, clean topology, game asset, PBR textured
```

**Things that reliably degrade generated meshes:**

- Scene descriptions ("a knight standing in a forest") — you get a fused blob including terrain.
- Multiple objects in one prompt — they fuse into one mesh you can't separate cleanly.
- Dynamic poses on characters — impossible to rig afterwards. Always ask for T-pose or A-pose.
- Thin structures (chains, wires, foliage) — generative meshing handles them badly. Model those as alpha-mapped planes instead.
- Words like "detailed", "8k", "hyperrealistic" — they inflate triangle count without improving silhouette.

**Generate variations, then select.** Generation is cheap relative to fixing a bad mesh. Request three variants of anything important and pick the one with the cleanest silhouette, because silhouette is what survives compression and distance.

**Batch related assets in one style pass.** Generating a whole prop set with the same style clause in every prompt gives visual coherence that individually-generated assets never have. Coherence reads as production value more than fidelity does.

Save every generated file into `assets/raw/` and never edit in place. The pipeline below always reads from `raw/` and writes to `assets/dist/`, so it can be re-run.

## Stage 2 — Inspect before touching anything

```bash
npm i -D @gltf-transform/cli
npx gltf-transform inspect assets/raw/sword.glb
```

Read the report for: triangle count, texture resolutions and formats, material count, whether normals and UVs exist, and the bounding box size. That last one matters most — generated meshes come in arbitrary units and you will otherwise import a sword the size of a building.

## Stage 3 — Repair

Common defects in generated meshes and their fixes:

**Wrong scale.** Decide a world unit convention (1 unit = 1 meter is the only sane choice, and Rapier assumes it) and normalize:

```js
// scripts/normalize.mjs
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('assets/raw/sword.glb');
const root = doc.getRoot();
// measure, then apply a scale node so the longest axis equals targetMeters
```

Alternatively scale on import in three.js, but baking it into the asset means every consumer agrees.

**Origin in the wrong place.** Characters need origin at the feet, centered. Props usually want origin at their base contact point. Generated meshes center on the bounding box. Fix it at build time, not with per-instance offsets in gameplay code — those leak everywhere.

**Wrong orientation.** GLTF is Y-up, Z-forward. Generators are inconsistent. Rotate once in the asset, not in the scene graph.

**Missing or faceted normals.** If shading looks blocky, normals are per-face. Regenerate smooth normals with an angle threshold (~40°) so hard edges stay hard.

**Baked lighting in the base color.** Generated textures often have shadows and highlights painted in, which double-darkens under real lighting. Symptoms: model looks muddy and dead. Either regenerate asking for "flat unlit albedo, no baked shadows", or lift the base color texture's shadows manually. This is the single most common reason generated assets look bad in-engine.

**No metalness/roughness map.** Assign sensible uniform factors rather than leaving defaults: metal at `metalness 1.0, roughness 0.3`, painted wood at `metalness 0.0, roughness 0.7`, skin at `metalness 0.0, roughness 0.55`. A correct uniform value beats a wrong texture.

## Stage 4 — Optimize

The one command that does most of the work:

```bash
npx gltf-transform optimize assets/raw/sword.glb assets/dist/sword.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 1024
```

For finer control, run the steps individually:

```bash
# Merge meshes and materials, drop unused data
npx gltf-transform dedup in.glb t1.glb
npx gltf-transform prune t1.glb t2.glb
npx gltf-transform join t2.glb t3.glb          # fewer draw calls

# Reduce geometry — simplify is ratio-based, error is the quality guard
npx gltf-transform simplify t3.glb t4.glb --ratio 0.5 --error 0.001

# Compress geometry
npx gltf-transform meshopt t4.glb t5.glb --level high

# Compress textures — KTX2 for GPU-resident, WebP for download size
npx gltf-transform uastc t5.glb out.glb --slots "{normalTexture,occlusion*}" --level 4
npx gltf-transform etc1s t5.glb out.glb --slots "{baseColor*,emissive*}" --quality 200
```

**Meshopt vs Draco:** Meshopt decodes faster and supports more attribute types; Draco compresses static geometry slightly smaller. Default to Meshopt for anything animated or numerous, Draco only if download size is the hard constraint and decode time isn't.

**KTX2 vs WebP:** WebP is smaller to download but decompresses to full RGBA in VRAM. KTX2/Basis stays compressed on the GPU, using roughly a quarter of the memory. For a game with many textures, VRAM is the binding constraint — use KTX2. Use ETC1S for color maps (lossy, tiny) and UASTC for normal maps (normals show ETC1S artifacts badly).

Loading KTX2 in three.js requires the transcoder:

```js
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
const ktx2 = new KTX2Loader()
  .setTranscoderPath('/basis/')     // copy from three/examples/jsm/libs/basis/
  .detectSupport(renderer);
gltfLoader.setKTX2Loader(ktx2);
```

Meshopt needs its decoder registered too:

```js
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
```

Forgetting either produces a silent load failure that looks like a missing model.

## Stage 5 — Generate LODs

Simplification at three ratios, packaged as a `THREE.LOD`:

```bash
for r in 1.0 0.5 0.2; do
  npx gltf-transform simplify dist/tree.glb dist/tree_lod_$r.glb --ratio $r --error 0.01
done
```

Switching distances that work in practice: LOD0 up to ~15 m, LOD1 to ~50 m, LOD2 beyond. Tune by object size — a building needs far larger distances than a rock.

For dense vegetation and rocks, skip LOD entirely and use `InstancedMesh` with two variants plus distance-based instance culling. Instancing beats LOD when count is the problem rather than complexity.

## Stage 6 — Verify in-engine

An asset isn't done until it's been checked in the actual renderer under the actual lighting. Load it in a scratch scene with a neutral HDRI environment and confirm:

- Correct scale next to a 1.8 m reference box
- Materials respond to light (not flat/emissive-looking)
- Normal map orientation is right — a wrongly-flipped green channel makes surfaces look inverted under moving light
- No z-fighting on coplanar faces
- File size within budget

## Automate it

Once the steps are settled, write `scripts/build-assets.mjs` that walks `assets/raw/`, applies the pipeline, and writes `assets/dist/` with a manifest JSON of names, sizes, triangle counts, and bounding boxes. Gameplay code reads the manifest. This makes regenerating an asset a one-command operation and keeps the budget visible.

```js
// manifest entry shape
{ "sword": { "url": "/assets/dist/sword.glb", "bytes": 184320,
             "tris": 4210, "bbox": [0.08, 1.04, 0.02], "lods": 2 } }
```

## Related skills

- `realtime-rendering-quality` — why a correct asset can still look wrong (tone mapping, color space, environment lighting).
- `threejs-animation` — rigging and animating generated characters.
- `open-world-streaming` — loading these assets on demand instead of all at once.

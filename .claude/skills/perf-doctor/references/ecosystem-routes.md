# Three.js Ecosystem Routes

Start every diagnosis by naming the runtime surface. The same symptom can require different fixes depending on renderer, framework, and post stack.

## Route Table

| Route | What is normal here | Measure first | Usual low-risk levers | Do not assume |
| --- | --- | --- | --- | --- |
| Vanilla Three.js + `WebGLRenderer` | `EffectComposer`, `RenderPass`, `ShaderPass`, `ShaderMaterial`, `onBeforeCompile()`, `renderer.info`, shadow maps, manual render-target flows | draw calls, triangles, textures, programs, pass count, shadow map count, DPR sensitivity | `InstancedMesh`, `BatchedMesh`, merge static geometry, lower post resolution, reduce shadow work, `alphaTest` or `alphaHash`, `compileAsync()` | WebGPU node pipeline, React churn, `RenderPipeline` |
| Vanilla Three.js + `WebGPURenderer` | async init, node materials or TSL, `RenderPipeline`, possible `WebGL2` fallback under the same renderer class | actual backend when known, pass graph, buffer or texture uploads, output buffer settings, DPR sensitivity, compile stutter | trim `RenderPipeline` nodes, reduce DPR, simplify expensive node graphs, pre-init textures, mark truly immutable objects as `Object3D.static` | `EffectComposer`, `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile()` |
| `@react-three/fiber` + `WebGLRenderer` | React scheduling and object lifecycle can dominate even when GPU is healthy; `Canvas` may already clamp `dpr` and set defaults | React commit churn, mount or unmount churn, `useFrame` allocations, event or raycast cost, composer cost, effective DPR | mutate in `useFrame`, avoid `setState` in hot loops, `frameloop="demand"`, `invalidate()`, `useLoader` cache, `startTransition`, `AdaptiveDpr` or `PerformanceMonitor` when the app already uses drei | every hitch is a GPU problem |
| `@react-three/fiber` + `WebGPURenderer` | same React rules as above plus async renderer init and node-material constraints | React churn, actual backend, `RenderPipeline` or node post cost, upload or compile stalls | combine R3F lifecycle fixes with WebGPU-specific levers, reduce quality while moving, keep shader customization in node material paths | legacy shader hooks and WebGL-only post fixes |
| `postprocessing` / `@react-three/postprocessing` layer | wrapper-managed composer, effect merging, multisampling and `resolutionScale` options | which effects are enabled, composer `multisampling`, `resolutionScale`, depth or normal pass usage, selective effect cost | cut selective effects first, lower `resolutionScale`, reduce multisampling, disable depth or normal passes when not needed, skip expensive effects during motion | every effect is a native Three.js pass or that wrapper defaults match core addons |

## Current Ecosystem Facts

- `WebGLRenderer` uses `WebGL 2`. `WebGL 1` is not supported in current Three.js since `r163`.
- `WebGPURenderer` can run on a native `WebGPU` backend or a `WebGL2` fallback. If the actual backend is unknown, say so instead of guessing.
- Official WebGPU post-processing is not the `EffectComposer` path. The current route is `RenderPipeline`; the older `PostProcessing` class name is deprecated since `r183`.
- `ShaderPass` and the addon `EffectComposer` path are `WebGLRenderer` tools.
- `Material#onBeforeCompile()` and custom material compilation hooks are `WebGLRenderer`-only.

## Reporting Rule

Every diagnosis should explicitly name:

- renderer path
- framework layer
- post stack
- target device class
- which recommendation classes are valid on that route

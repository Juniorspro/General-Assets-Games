# Shader Port Notes

The default goal is not a line-for-line port. The goal is a maintainable Three.js implementation that preserves the important behavior.

## Authoring Path Priority

1. `pure-tsl`
2. `tsl-plus-interop`
3. `tsl-webgpu-only`
4. `legacy-webgl-raw`
5. `blocked`

Use `pure-tsl` when the shader can be expressed as a stable node graph or helper-node composition.

Use `tsl-plus-interop` when a small custom function or imported math block avoids a large rewrite without taking over the whole material.

Use `tsl-webgpu-only` when correctness depends on compute, storage, or other WebGPU-only resources and the user accepts that backend contract.

Use `legacy-webgl-raw` only when one of these is true:

- the shader is tightly coupled to legacy GLSL structure
- the effect depends on raw GLSL shader control
- the TSL rewrite would materially increase risk or time without improving maintainability enough

## Decision Matrix

| Situation | Preferred route | Reason |
| --- | --- | --- |
| Single-pass procedural fragment effect | `pure-tsl` | easiest to maintain and adapt |
| Mostly procedural effect with one custom noise block | `tsl-plus-interop` | keeps the graph readable |
| Heavy Shadertoy buffer chain | `tsl-plus-interop` or `tsl-webgpu-only` | pass topology may dominate the port |
| WGSL path with storage features | `tsl-webgpu-only` | feature contract is the actual constraint |
| Legacy GLSL shader that must stay raw | `legacy-webgl-raw` | current Three.js raw-material support is WebGL-only |

## Official Constraint Notes

These points come from current official Three.js docs and manual pages:

- TSL can target `WGSL` or `GLSL` depending on the available backend.
- `Transpiler` currently converts `GLSL -> TSL` only.
- `FunctionNode` exposes explicit `wgsl` and `glsl` language modes through `wgslFn()` and `glslFn()`.
- `ShaderMaterial`, `RawShaderMaterial`, and `onBeforeCompile()` are not supported in `WebGPURenderer`.
- `RawShaderMaterial` and `ShaderMaterial` are WebGL-only material routes.
- `StorageTexture` is for compute and only works with `WebGPURenderer` on a WebGPU backend.

## Inference Rule

Treat a single-language native helper as backend-specific unless you provide equivalent coverage for the other promised backend. This is an implementation inference based on the documented language-specific `FunctionNode` and builder APIs, not an explicit one-line promise from the docs.

## Fallback Policy

- Document the authoritative path first.
- If a raw fallback exists, state exactly what it preserves and what it drops.
- If the WebGL2 fallback is materially simpler, say so explicitly instead of implying parity.
- If the source cannot be ported cleanly, state the blocker first and then list the fallback menu.

## `Cannot Port Cleanly` Conditions

Use that language when:

- the shader needs compute or storage behavior but the user requires WebGL2 parity
- the source depends on missing or hidden passes, textures, or engine data
- the requested route assumes raw custom materials under `WebGPURenderer`
- most of the final implementation would be opaque native shader code instead of a maintainable TSL port

## Fallback Menu

When the preferred route fails, choose one of these and say it plainly:

- `webgpu-only`: keep the correct effect, drop WebGL2 parity
- `tsl-webgl2-backend`: keep TSL, run through the WebGL2 backend when possible
- `legacy-webgl-raw`: keep raw GLSL on `WebGLRenderer`
- `approximation`: simplify one or more modules and document the visual trade-off
- `blocked`: wait for missing source assets or a changed target contract

## Compatibility Checklist

- WebGPU can rely on higher precision, richer textures, and heavier intermediate resources.
- WebGL2 fallback should avoid storage-buffer assumptions, minimize texture fetches, and keep precision demands explicit.
- If the shader depends on derivatives, depth, normals, or history buffers, list that requirement before implementation.
- If you promise both WebGPU and WebGL2 support, verify both. Do not assume TSL parity automatically proves behavioral parity.

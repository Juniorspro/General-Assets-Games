# Authoring Paths

## `pure-tsl`

Use this when:

- the effect is mostly material logic, procedural shading, post shaping, or moderate full-screen work
- the graph stays readable
- the same logic may need to land on both `WebGPU` and `WebGL2`

Good fits:

- layered materials
- fresnel, glow, rim light
- procedural color and noise shaping
- moderate displacement or distortion
- scene-plus-post effects without unusual GPU data flow

## `tsl-plus-interop`

Use this when:

- most of the effect fits TSL
- one module needs tightly scoped custom code or an awkward edge-case escape hatch

Keep the boundary local and document it.

## `raw-wgsl`

Use this when:

- the implementation depends on explicit WebGPU behavior
- compute-style thinking drives the solution
- storage resources or workgroup behavior are central to the design

Do not choose this path merely because a reference uses shader code.

## `raw-glsl`

Use this when:

- the implementation is intentionally `WebGL2`-first
- a mature GLSL reference is already the cleanest source of truth
- translating into TSL would add cost without real benefit

## `dual-path`

Use this only when:

- broad compatibility is required
- the `WebGPU` path still offers meaningful value
- the team can afford maintaining both paths

If parity will be approximate, say that explicitly.

Cost checklist:

- every behavior change now needs two landing paths or one heavily abstracted shared core
- test coverage expands from one renderer matrix to two
- GUI controls drift unless both paths document identical ranges and semantics
- debugging gets slower because visual regressions may be renderer-specific, shader-specific, or synchronization-specific

Use `dual-path` only when the product value is larger than the maintenance tax.

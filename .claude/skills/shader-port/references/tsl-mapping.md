# TSL Mapping

Use this file to map common shader constructs into the current Three.js TSL surface before you choose a fallback.

## Core Mapping

| Source construct | Preferred TSL landing | Notes |
| --- | --- | --- |
| scalar and vector math | direct TSL operators and method chaining | keep it pure TSL by default |
| reusable local value | `.toVar()` | use when the same expression appears multiple times |
| host-driven dynamic value | `uniform()` | update manually or through uniform update hooks |
| vertex-to-fragment handoff | `vertexStage()` or `varying()` | keep stage boundaries explicit |
| conditional branch | `If().ElseIf().Else()` inside `Fn()` | do not port GLSL control flow as opaque strings |
| loops | `Loop()` plus `Break()` or `Continue()` | keep loop bounds explicit |
| normalized screen UV | `screenUV` | normalized frame-buffer coordinates |
| pixel-space screen coordinate | `screenCoordinate` | physical pixel units |
| viewport-relative UV | `viewportUV` | respects `renderer.setViewport()` |
| read prior rendered color | `viewportSharedTexture()` | good for screen-space feedback and refraction-style reads |
| read depth | `viewportDepthTexture()` or `viewportLinearDepth` | choose the one that matches the source math |
| multipass scene capture | `pass()` and `mrt()` | keep pass ordering explicit |
| isolated native helper | `glslFn()` or `wgslFn()` | use only for small, named escape hatches |
| legacy GLSL starting point | `Transpiler.parse()` | official support is `GLSL -> TSL` only |

## Route Rules

- Prefer direct TSL forms before native-code helpers.
- Treat `glslFn()` and `wgslFn()` as backend-specific unless you provide matching implementations for every promised backend. This is a reasoned inference from the documented `FunctionNode` language modes.
- If the source is WGSL, there is no official WGSL-to-TSL transpiler path in current docs.
- If most of the final material would live inside native code blocks, stop calling it a maintainable TSL port and move to a fallback label.

## Good Fits For Pure TSL

- procedural color and math
- UV distortion and masking
- moderate raymarch and SDF logic
- screen-space post shaping
- lighting extensions that can stay inside node-material inputs

## Common Escalation Signals

Escalate away from `pure-tsl` when you see:

- storage-buffer or storage-texture dependence
- compute-driven simulation state
- hidden engine-specific buffers that the source gets "for free"
- a need for full raw shader control instead of a local helper

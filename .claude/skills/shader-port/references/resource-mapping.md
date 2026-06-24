# Resource Mapping

List every external dependency before you decide the final authoring path.

## Resource Types

| Source dependency | Typical Three.js landing |
| --- | --- |
| scalar uniforms | `uniform()` or explicit host-side material parameters |
| textures | `Texture` inputs with explicit filtering, color space, and wrap modes |
| previous frame or history | render targets, ping-pong buffers, or `viewportSharedTexture()` when appropriate |
| depth and normals | scene passes, MRT outputs, or viewport depth nodes |
| buffer chains | ordered multipass render targets via `pass()` and explicit pass ordering |
| storage buffers or textures | `storage()` / `storageTexture()` on WebGPU-only routes |

## Common Shadertoy-Style Mappings

| Source handle | Typical landing |
| --- | --- |
| `iTime` | frame-updated uniform |
| `iResolution` | `screenSize` or `viewportSize` |
| `iMouse` | explicit pointer uniform with documented space |
| `iChannel0..3` | `Texture` inputs or render-target textures |
| `Buffer A..D` | pass graph with explicit dependencies |
| image pass backbuffer | history target or `viewportSharedTexture()` if the effect shape matches |
| audio textures | external texture or data upload path |

## Mapping Rules

- If a source buffer is only used for blur or bloom polish, consider replacing it with a standard post path.
- If a source buffer carries core simulation state, keep the dependency explicit and name the update order.
- If the port needs depth, normals, or motion state that the original shader got for free, list that cost in the compatibility notes.
- If a source resource is missing, stop and mark the port incomplete rather than fabricating it.
- If a route depends on storage resources, document that it is a WebGPU-only contract unless a separate WebGL-compatible path exists.

## Fallback Rule

When a premium path depends on resources that the fallback renderer cannot support cleanly, document the reduced path before implementation.

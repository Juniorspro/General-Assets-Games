# Coordinate Mapping

Most shader ports fail first on coordinates, not on fancy math.

## Common Translations

| Source assumption | Three.js landing note |
| --- | --- |
| `fragCoord` in pixel space | prefer `screenCoordinate`; use `viewportCoordinate` if the source is viewport-relative |
| `fragCoord / resolution` style UV | prefer `screenUV` or `viewportUV` depending on the source contract |
| `iResolution` or framebuffer size | prefer `screenSize` for full-frame work or `viewportSize` for viewport-local work |
| centered NDC math | normalize around the chosen screen or viewport space and keep aspect correction explicit |
| view-ray reconstruction from screen UV | decide whether the port is screen-space or should become scene-aware |
| `iTime` style animation | map to a stable uniform with documented units and update cadence |
| mouse in screen coordinates | normalize and state whether it is viewport-relative or canvas-relative |

## Rules

- Pick screen space or viewport space once per module. Do not mix them casually.
- Make aspect correction explicit instead of burying it in magic constants.
- Do not mix UV space, NDC space, and world space without naming the conversion step.
- If the original shader is fullscreen-only, say whether the port remains fullscreen or becomes a material on geometry.
- Remember that current TSL exposes both normalized and physical-pixel coordinate nodes. Use the one that matches the original math instead of rebuilding it from scratch.

## Pointer Rule

If the source uses mouse or pointer input:

- state the input origin and axis direction
- state whether the pointer is normalized or pixel-space
- keep the pointer in the same space as the rest of the shader math
- document any flip on the Y axis instead of hiding it in helper code

## Camera Note

If the shader depends on a ray origin and direction, document whether the port uses:

- a fullscreen camera-ray reconstruction
- object-space evaluation
- world-space sampling

If the source assumed a synthetic camera inside a fullscreen shader, do not silently replace it with scene depth or world-space data.

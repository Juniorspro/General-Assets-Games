# Legacy WebGL Raw Fallback

Report-centric `shader-port` fixture for the raw GLSL fallback branch:

- classification: `fullscreen-post`
- authoring route: `legacy-webgl-raw`
- status label: `legacy-webgl-fallback`

This case exists for effects whose correct implementation still depends on raw GLSL control under `WebGLRenderer`.

## Why This Fixture Exists

It prevents a common false promise:

- labeling a raw GLSL port as if it were a `WebGPU`-compatible node path

## Notes

- This fixture is report-only in v1.
- It documents the compatibility fallback, not a preferred architecture.

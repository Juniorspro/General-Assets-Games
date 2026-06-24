# Verification Checklist

Do not call a shader port done just because it compiles.

## Required Checks

- compiles on the intended renderer path
- compiles on every promised fallback path
- aspect ratio behaves correctly
- time and interaction uniforms are stable
- pass ordering and history dependencies behave correctly
- main visual module still reads correctly
- the reported status label matches reality

## Comparison Notes

Record:

- authoritative source artifact
- Three.js version and renderer route
- current renderer/backend
- what is preserved exactly
- what was simplified or dropped
- what could not be verified directly

## Honest Status Rule

If the fallback is only approximate, label it that way. Do not imply parity between a premium `WebGPU` path and a simplified `WebGL2` fallback.

## Backend-Specific Checks

### TSL route

- verify imports and renderer setup match the current documented path
- if using `WebGPURenderer` outside `setAnimationLoop()`, verify `await renderer.init()` is handled where needed
- if promising WebGL2 backend coverage, force and test that path explicitly

### Legacy raw WebGL route

- verify the snippet actually uses `WebGLRenderer`
- verify custom `ShaderMaterial`, `RawShaderMaterial`, or `ShaderPass` code is not mislabeled as WebGPU-compatible

## Completion Rule

A shader port is complete only when:

- the chosen route compiles
- every promised fallback compiles
- the visual contract has been checked against the source
- the report states exactly what remains different

# Shader Port Fixtures

This directory contains route-centric fixtures for the main `shader-port` authoring paths.

The fixture corpus is intentionally small. Its job is not to become a shader gallery. Its job is to make the porting contract auditable:

- how the source was classified
- which authoring route was chosen
- which status label was earned
- what fallback was disclosed
- what was actually verified

## Preview

Runnable fixtures are zero-build and should be previewed over localhost from the repository root:

```bash
python3 -m http.server 4173 -d .
```

## Fixture Contract

Each fixture directory must contain:

- `README.md`: human-facing explanation of the route archetype
- `REPORT.md`: report filled from [`../assets/report-template.md`](../assets/report-template.md)
- `fixture.json`: minimal structured contract used by the validator

`fixture.json` uses a small enum-based contract for:

- `classification`
- `authoring_route`
- `status_label`
- `primary_renderer_contract`
- `fallback_contract`
- `verified_paths`

Runnable fixtures may also contain:

- `index.html`
- `main.js`

## Fixtures

- [shadertoy-single-pass-clean-port/README.md](shadertoy-single-pass-clean-port/README.md): runnable `pure-tsl` single-pass sample with manual backend verification still required
- [glsl-post-effect-with-tsl-interop/README.md](glsl-post-effect-with-tsl-interop/README.md): report-centric `tsl-plus-interop` case where one small helper stays native
- [wgsl-webgpu-only-case/README.md](wgsl-webgpu-only-case/README.md): report-centric `tsl-webgpu-only` route for storage-driven logic
- [legacy-webgl-raw-fallback/README.md](legacy-webgl-raw-fallback/README.md): report-centric `legacy-webgl-raw` fallback when raw GLSL remains the honest path
- [blocked-multipass-missing-assets/README.md](blocked-multipass-missing-assets/README.md): blocked case with missing buffers and assets

## Operating Principle

Each fixture should prove one routing decision with the smallest honest sample. If a fixture turns into a showcase scene, a large shader library, or a hidden custom pipeline, it is no longer doing the job of a route archetype.

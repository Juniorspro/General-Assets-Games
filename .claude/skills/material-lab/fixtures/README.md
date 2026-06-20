# Material Lab Fixtures

This directory contains minimal runnable fixtures for the main `material-lab` branches.

All fixtures are zero-build and intended to be previewed over localhost from the repository root.

These fixtures are checked-in contract samples, not loose demos.

## Preview

```bash
python3 -m http.server 4173 -d .
```

## Fixtures

- [standard-vs-physical-vs-sss/README.md](standard-vs-physical-vs-sss/README.md): compare `MeshStandardMaterial`, `MeshPhysicalMaterial` transmission, and an SSS route on the same target
- [scanned-pbr-vs-scan-assisted-cleanup/README.md](scanned-pbr-vs-scan-assisted-cleanup/README.md): compare raw scan-like PBR inputs against scan-assisted cleanup on the same stock route
- [gltf-khr-materials-vs-materialx-route/README.md](gltf-khr-materials-vs-materialx-route/README.md): compare the `glTF + KHR_materials_*` asset route against the `MaterialX` route

## Fixture Contract

Each fixture directory must include:

- `README.md`
- `REPORT.md`
- `index.html`
- `main.js`

Each fixture `README.md` must include these sections:

- `## Why This Fixture Exists`
- `## Route Decision`
- `## Preview`
- `## What To Look For`
- `## Limits`

Each fixture `REPORT.md` must follow [`../assets/report-template.md`](../assets/report-template.md).

## Operating Principle

Each fixture should prove one routing decision with the smallest honest sample. If a fixture needs a large scene or heavy custom pipeline to make its point, the fixture is probably not minimal enough.

## Validation

Run the material-lab fixture validator from the repository root:

```bash
python3 scripts/validate_material_lab_fixtures.py
```

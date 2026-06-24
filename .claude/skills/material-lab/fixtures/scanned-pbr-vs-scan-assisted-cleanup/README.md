# Scanned PBR vs Scan-Assisted Cleanup

Minimal `material-lab` fixture for the measured or scanned branch.

It compares two paths on the same stock `MeshStandardMaterial` route:

- `scanned-pbr`: scan-like albedo, roughness, and normal inputs used almost directly
- `scan-assisted cleanup`: the same captured signal after controlled cleanup and calibration

The point is not to show a perfect scan workflow. The point is to prove a decision:

- many scan-material problems are input problems, not shader problems

## Why This Fixture Exists

Use it as the smallest runnable sanity check for the measured or scanned branch:

- preserve the stock material route first
- validate color, roughness, and normal inputs
- clean the scan before escalating to custom shading

## Route Decision

- Proves that some scan-material failures should be handled as input cleanup problems first.
- Keeps the same `MeshStandardMaterial` route on both sides so the authoring path does not move.
- Uses procedural scan-like textures because the fixture is about the decision boundary, not asset provenance.

## Preview

From the repository root:

```bash
python3 -m http.server 4173 -d .
```

Then open:

```text
http://localhost:4173/skills/material-lab/fixtures/scanned-pbr-vs-scan-assisted-cleanup/
```

Do not use `file://`.

## What To Look For

- `scanned-pbr` keeps blotchy albedo, unstable roughness, and over-strong micro-normal response
- `scan-assisted cleanup` keeps the same general surface family, but stabilizes highlights, color balance, and normal response
- both samples stay on the same stock PBR material path

## Limits

- All textures in this fixture are generated procedurally to emulate scan-like capture and cleanup passes.
- The fixture intentionally avoids custom shaders to reinforce the routing rule in `material-lab`.
- It does not prove measured-material fidelity or a full scan-processing pipeline.

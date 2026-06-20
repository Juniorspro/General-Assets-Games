# Standard vs Physical vs SSS

Minimal `material-lab` fixture that compares three adjacent routes on the same warm translucent target:

- `standard`: opaque approximation with `MeshStandardMaterial`
- `physical`: transmission-driven route with `MeshPhysicalMaterial`
- `sss`: subsurface route using the official `SubsurfaceScatteringShader` addon

The point of the fixture is not photorealism. It is to make one decision obvious:

- `transmission` is not `sss`

## Why This Fixture Exists

Use it as the smallest runnable sanity check for the `material-lab` capability tree:

- stock PBR branch
- physical-material branch
- SSS/translucency branch

It also gives a stable harness for lighting, HDRI, and review logic before a larger lookdev task.

## Route Decision

- Proves that `transmission` and `sss` should not be treated as the same route.
- Preserves one geometry, one camera contract, and one lighting rig so the route change stays visible.
- Uses the addon SSS branch because the goal is route contrast, not a full production skin stack.

## Preview

From the repository root:

```bash
python3 -m http.server 4173 -d .
```

Then open:

```text
http://localhost:4173/skills/material-lab/fixtures/standard-vs-physical-vs-sss/
```

Do not use `file://`.

## What To Look For

- `standard` stays mostly surface-bound and opaque
- `physical` gets reflective transmission and colored attenuation, but still reads closer to clear material transport
- `sss` gains the soft backlit bloom and internal light spread that transmission alone does not create

## Limits

- This fixture is not a photoreal skin, wax, or jade benchmark.
- It uses the official WebGL addon [`SubsurfaceScatteringShader`](https://threejs.org/docs/pages/module-SubsurfaceScatteringShader.html) for broad preview compatibility.
- It does not prove parity with the WebGPU-native `MeshSSSNodeMaterial` route.

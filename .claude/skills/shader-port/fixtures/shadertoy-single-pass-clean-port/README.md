# Shadertoy Single-Pass Clean Port

Minimal runnable `shader-port` fixture for the cleanest branch in the route taxonomy:

- classification: `single-pass-fragment`
- authoring route: `pure-tsl`
- status label: `ported-cleanly`

The effect is intentionally small. It behaves like a compact Shadertoy-style fragment port: time-driven color bands on a fullscreen quad, expressed directly in TSL with no native helper escape hatch.

## Why This Fixture Exists

Use it as the smallest executable proof that `shader-port` is not just a prose guide:

- pure TSL is enough for simple single-pass procedural shader logic
- the same node graph can target a `WebGPU` path or a `WebGL2` backend path without changing the route label
- the report template, fixture metadata, and runnable snippet can stay aligned

## Preview

From the repository root:

```bash
python3 -m http.server 4173 -d .
```

Then open either path:

```text
http://localhost:4173/skills/shader-port/fixtures/shadertoy-single-pass-clean-port/
http://localhost:4173/skills/shader-port/fixtures/shadertoy-single-pass-clean-port/?backend=webgl2
```

Do not use `file://`.

## What To Look For

- default path initializes `WebGPURenderer` on the normal `WebGPU` route when available
- `?backend=webgl2` forces the `WebGL2` backend under the same TSL graph
- on machines with usable graphics backends, the animated banding should stay visually coherent across both routes

## Verification Scope

- Repository validation checks the report contract, fixture metadata, runnable file presence, and JavaScript syntax.
- Real backend-specific rendering still requires opening the fixture in a browser with usable `WebGPU` or `WebGL2`.

## Notes

- This fixture uses a fullscreen quad and plane UVs instead of a more complex scene because the point is the route decision, not scene construction.
- The shader logic is intentionally modest; it exists to prove `pure-tsl`, not to compete with larger effect demos.

# glTF KHR Materials vs MaterialX Route

Minimal `material-lab` fixture for the ecosystem-route branch.

It compares two authoring and import paths under the same WebGPU-oriented preview harness:

- `glTF + KHR_materials_*`: a `MeshPhysicalMaterial`-based asset exported to glTF and reloaded through `GLTFLoader`
- `MaterialX`: an inline `standard_surface` document loaded through `MaterialXLoader`

The point is not exact visual parity. The point is to make one routing decision executable:

- asset-route choice is part of the material decision, not just file format trivia

## Why This Fixture Exists

Use it as the smallest runnable sanity check for the ecosystem branch:

- `glTF` route for Khronos material extensions and DCC-friendly physical-material delivery
- `MaterialX` route for externally authored node-graph materials on the WebGPU path

## Route Decision

- Proves that asset-route choice is part of the material decision.
- Keeps the same preview scene and hero geometry so the route provenance is the changing variable.
- Uses WebGPU because `MaterialXLoader` lands on the WebGPU build in current Three.js.

## Preview

From the repository root:

```bash
python3 -m http.server 4173 -d .
```

Then open:

```text
http://localhost:4173/skills/material-lab/fixtures/gltf-khr-materials-vs-materialx-route/
```

Do not use `file://`.

## What To Look For

- `glTF` shows an asset route centered on Khronos extensions and physical-material parameters
- `MaterialX` shows a node-graph import route built around `standard_surface`
- both routes live inside the same preview harness, but their authoring provenance is different

## Limits

- The glTF asset is generated at runtime with the official `GLTFExporter` and then reloaded with `GLTFLoader`.
- The MaterialX material is parsed from an inline XML string with `MaterialXLoader.parse()`.
- This fixture uses the WebGPU build because `MaterialXLoader` targets `WebGPURenderer`.
- It does not prove route parity, DCC round-trip quality, or packaging guidance.

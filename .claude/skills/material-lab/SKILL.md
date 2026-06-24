---
name: material-lab
license: MIT
description: Use when the task is to study or prototype a specific Three.js material, lighting setup, scan cleanup, transmission or SSS choice, or other surface treatment in isolation rather than recreate a full effect.
metadata:
  category: threejs
  render_backends:
    - webgpu
    - webgl2
  shader_language: tsl
  skill_type: research
  owns_templates: "false"
  owns_scaffolder: "false"
---

# Three.js Material Lab

## Purpose

Use this skill when the goal is to understand or prototype a material, lighting setup, or surface treatment in isolation rather than to reproduce an entire effect. Keep the scope tight: the focus is the material model, the supporting lighting rig, the asset inputs, and the validation method. The output should be a compact prototype plus a report on the look, constraints, authoring path, and tuning levers.

## Capability Tree

`material-lab` should reason through the material stack in this order:

1. classify the material family
2. identify the appearance drivers
3. choose the smallest honest three.js authoring route
4. validate with controlled lighting and physics sanity checks

Expected capability branches:

- material families: dielectric, conductor, coated, transmissive, iridescent, cloth, emissive, stylized, measured or scanned materials, and SSS or translucency-driven materials
- authoring routes: `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshSSSNodeMaterial`, NodeMaterial and TSL, imported `glTF` materials, imported `MaterialX`, ecosystem wrappers, addon translucency routes, and raw shader fallback
- support modules: HDRI and PMREM setup, texture and color-space handling, tangent and normal-map sanity, clearcoat and transmission tuning, thin-wall versus volume distinction, thickness-map handling, scan-texture validation, and review capture
- validation: lighting-rig checks, multi-angle review, roughness and fresnel sanity, transmission and thickness sanity, measured-input sanity, SSS/backlight sanity, and documented cheats

## Workflow

1. Capture the reference surface language: source images, turntable clips, scan notes, existing assets, or an explicit target description.
2. Classify the material family before implementation: conductor, dielectric, coated, transmission, cloth, thin-film, emissive, stylized, measured or scanned, SSS or translucency-driven, or mixed.
3. Identify the appearance drivers: base tone, roughness profile, edge response, anisotropy, layer order, transmission or thickness cues, subsurface or backlight cues, scan-derived texture signals, and whether post is primary or merely supportive.
4. Choose the smallest honest authoring route: stock PBR material first, then physical extensions, then SSS-specific routes when the light transport really requires them, then TSL or NodeMaterial, then asset-import routes, then ecosystem wrappers or raw fallback only if they materially simplify or unlock the look.
5. Build a modular prototype with explicit lighting, HDRI assumptions, and exposed parameters. Keep base material correctness separate from post polish, and keep thin transmission separate from true SSS.
6. Validate in-browser with controlled rigs and physics sanity checks. Record what is physically grounded, what is art-directed, whether the result is measured-data-faithful or only scan-inspired, and what remains uncertain.

## Deliverables

- A short report that lists the reference inputs, chosen material family, critical invariants, authoring path, renderer contract, and asset assumptions. For checked-in fixtures, use the `material-lab` report template.
- A runnable Three.js snippet or scene demonstrating the material/lighting treatment with the critical controls exposed.
- A review artifact (still frame, comparison notes, or short clip) plus fidelity observations relevant to the surface or lighting behavior.
- An explicit note about whether the result is physically grounded, stylized on purpose, or a hybrid.

## Reference Pack

Use the references under [`references/`](references/) as the compact decision layer for this skill:

- [`references/README.md`](references/README.md) for the suggested reading order
- [`references/capability-tree.md`](references/capability-tree.md) for the full ability map
- [`references/material-classes.md`](references/material-classes.md) to classify the target material correctly
- [`references/measured-scanned-materials.md`](references/measured-scanned-materials.md) for scanned and measured-signal workflows
- [`references/sss-translucency.md`](references/sss-translucency.md) for subsurface scattering and cheap translucency routes
- [`references/surface-breakdown.md`](references/surface-breakdown.md) to split the look into material modules
- [`references/pbr-principles.md`](references/pbr-principles.md) for the default physically based baseline
- [`references/lighting-rigs.md`](references/lighting-rigs.md) for validation lighting setups
- [`references/ecosystem-material-routes.md`](references/ecosystem-material-routes.md) for the current three.js material ecosystem
- [`references/renderer-routing.md`](references/renderer-routing.md) when renderer choice or authoring path is unclear
- [`references/asset-pipeline.md`](references/asset-pipeline.md) for texture, tangent, and HDRI handling
- [`references/physics-sanity-checks.md`](references/physics-sanity-checks.md) for graphics-grounded intuition checks
- [`references/validation-review.md`](references/validation-review.md) to capture review artifacts and acceptance notes

## Fixture Pack

- [`fixtures/README.md`](fixtures/README.md) for the current runnable fixture index
- [`fixtures/standard-vs-physical-vs-sss/README.md`](fixtures/standard-vs-physical-vs-sss/README.md) for a minimal runnable comparison that shows why `MeshStandardMaterial`, `MeshPhysicalMaterial` transmission, and an SSS route land on different looks
- [`fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md`](fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md) for a minimal runnable comparison that keeps the stock PBR route but shows how scan cleanup changes the result
- [`fixtures/gltf-khr-materials-vs-materialx-route/README.md`](fixtures/gltf-khr-materials-vs-materialx-route/README.md) for a minimal runnable comparison that turns the ecosystem-route decision into an executable sample

Checked-in workflow assets for this skill:

- [`assets/report-template.md`](assets/report-template.md)
- [`fixtures/README.md`](fixtures/README.md)
- [`../../scripts/validate_material_lab_fixtures.py`](../../scripts/validate_material_lab_fixtures.py)

## Constraints

- Keep the prototype minimal: avoid building full scenes unless the surface requires context for validation.
- Prefer the native three.js material stack first and use `TSL` when it improves the outcome or maintainability.
- Document any deviation from defaults, especially when a wrapper, imported asset graph, or raw shader path is used.
- Keep checked-in fixtures aligned with the material-lab fixture contract and report template.
- Do not label a result as `measured` unless the data source actually supports that claim.
- Do not confuse `transmission` with `subsurface scattering`; choose the route based on the light-transport cue you need to preserve.
- When the reference is ambiguous, default to a neutral lighting rig and call out the missing cues in the report rather than inventing signature features.

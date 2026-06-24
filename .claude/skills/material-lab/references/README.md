# Material Lab References

Use this reference pack when the task is a focused material, lighting, or surface-treatment study.

## Suggested Order

1. [capability-tree.md](capability-tree.md)
2. [material-classes.md](material-classes.md)
3. [measured-scanned-materials.md](measured-scanned-materials.md)
4. [sss-translucency.md](sss-translucency.md)
5. [surface-breakdown.md](surface-breakdown.md)
6. [ecosystem-material-routes.md](ecosystem-material-routes.md)
7. [pbr-principles.md](pbr-principles.md)
8. [lighting-rigs.md](lighting-rigs.md)
9. [asset-pipeline.md](asset-pipeline.md)
10. [renderer-routing.md](renderer-routing.md)
11. [physics-sanity-checks.md](physics-sanity-checks.md)
12. [validation-review.md](validation-review.md)

## What Each File Does

- [capability-tree.md](capability-tree.md): define the skill's full material-study ability map
- [material-classes.md](material-classes.md): classify the target material before implementation
- [measured-scanned-materials.md](measured-scanned-materials.md): handle scan-driven and measured-signal material work honestly
- [sss-translucency.md](sss-translucency.md): choose between transmission, cheap translucency, and true SSS
- [surface-breakdown.md](surface-breakdown.md): split the target look into explicit material modules
- [ecosystem-material-routes.md](ecosystem-material-routes.md): map the target onto the current three.js material ecosystem
- [pbr-principles.md](pbr-principles.md): start from a physically plausible baseline and document cheats
- [lighting-rigs.md](lighting-rigs.md): choose a rig that reveals the surface rather than flattering it
- [asset-pipeline.md](asset-pipeline.md): handle HDRIs, color spaces, normals, tangents, and texture assumptions
- [renderer-routing.md](renderer-routing.md): decide `WebGPU` vs `WebGL2` and `pure-tsl` vs interop
- [physics-sanity-checks.md](physics-sanity-checks.md): run intuitive and graphics-grounded validation tests
- [validation-review.md](validation-review.md): capture review artifacts and acceptance notes

## Operating Principle

Do not build a whole scene just to hide a weak material. Prove the surface class, the authoring route, and the physical intuition in a controlled setup first.

## Fixture

- [../fixtures/README.md](../fixtures/README.md): index of all current runnable `material-lab` fixtures
- [../fixtures/standard-vs-physical-vs-sss/README.md](../fixtures/standard-vs-physical-vs-sss/README.md): minimal runnable side-by-side comparison of `standard`, `physical`, and `sss` branches
- [../fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md](../fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md): minimal runnable side-by-side comparison of raw scanned PBR inputs versus scan-assisted cleanup on the same stock material route

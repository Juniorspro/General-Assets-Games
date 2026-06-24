# Replicator References

Use this reference pack when the task is a reference-driven Three.js remake and `replicator` is acting as the orchestrator.

## Suggested Order

1. [archetypes.md](archetypes.md)
2. [research.md](research.md)
3. [visual-quality.md](visual-quality.md)
4. [fidelity-rubric.md](fidelity-rubric.md)

## Active Reads

These are the files `replicator` should reach for first during normal orchestration:

- [archetypes.md](archetypes.md): route the remake onto the closest dominant archetype
- [research.md](research.md): parse inputs, expand the link tree, and record evidence coverage
- [visual-quality.md](visual-quality.md): turn the reference into a measurable effect spec
- [fidelity-rubric.md](fidelity-rubric.md): score acceptance and choose the right review medium

## On-Demand Reference Packs

These files support specialist branches and should be loaded only when the chosen route actually needs them:

- [platform/interface-decision-tree.md](platform/interface-decision-tree.md): classify the workload before choosing a landing path
- [platform/authoring-paths.md](platform/authoring-paths.md): compare `TSL`, interop, `WGSL`, and `GLSL` authoring options
- [platform/backend-capability-matrix.md](platform/backend-capability-matrix.md): compare renderer and backend tradeoffs
- [platform/webgpu-resource-patterns.md](platform/webgpu-resource-patterns.md): choose a `WebGPU` resource model when that branch is active
- [platform/pipeline-archetypes.md](platform/pipeline-archetypes.md): map the chosen route onto a pass topology
- [platform/renderer-compatibility.md](platform/renderer-compatibility.md): set browser target and fallback policy
- [platform/official-threejs-webgpu.md](platform/official-threejs-webgpu.md): sanity-check the chosen WebGPU route against official guidance
- [platform/version-compatibility.md](platform/version-compatibility.md): keep route assumptions aligned with the pinned repository version
- [postfx/post-chain-selection.md](postfx/post-chain-selection.md): decide whether the look belongs in post at all
- [postfx/render-target-patterns.md](postfx/render-target-patterns.md): choose a render-target layout when post or feedback matters
- [postfx/history-feedback.md](postfx/history-feedback.md): decide whether history buffers are optional or required
- [postfx/quality-tiering.md](postfx/quality-tiering.md): define post quality ladders without promoting them to the main workflow
- [postfx/code-patterns.md](postfx/code-patterns.md): inspect concrete post implementation patterns after the route is already chosen
- [postfx/official-three-postfx.md](postfx/official-three-postfx.md): sanity-check post decisions against official guidance
- [performance/device-targeting.md](performance/device-targeting.md): set a device class only when performance becomes an active branch
- [performance/bottleneck-diagnosis.md](performance/bottleneck-diagnosis.md): name the dominant bottleneck when the remake is budget-constrained
- [performance/degradation-playbook.md](performance/degradation-playbook.md): define a degradation ladder only when the route needs one
- [performance/profiling-checklist.md](performance/profiling-checklist.md): collect final performance sanity checks without turning them into a top-level replicator workflow
- [gui.md](gui.md): inspect GUI grouping guidance only when the remake needs exposed controls beyond the default shell

## Related Assets And Scripts

- [../assets/report-template.md](../assets/report-template.md): required report skeleton for checked-in remake work
- [../scripts/init_effect.py](../scripts/init_effect.py): scaffold `effects/<effect-slug>/` from the included starter matrix
- [../scripts/capture_audit.py](../scripts/capture_audit.py): regenerate `review-artifacts/manifest.json` and `review-artifacts/review.md` after saving file-based evidence

## Operating Principle

Load the smallest set of references that resolves the current remake decision. `replicator` should orchestrate the route, not restate every specialist playbook inline.

# Performance Doctor References

Use this reference pack for evidence-first, route-aware Three.js performance diagnosis.

## Suggested Order

1. [ecosystem-routes.md](ecosystem-routes.md)
2. [instrumentation.md](instrumentation.md)
3. [route-discovery-snippet.md](route-discovery-snippet.md)
4. [renderer-info-capture.md](renderer-info-capture.md)
5. [pass-timing-capture.md](pass-timing-capture.md)
6. [r3f-triage-notes.md](r3f-triage-notes.md)
7. [bottlenecks.md](bottlenecks.md)
8. [diagnosis-sequence.md](diagnosis-sequence.md)
9. [device-targets.md](device-targets.md)
10. [degradation-ladders.md](degradation-ladders.md)

## What Each File Does

- [ecosystem-routes.md](ecosystem-routes.md): identify which Three.js stack the app is actually using before suggesting fixes
- [instrumentation.md](instrumentation.md): decide what to measure before changing code
- [route-discovery-snippet.md](route-discovery-snippet.md): smallest repo-first and runtime route discovery workflow
- [renderer-info-capture.md](renderer-info-capture.md): low-friction `renderer.info` snapshot recipe and multi-pass note
- [pass-timing-capture.md](pass-timing-capture.md): coarse stage and per-pass timing recipe for post-heavy routes
- [r3f-triage-notes.md](r3f-triage-notes.md): fast triage notes for separating React churn from renderer cost
- [bottlenecks.md](bottlenecks.md): classify the hotspot cleanly
- [diagnosis-sequence.md](diagnosis-sequence.md): investigate in a fixed order
- [device-targets.md](device-targets.md): set a concrete performance contract
- [degradation-ladders.md](degradation-ladders.md): design quality tiers that preserve the important look
- [../assets/report-template.md](../assets/report-template.md): fixed output format for the final diagnosis

## Maintainer Notes

- [upgrade-plan.md](upgrade-plan.md): recommended path to evolve `perf-doctor` from a diagnosis guide into a validated diagnosis workflow
- [../fixtures/README.md](../fixtures/README.md): canonical diagnosis cases and sample reports for the main `perf-doctor` bottleneck branches

## Operating Principle

Do not prescribe optimization from instinct alone. Name the runtime surface, the evidence, the bottleneck class, and the lowest-risk fix to test first.

# Performance Doctor Fixtures

This directory contains report-centric fixtures for the main `perf-doctor` diagnosis branches.

These fixtures are not runnable demos. They are canonical diagnosis examples that show:

- how to frame the problem
- what the first capture should be
- how the fixed report template should be filled
- how to record unknowns without pretending certainty

## Fixtures

- [draw-call-saturation/README.md](draw-call-saturation/README.md): WebGL scene-graph and draw-call pressure with a clear CPU-side dominant bottleneck
- [post-chain-cost/README.md](post-chain-cost/README.md): fullscreen pass cost concentrated in a layered post stack
- [react-churn-r3f/README.md](react-churn-r3f/README.md): `@react-three/fiber` interaction hitching with a valid `partially-diagnosed` outcome

## Operating Principle

Each fixture should prove one dominant diagnosis branch with the smallest honest example. If a fixture mixes too many major bottlenecks, split it before treating it as canonical.

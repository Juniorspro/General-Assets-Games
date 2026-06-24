# Draw Call Saturation

Canonical `perf-doctor` fixture for a scene-graph and draw-call bottleneck.

## Background

A product configurator scene renders hundreds of individually selectable props. Most props share geometry families, but the scene currently mounts them as separate meshes with several near-duplicate materials.

## Known Symptoms

- frame time rises sharply when the full showroom is visible
- camera movement stays choppy even with post disabled
- lowering DPR helps only a little

## Expected Dominant Bottleneck

`Scene-graph / draw-call saturation`

## Recommended First Capture

Capture one `renderer.info` snapshot on the worst showroom view, then rerun the same view with half the visible prop count.

## Case Status

`diagnosed`

## Report

- [report.md](report.md)

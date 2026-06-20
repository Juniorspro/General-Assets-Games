# React Churn In R3F

Canonical `perf-doctor` fixture for an `@react-three/fiber` interaction hitch with incomplete but actionable evidence.

## Background

An editor-style scene uses `@react-three/fiber` with many interactive nodes. Hover and selection state are mirrored into React state so inspector panels and in-canvas outlines stay synchronized.

## Known Symptoms

- pointer move causes visible hitches even when the camera is static
- lowering DPR does not help much
- static idle view is close to budget, but interaction spikes are not

## Expected Dominant Bottleneck

`Main-thread / React churn`

## Recommended First Capture

Record a browser flame chart during a hover sweep, then compare it with the same sweep after disabling pointer handlers and selection state updates.

## Case Status

`partially-diagnosed`

## Report

- [report.md](report.md)

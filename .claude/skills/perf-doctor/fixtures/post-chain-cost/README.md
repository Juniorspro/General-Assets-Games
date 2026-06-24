# Post Chain Cost

Canonical `perf-doctor` fixture for a fullscreen-pass bottleneck.

## Background

A hero landing scene uses a layered post stack for bloom, SSAO, depth-of-field, and film grain. The scene geometry is moderate, but the route misses budget on laptop GPUs.

## Known Symptoms

- frame time scales hard with DPR
- disabling post restores target FPS immediately
- scene complexity changes matter less than fullscreen effect toggles

## Expected Dominant Bottleneck

`Post / fullscreen pass chain`

## Recommended First Capture

Log pass-local timings for the active post stack, then rerun the same camera state with the entire post path disabled.

## Case Status

`diagnosed`

## Report

- [report.md](report.md)

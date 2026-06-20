# WGSL WebGPU-Only Case

Report-centric `shader-port` fixture for the WebGPU-only route:

- classification: `compute-storage-pipeline`
- authoring route: `tsl-webgpu-only`
- status label: `webgpu-only`

This case covers shader logic whose correctness depends on storage or compute-style behavior and therefore cannot honestly promise `WebGL2` parity.

## Why This Fixture Exists

It keeps the repository honest about the easiest over-promise in shader migration work:

- saying "TSL can handle it" without saying "only on WebGPU"

## Notes

- This fixture is report-only in v1.
- Its purpose is route honesty, not runnable parity.

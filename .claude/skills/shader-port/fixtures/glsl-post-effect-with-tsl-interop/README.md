# GLSL Post Effect With TSL Interop

Report-centric `shader-port` fixture for the narrow interop branch:

- classification: `fullscreen-post`
- authoring route: `tsl-plus-interop`
- status label: `ported-with-scoped-interop`

This case exists for legacy fullscreen post effects that are mostly clean to port into TSL, except for one small native helper that is clearer to keep isolated.

## Why This Fixture Exists

It demonstrates the difference between:

- a small, named helper boundary that still keeps the port maintainable
- an opaque fragment blob that should have been classified as `legacy-webgl-raw`

## Notes

- This fixture is report-only in v1.
- The validator treats it as a contract sample, not as a runnable demo.

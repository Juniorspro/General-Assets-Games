# Shader Port References

Use this reference pack when moving a standalone shader into a correct, current, maintainable Three.js implementation.

## Suggested Order

1. [source-intake.md](source-intake.md)
2. [tsl-mapping.md](tsl-mapping.md)
3. [coordinate-mapping.md](coordinate-mapping.md)
4. [resource-mapping.md](resource-mapping.md)
5. [porting-notes.md](porting-notes.md)
6. [verification-checklist.md](verification-checklist.md)
7. [../assets/report-template.md](../assets/report-template.md)
8. [../assets/fixture-schema.json](../assets/fixture-schema.json)
9. [../fixtures/README.md](../fixtures/README.md)

## What Each File Does

- [source-intake.md](source-intake.md): classify what the source shader actually depends on
- [tsl-mapping.md](tsl-mapping.md): map common shader constructs into the current TSL surface
- [coordinate-mapping.md](coordinate-mapping.md): convert screen-space assumptions into Three.js-friendly coordinates
- [resource-mapping.md](resource-mapping.md): route uniforms, textures, buffers, and multipass state
- [porting-notes.md](porting-notes.md): choose the authoring route and state hard constraints honestly
- [verification-checklist.md](verification-checklist.md): validate compilation, parity, and fallback honesty
- [../assets/report-template.md](../assets/report-template.md): fixed report shape for checked-in shader-port examples
- [../assets/fixture-schema.json](../assets/fixture-schema.json): canonical enums and route-to-status contract for `fixture.json`
- [../fixtures/README.md](../fixtures/README.md): route archetypes and the minimal fixture contract used by the validator

## Operating Principle

Preserve the important behavior, not the original file structure, and do not promise a backend contract that the current Three.js APIs do not support.

# Blocked Multipass Missing Assets

Report-centric `shader-port` fixture for the blocked branch:

- classification: `multipass-post`
- authoring route: `blocked`
- status label: `blocked`

This case covers the most important failure mode in shader migration work: missing buffers, hidden textures, or incomplete pass topology that makes an honest port impossible.

## Why This Fixture Exists

It gives the validator and maintainers one canonical place to say:

- the source is incomplete
- the missing artifacts matter
- the correct next action is to stop, not to improvise

## Notes

- This fixture is intentionally non-runnable.
- The blocker is source completeness, not lack of effort.

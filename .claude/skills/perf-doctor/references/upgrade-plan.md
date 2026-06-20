# Performance Doctor Upgrade Plan

This document defines the recommended upgrade path for `perf-doctor` as a maintainer-facing workflow skill.

## Goal

Upgrade `perf-doctor` from a diagnosis-method guide into a diagnosis workflow with:

- canonical cases
- fixed report-shape enforcement
- low-friction evidence-capture aids
- explicit acceptance criteria

## Non-Goals

- Do not turn `perf-doctor` into an automatic optimizer.
- Do not require runnable demos for the skill to be useful.
- Do not pretend performance diagnosis can be reduced to a deterministic score.
- Do not add Phase 4 runnable benchmark fixtures in the current upgrade track.

## Current Strengths

`perf-doctor` already has a solid diagnosis core:

- route-first workflow in [`../SKILL.md`](../SKILL.md)
- fixed report contract in [`../assets/report-template.md`](../assets/report-template.md)
- evidence-first investigation order in [`diagnosis-sequence.md`](diagnosis-sequence.md)
- practical measurement guidance in [`instrumentation.md`](instrumentation.md)

The main gap is not diagnosis logic. The main gap is maintainable calibration.

## Current Gaps

The skill still lacks the pieces that make a workflow teachable and enforceable:

- no case library with canonical report examples
- no fixture-level validator for report shape
- no sample set that shows what a good diagnosis looks like
- no compact capture recipes or snippets that reduce operator variance

One correction to keep explicit: `perf-doctor` already has instrumentation guidance in [`instrumentation.md`](instrumentation.md). The upgrade should extend that guidance with executable recipes and case-linked examples, not replace it with another large theory document.

## Target State

The upgrade is complete when `perf-doctor` has:

1. a small diagnosis case library under `fixtures/`
2. one structured `report.md` per case
3. a validator that checks fixture structure and report section order
4. capture aids that make route discovery and evidence collection easier to execute
5. maintainer documentation and CI wiring that keep the fixture corpus from drifting

## Priority

Priority: `P1-medium`

Reasoning:

- the skill already clears the method baseline
- the most valuable missing layer is consistency, not more theory
- the upgrade can stay lightweight if it remains report-centric

## Phase 1: Add A Report-Centric Case Library

Add:

- `skills/perf-doctor/fixtures/README.md`
- `skills/perf-doctor/fixtures/<case>/README.md`
- `skills/perf-doctor/fixtures/<case>/report.md`

Recommended first cases:

- `draw-call-saturation/`
- `post-chain-cost/`
- `react-churn-r3f/`
- `resize-thrash/` or `upload-thrash/` as separate cases, not one mixed case

Case requirements:

- short problem background
- known symptoms
- expected dominant bottleneck
- recommended first capture
- one structured `report.md` using the fixed template shape
- explicit status such as `diagnosed` or `partially-diagnosed`

At least one early case should intentionally be `partially-diagnosed` and model honest unknowns plus the next capture to run. The corpus should teach disciplined diagnosis, not only idealized wins.

Reasoning:

- performance work is easy to hand-wave and hard to calibrate
- a case library provides a concrete answer shape without requiring runnable scenes
- validator work is much more useful once canonical cases already exist

## Phase 2: Add A Fixture Validator

Add:

- `scripts/validate_perf_doctor_fixtures.py`

Validate only repository-owned fixtures under `skills/perf-doctor/fixtures/`.

Initial checks should stay narrow:

- required file presence per case
- required section order from [`../assets/report-template.md`](../assets/report-template.md)
- required report anchors such as `Final Call`
- explicit unknowns or next-capture rows when the case is marked `partially-diagnosed`

The validator should not:

- score diagnosis quality
- enforce specific numeric conclusions
- claim a recommendation is correct just because the markdown shape is valid

Reasoning:

- the repository needs structure enforcement, not fake certainty
- fixture-only scope keeps the validator cheap to maintain
- a narrow contract is easier to trust and less likely to block valid future cases

## Phase 3: Add Capture Recipes, Not Another Large Reference Pack

Add a small set of low-friction capture aids under `references/` or `assets/`.

Recommended additions:

- `renderer.info` capture recipe
- pass-timing capture recipe
- route-discovery snippet for `WebGLRenderer` versus `WebGPURenderer`
- R3F triage notes for render churn and event churn

This phase should extend [`instrumentation.md`](instrumentation.md), not duplicate it. Prefer compact snippets, copy-paste probes, and case-linked checklists over broad narrative documentation.

Reasoning:

- current measurement guidance is good but still operator-dependent
- the missing layer is "how to capture quickly," not "why measurement matters"

## Stop Line

This upgrade stops after Phase 3.

The fixture pack remains report-centric on purpose. If maintainers ever revisit runnable benchmarks later, that should be treated as a separate proposal with its own cost review, not as part of this plan.

## File Impact

Planned additions:

- `skills/perf-doctor/fixtures/README.md`
- `skills/perf-doctor/fixtures/<case>/README.md`
- `skills/perf-doctor/fixtures/<case>/report.md`
- `scripts/validate_perf_doctor_fixtures.py`
- focused capture-recipe docs or snippets

Planned updates:

- `skills/perf-doctor/SKILL.md`
- `skills/perf-doctor/references/README.md`
- `.github/workflows/validate.yml`
- `.github/pull_request_template.md`

Update these only if the validator becomes contributor-facing:

- `README.md`
- `README.zh-CN.md`
- `CONTRIBUTING.md`

The top-level docs do not need plan details, but they should mention any new required validation command once the validator is part of the standard workflow.

## Acceptance Criteria

The upgrade is complete when all of the following are true:

1. at least three representative diagnosis cases exist
2. each case includes a structured `report.md`
3. at least one case models a valid `partially-diagnosed` outcome
4. the new validator checks fixture shape and report contract
5. CI runs the validator
6. `SKILL.md` treats the case library as part of the skill, not an optional extra

## Risks And Controls

### Risk: False Precision

If the validator is too strong, maintainers may treat diagnosis as statically provable.

Control:

- validate structure and reporting discipline only
- never validate bottleneck truth claims numerically

### Risk: Mixed-Symptom Cases

If one case mixes multiple major bottlenecks, it stops being a good teaching sample.

Control:

- keep each early case centered on one dominant bottleneck
- split `upload-thrash` and `resize-thrash` unless the point of the case is specifically to separate them

### Risk: Documentation Bloat

If Phase 3 becomes another large theory pack, it duplicates existing references without improving execution.

Control:

- add small capture recipes and snippets
- link each recipe to a concrete case when possible

## Recommended Implementation Order

First wave:

1. add `fixtures/` and case skeletons
2. write three to four canonical `report.md` files
3. add `validate_perf_doctor_fixtures.py`

Second wave:

4. add compact capture recipes and snippets
5. update `SKILL.md` and `references/README.md`
6. wire the validator into CI and contributor-facing docs if needed

## Final Recommendation

The right upgrade path is:

- case library first
- fixture validator second
- compact capture recipes third

That keeps `perf-doctor` grounded in evidence, teaches maintainers what a good diagnosis looks like, and adds enforcement without turning the skill into a brittle rules engine.

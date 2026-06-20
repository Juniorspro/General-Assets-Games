---
name: replicator
license: MIT
description: Use when the task is to analyze or recreate a reference-driven Three.js effect from a URL, demo, repo, video, screenshot, image, or keyword/topic prompt, especially when fidelity to an external visual source matters.
metadata:
  category: threejs
  render_backends:
    - webgpu
    - webgl2
  shader_language: tsl
  skill_type: workflow
  owns_templates: "true"
  owns_scaffolder: "true"
---

# Three.js Replicator

## Overview

Recreate reference-driven effects with an evidence-first orchestration workflow: lock the reference contract, choose the dominant archetype, identify the specialist branches that matter, implement the dominant route, then validate fidelity honestly.

`replicator` remains the canonical full-remake entry point. It owns reference access, mode selection, archetype routing, cross-source alignment, and final fidelity review. It does not replace specialist skills for material routing, shader-port policy, or performance diagnosis.

Default stance:

- prefer visual fidelity over premature optimization
- prefer the smallest honest route that preserves the look
- escalate to a specialist skill when uncertainty is domain-specific rather than remake-wide

## Accept Multimodal Inputs

Treat all of the following as valid entry points:

- URLs to demos, posts, repos, videos, articles, or code sandboxes
- keywords or topic prompts such as an effect name, style, or rendering technique
- image URIs, screenshots, or local image paths
- mixed input sets that combine any of the above

Normalize the intake before route selection:

- `primary`: main reference that defines silhouette, motion language, and composition
- `secondary`: explicit module donor such as post polish, surface treatment, or interaction
- `accent`: palette, timing, or a narrow finish cue only
- `derived`: reference discovered during research from a keyword-only or image-first start

For keyword-only or image-only starts:

- derive 3 to 8 English-first search phrases from the visible cues
- gather 2 to 5 high-signal references before fixing the route
- promote one candidate to `primary` and record why it won
- use `AskUserOption` only when the remaining ambiguity materially changes the remake plan

Do not reject the task merely because the user did not provide a URL.

## Enforce Evidence Gates

Use these hard rules for every reference-driven remake:

1. Reference access gate

- If the task is `faithful-remake`, require at least one accessible primary visual artifact before implementation: inspectable URL, screenshot, video, local image or video, or a high-confidence multi-source replacement set.
- Product copy, SEO summaries, titles, feature lists, and search snippets are not enough for a faithful route.
- If the gate fails, do not start implementation. Ask for stronger reference material or block the faithful route.

2. Mode contract

- Classify the task as `faithful-remake`, `approximation-from-limited-evidence`, or `inspired-variant` before implementation.
- If the user asked for faithful but the gate failed, do not silently continue as faithful. Request approval to downgrade or stop.

3. Visual evidence table

- Build a table with `Module`, `Target visual trait`, `Evidence source`, `Confidence`, and `Implementation plan` before implementation.
- Cover framing or camera language, silhouette or shape language, motion behavior, palette or tonal range, atmosphere or post, interaction cues, and any signature modules.

4. Classic graphics baseline fallback

- When the target reference is accessible but completion depth is unclear, use canonical graphics or game-industry references only to decide what a competent implementation normally includes.
- Record separately what came from the target reference versus the classic baseline.

5. No blind filling rule

- If a critical module lacks evidence, do not invent concrete scene dressing or style choices and pretend they came from the reference.
- Only add placeholder content when approximation or inspired mode is explicit and the report says it is not reference-driven.

6. First-frame review gate

- Stage A locks composition, silhouette, primary material relationships, main form profile, and the primary light or color read.
- Only after Stage A is close enough should Stage B add animation, post, review artifacts, and polish.

7. Browser validation gate

- Do not call a visual effect runnable or validated until it opens over `http://localhost/...`, the renderer initializes, no obvious runtime failure appears, and the effect renders in-browser.

8. Review artifact gate

- Record at least one task-appropriate review artifact or review note before calling fidelity reviewed or complete.
- Use stills for silhouette, palette, finish, and composition. Use clips, GIFs, or interaction notes when motion or input behavior is central.

9. Fidelity failure protocol

- Diagnose fidelity failures in this order: reference understanding, route selection, missing critical modules, then parameter tuning.
- Do not default to tuning before checking the first three layers.

10. Honest status labels

- Use `blocked-on-reference`, `planned`, `first-runnable-pass`, `browser-validated`, `evidence-reviewed`, `fidelity-pending`, and `faithful-remake-complete`.
- Do not call a remake complete without a task-appropriate comparison review.

11. Completion rule

- A remake is not complete until an active reference artifact and at least one task-appropriate current review artifact or review note exist, they have been compared using the right medium, and the remaining gaps are below the acceptance threshold or explicitly documented.

12. Operating principle

- The job is not merely to produce a plausible effect. The job is to stay evidentially aligned with the target.

## Escalate Material Choices With AskUserOption

Use `AskUserOption` only for decisions that change product intent, compatibility promises, maintenance cost, or acceptance criteria.

Do not ask the user to choose low-level implementation details that can be decided cleanly from the references and constraints.

Good `AskUserOption` prompts are coarse downstream-shaping choices with 2 to 4 concrete options and one recommended default.

Bad `AskUserOption` prompts are:

- numeric tuning values
- pass-local implementation details
- choices already forced by the reference or browser target
- questions whose answers would not change the implementation plan

Ask at most 2 to 4 questions total. If more uncertainty exists, rank the decisions by impact and ask only the ones that materially change the route.

Use this matrix:

| Decision area | Ask when | Structured options | Default stance |
| --- | --- | --- | --- |
| Delivery intent | User shared a reference but did not say whether the goal is exact match, constrained approximation, or inspired variant | `faithful-remake`, `approximation-from-limited-evidence`, `inspired-variant` | Prefer `faithful-remake` unless the reference gate fails or the user signals creative freedom |
| Renderer and compatibility contract | The effect could land on either `WebGPU` or `WebGL2`, and browser reach or maintenance cost is unclear | `desktop-webgpu`, `webgl2-first`, `desktop-webgpu-plus-webgl2-fallback` | Prefer `desktop-webgpu` for controlled demos and `webgl2-first` for compatibility-sensitive demos |
| Route arbitration | Two archetypes or pipelines preserve different non-negotiable traits from the references | `route-a`, `route-b`, `hybrid-follow-up` | Prefer one dominant route first |
| Interaction scope | The reference suggests pointer, scroll, camera, or audio interaction but the required scope is unclear | `no-extra-interaction`, `pointer-only`, `rich-interaction` | Prefer `pointer-only` when interaction affects the look but is not the main product requirement |

Each `AskUserOption` prompt should include:

- what decision is being made
- why it changes the implementation plan
- 2 to 4 options with explicit tradeoffs
- one recommended option
- what happens if the user does not answer and the default is applied

## Route By Archetype First

Pick the closest archetype before you do deep research or implementation planning.

Use [references/archetypes.md](references/archetypes.md) as the routing table.

Canonical archetypes:

- `material-study`
- `scene-post`
- `fullscreen-raymarch`
- `instanced-particles`
- `feedback-trails`
- `mixed`

If the effect spans multiple archetypes, choose the dominant one and call out the secondary archetype in `REPORT.md`.

If the user provides multiple references, do not average them blindly. Rank them first:

- primary reference: defines the core silhouette, motion language, and composition
- secondary reference: contributes one or two explicit modules such as post polish, surface treatment, or interaction
- accent reference: contributes palette, timing, or a narrow finish detail only

If two references conflict, preserve the primary reference and treat the other one as an optional module or a rejected route.

## What Replicator Owns

- multimodal remake intake
- reference access gate
- mode contract
- archetype routing
- visual evidence table
- cross-source conflict resolution
- overall remake plan ownership
- final fidelity review and honest status reporting

## What Replicator Does Not Own

- material-family classification and surface-route selection
- shader-source classification and port-route policy
- runtime-route discovery, instrumentation, bottleneck diagnosis, and degradation planning

## Escalation Rules

- Use `material-lab` when the remake is blocked by material model, lighting interpretation, scan cleanup, transmission, translucency, thickness, or SSS decisions.
- Use `shader-port` when the remake includes a standalone shader source or when the main uncertainty is TSL fit, interop scope, backend contract, or raw fallback policy.
- Use `perf-doctor` when the remake is visually understood but blocked by frame budget, bottleneck diagnosis, device targeting, or quality ladder design.

These are routing conditions, not invitations to restate the downstream skill workflow inside `replicator`.

## Do Not Use The Full Workflow For

- pure material or lighting exploration with no external reference to match
- isolated renderer or compatibility decisions with no reference-driven remake
- pure performance diagnosis or degradation planning
- pure post-chain design or feedback-buffer routing with no reference-driven remake

## Deliver Required Outputs

Produce all of the following for each remake:

- reference-access decision
- active mode contract and honest status label
- chosen archetype and rejected alternative
- visual evidence table
- measurable effect spec
- specialist decision log when escalation happened
- runnable demo under `effects/<effect-slug>/`
- browser-validation note
- review-artifact note
- reference-vs-current fidelity review
- current `REPORT.md`

## Workflow

1. Lock the reference access decision and active mode contract.
2. Route the dominant archetype and reject the nearest wrong route.
3. Build the visual evidence table and measurable effect spec.
4. Identify whether the main uncertainty is material, shader, performance, or general remake orchestration.
5. Resolve specialist uncertainty through the dedicated skill when needed.
6. Implement the dominant route.
7. Run browser validation and task-appropriate fidelity review.
8. Update `REPORT.md` with decisions, current status, and remaining gaps.

## References To Load On Demand

Load only the files that help the current task:

- [references/archetypes.md](references/archetypes.md) for initial archetype routing
- [references/research.md](references/research.md) for source parsing, link-tree expansion, and research coverage
- [references/visual-quality.md](references/visual-quality.md) for effect-spec writing and visual self-checks
- [references/fidelity-rubric.md](references/fidelity-rubric.md) for acceptance scoring and review-artifact choice
- [assets/report-template.md](assets/report-template.md) for the required report skeleton
- [`scripts/init_effect.py`](scripts/init_effect.py) for scaffolding `effects/<effect-slug>/`
- [`scripts/capture_audit.py`](scripts/capture_audit.py) for `review-artifacts/manifest.json` and `review-artifacts/review.md`

Load platform, post, or performance references only when the chosen route or specialist branch requires them. Do not restate those references as top-level mandatory workflow.

Useful on-demand specialist references:

- [references/platform/interface-decision-tree.md](references/platform/interface-decision-tree.md)
- [references/platform/authoring-paths.md](references/platform/authoring-paths.md)
- [references/platform/backend-capability-matrix.md](references/platform/backend-capability-matrix.md)
- [references/platform/webgpu-resource-patterns.md](references/platform/webgpu-resource-patterns.md)
- [references/platform/pipeline-archetypes.md](references/platform/pipeline-archetypes.md)
- [references/platform/renderer-compatibility.md](references/platform/renderer-compatibility.md)
- [references/platform/official-threejs-webgpu.md](references/platform/official-threejs-webgpu.md)
- [references/platform/version-compatibility.md](references/platform/version-compatibility.md)
- [references/postfx/post-chain-selection.md](references/postfx/post-chain-selection.md)
- [references/postfx/render-target-patterns.md](references/postfx/render-target-patterns.md)
- [references/postfx/history-feedback.md](references/postfx/history-feedback.md)
- [references/postfx/quality-tiering.md](references/postfx/quality-tiering.md)
- [references/postfx/code-patterns.md](references/postfx/code-patterns.md)
- [references/postfx/official-three-postfx.md](references/postfx/official-three-postfx.md)
- [references/performance/device-targeting.md](references/performance/device-targeting.md)
- [references/performance/bottleneck-diagnosis.md](references/performance/bottleneck-diagnosis.md)
- [references/performance/degradation-playbook.md](references/performance/degradation-playbook.md)
- [references/performance/profiling-checklist.md](references/performance/profiling-checklist.md)
- [references/gui.md](references/gui.md)

## Keep Decisions Explicit

State these decisions clearly in the report and user-facing summary:

- which reference artifact unlocked the task
- which mode contract and status label are active
- which archetype was chosen and why
- which modules were evidenced, inferred, or unknown
- which specialist branches were escalated and why
- whether browser validation passed
- what medium was used for fidelity review
- what remains blocked before completion

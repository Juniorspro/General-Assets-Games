# __EFFECT_TITLE__ Replication Report

## Summary

- Goal:
- Status: `__STATUS_LABEL_OPTIONS__`
- Mode contract: `__MODE_CONTRACT_OPTIONS__`
- Reference access gate: `__REFERENCE_ACCESS_GATE_OPTIONS__`
- Primary visual artifact:
- Review artifact gate: `__REVIEW_ARTIFACT_GATE_OPTIONS__`
- Review artifact type:
- Confidence:
- Effect archetype:
- Authoring path:
- Runtime renderer:
- Resource model:
- Pass topology:
- Compatibility contract:
- Target device class:
- Performance contract:
- Dominant bottleneck:
- Post pipeline type:
- Render-target layout:
- History requirement:
- Fallback path:

## Reference Access Gate

| Field | Value | Notes |
| --- | --- | --- |
| Requested delivery mode | `__MODE_CONTRACT_OPTIONS__` | `What the user asked for or what the task implies` |
| Accessible primary visual artifact | `TODO` | `direct URL/screenshot/video/local asset/replacement set` |
| Gate result | `passed/blocked/pending` | `Whether faithful implementation is allowed to start` |
| Blocking action or downgrade | `TODO` | `Requested stronger reference or explicit downgrade reason` |

## Mode Contract

| Field | Choice | Notes |
| --- | --- | --- |
| Requested mode | `__MODE_CONTRACT_OPTIONS__` | `Original request or inferred product intent` |
| Active mode | `__MODE_CONTRACT_OPTIONS__` | `Mode actually used for implementation` |
| User approval for downgrade | `yes/no/not-needed/not-recorded` | `Required when faithful was requested but the task had to downgrade` |
| Honest status label | `__STATUS_LABEL_OPTIONS__` | `Current truthful state of the work` |

## User Decision Log

| Decision | Why it was asked | Options shown | Selected answer | Impact on plan |
| --- | --- | --- | --- | --- |
| `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |

## Input Set

| Input | Type | Role | Contribution |
| --- | --- | --- | --- |
| `TODO` | `__ACCEPTED_SOURCE_TYPE_OPTIONS__` | `__SOURCE_ROLE_OPTIONS__` | `TODO` |

## Archetype Route

| Field | Choice | Notes |
| --- | --- | --- |
| Chosen archetype | `material-study/scene-post/fullscreen-raymarch/instanced-particles/feedback-trails/mixed` | `Why this route fits the effect` |
| Nearest rejected route | `TODO` | `Why it was not selected` |
| Internal decision domains | `implementation surface/post pipeline/performance contract` | `Which ones materially shaped the plan` |

## Visual Evidence Table

| Module | Target visual trait | Evidence source | Confidence | Implementation plan |
| --- | --- | --- | --- | --- |
| Framing / camera language | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Silhouette / shape language | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Motion behavior | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Reflection / refraction behavior | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Palette / tonal range | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Atmosphere / post | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Interaction cues | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |
| Signature module | `TODO` | `TODO` | `high/medium/low/unknown` | `TODO` |

## Classic Graphics Baseline

| Field | Choice | Notes |
| --- | --- | --- |
| Baseline needed | `yes/no` | `Use only when completion depth is unclear` |
| Source classes used | `paper/talk/book/game-engine blog/official tech article` | `What informed the baseline` |
| Baseline modules implied | `TODO` | `What a competent implementation normally includes` |
| Target-look override guard | `TODO` | `How the baseline was prevented from replacing the target look` |

## Link Tree

```text
[0] TODO - chosen primary external reference
  [1] TODO - technique explanation
    [2] TODO - implementation detail
      [3] TODO - pitfall or optimization note
```

## External Links

| Link | Type | Contribution |
| --- | --- | --- |
| `TODO` | `paper/repo/demo/discussion/doc` | `TODO` |

## Solution Hierarchy

| Priority | Source type | Candidate | Why it matters |
| --- | --- | --- | --- |
| `1` | `mainstream/paper/talk/canonical repo` | `TODO` | `TODO` |
| `2` | `UE5/Unity/custom renderer` | `TODO` | `TODO` |
| `3` | `Three.js landing path` | `TODO` | `TODO` |

## Comment Takeaways

| Source | Takeaway | Evidence |
| --- | --- | --- |
| `TODO` | `TODO` | `quote/paraphrase` |

## Terminology and Modules

| Module | Keywords | Why it matters |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Search Log

| Query | Why it mattered | Decision changed |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Delegated Research

| Task | Scope | Key findings | Impact on plan |
| --- | --- | --- | --- |
| `TODO` | `TODO` | `TODO` | `TODO` |

## Evidence vs Inference

| Claim | Status | Evidence |
| --- | --- | --- |
| `TODO` | `evidenced/inferred/uncertain` | `TODO` |

## Shortest Convincing Path

- `TODO`

## Research Coverage

| Module | Principle source | Implementation source | Pitfall source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `TODO` | `TODO` | `TODO` | `TODO` | `covered/gap` | `TODO` |

## Effect Spec

- Shape:
- Surface and lighting:
- Atmosphere and post:
- Motion:
- Interaction:
- Invariants:
- Constraints:

## Implementation Surface Decision

| Field | Choice | Notes |
| --- | --- | --- |
| Authoring path | `pure-tsl/tsl-plus-interop/raw-wgsl/raw-glsl/dual-path` | `Why this path fits the task` |
| Runtime renderer | `webgpu-renderer/webgl-renderer/dual-renderer` | `Why this renderer was selected` |
| Resource model | `uniforms/instanced-attributes/sampled-textures/storage-buffer/storage-texture/render-target-history` | `Why this data model fits` |
| Pass topology | `single-pass-material/fullscreen-procedural/scene-plus-post/simulation-plus-render/feedback-loop/compute-plus-render` | `Why this pipeline shape fits` |
| Compatibility contract | `desktop-webgpu/desktop-webgpu-plus-webgl2-fallback/webgl2-first` | `What browser support this plan assumes` |
| Rejected options | `TODO` | `Why they were not selected` |
| Fallback path | `TODO` | `When to use it` |

## Implementation Surface Check

| Module | Authoring fit | Renderer dependency | Resource need | Fallback need | Notes |
| --- | --- | --- | --- | --- | --- |
| `TODO` | `pure-tsl/tsl-plus-interop/raw shader` | `shared/webgpu/webgl2` | `uniforms/textures/history/storage` | `none/partial/full` | `TODO` |

## Final Implementation Plan

| Module | Choice | Required or replaceable | Reason |
| --- | --- | --- | --- |
| `TODO` | `TODO` | `required/replaceable` | `TODO` |

## First-Frame Review Gate

| Check | Status | Notes |
| --- | --- | --- |
| Composition and framing | `pass/rework/pending` | `TODO` |
| Silhouette / form profile | `pass/rework/pending` | `TODO` |
| Primary material relationship | `pass/rework/pending` | `TODO` |
| Primary light and color read | `pass/rework/pending` | `TODO` |
| Gate decision | `pass/rework/pending` | `Why Stage B was allowed or blocked` |

## Technique Routing

| Module | Backend dependency | Required or replaceable | Notes |
| --- | --- | --- | --- |
| `TODO` | `WebGPU/WebGL2/shared` | `required/replaceable` | `TODO` |

## Pass Graph

| Pass | Inputs | Outputs | Notes |
| --- | --- | --- | --- |
| `TODO` | `TODO` | `TODO` | `TODO` |

## PostFX Decision

| Field | Choice | Notes |
| --- | --- | --- |
| Post pipeline type | `none/scene-polish/selective-post/feedback-post/fullscreen-stack` | `What kind of post stack this effect needs` |
| Render-target layout | `backbuffer-only/single-intermediate/ping-pong-history/multi-target/selective-mask-chain` | `How intermediates and masks are organized` |
| Pass order | `TODO` | `Ordered pass list` |
| History requirement | `none/optional/required` | `Whether prior frames are part of the real look` |
| Quality tiers | `TODO` | `Ordered degradation steps for the post stack` |
| Exposed post controls | `TODO` | `Safe user-facing post controls` |
| Hidden post controls | `TODO` | `Debug-only or destructive post controls` |

## Performance Decision

| Field | Choice | Notes |
| --- | --- | --- |
| Target device class | `desktop-high/desktop-mid/laptop-balanced/mobile-safe` | `What hardware class this plan targets by default` |
| Performance contract | `fidelity-first/balanced/fps-first` | `How look versus responsiveness is prioritized` |
| Dominant bottleneck | `fill-rate/ray-steps/particle-count/bandwidth/post-chain/cpu-driver/unknown` | `What first explains the cost` |
| Degradation ladder | `TODO` | `Ordered list of quality levers` |
| Exposed controls | `TODO` | `Safe user-facing knobs` |
| Hidden controls | `TODO` | `Debug-only or dangerous knobs` |

## GUI

| Group | Controls |
| --- | --- |
| `Renderer` | `TODO` |
| `Post` | `TODO` |
| `Style` | `TODO` |
| `Animation` | `TODO` |

## Performance and Degradation

| Switch | Default | Expected impact |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Profiling Notes

| Check | Status | Notes |
| --- | --- | --- |
| Device contract | `TODO` | `TODO` |
| Bottleneck confidence | `TODO` | `TODO` |
| First degradation step | `TODO` | `TODO` |
| GUI safety | `TODO` | `TODO` |

## Browser Validation Gate

| Check | Status | Notes |
| --- | --- | --- |
| Localhost preview URL | `pass/fail/pending` | `http://localhost/...` |
| Renderer initialized | `pass/fail/pending` | `TODO` |
| Runtime errors | `none-observed/issue-found/pending` | `TODO` |
| In-browser render confirmed | `pass/fail/pending` | `TODO` |

## Review Artifact Gate

| Check | Status | Notes |
| --- | --- | --- |
| Review artifact type | `__REVIEW_ARTIFACT_TYPE_OPTIONS__` | `Choose the medium that actually represents the effect` |
| Reference artifact recorded | `pass/fail/pending/not-needed` | `TODO` |
| Current artifact recorded | `pass/fail/pending/not-needed` | `TODO` |
| Comparison method appropriate | `pass/fail/pending` | `Why this artifact type matches the archetype` |
| Comparison notes written | `pass/fail/pending` | `TODO` |

## Visual Acceptance

| Category | Score (0-2) | Gap | Notes |
| --- | --- | --- | --- |
| Silhouette | `TODO` | `TODO` | `TODO` |
| Motion | `TODO` | `TODO` | `TODO` |
| Density | `TODO` | `TODO` | `TODO` |
| Palette | `TODO` | `TODO` | `TODO` |
| Finish | `TODO` | `TODO` | `TODO` |

- Total fidelity score:
- Acceptance target:
- Reference artifacts:
- Current artifacts:

## Fidelity Failure Protocol

| Layer | Status | Notes |
| --- | --- | --- |
| Reference understanding | `checked/issue-found/pending` | `TODO` |
| Route selection | `checked/issue-found/pending` | `TODO` |
| Missing critical modules | `checked/issue-found/pending` | `TODO` |
| Parameter tuning | `checked/issue-found/pending` | `TODO` |

## Completion Rule

| Requirement | Status | Notes |
| --- | --- | --- |
| Active reference artifact in use | `pass/fail/pending` | `TODO` |
| Task-appropriate current review artifact exists | `pass/fail/pending/not-needed` | `TODO` |
| Comparison review completed with the right medium | `pass/fail/pending` | `TODO` |
| Remaining gaps below threshold or documented | `pass/fail/pending` | `TODO` |

## Compatibility Notes

| Target | Status | Notes |
| --- | --- | --- |
| `Modern WebGPU browsers` | `TODO` | `TODO` |
| `WebGL2 fallback path` | `TODO` | `TODO` |

## Official Three.js Validation

| Official source | Decision confirmed | Notes |
| --- | --- | --- |
| `WebGPURenderer docs/manual/examples` | `TODO` | `TODO` |
| `TSL docs/examples` | `TODO` | `TODO` |

## Open Risks

- `TODO`

## Implementation Log

| Date | Change | Reason |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Change Log

| Date | Change | Notes |
| --- | --- | --- |
| `TODO` | `Initial report` | `Created from template` |

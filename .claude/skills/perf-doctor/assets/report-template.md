# __PROJECT_OR_SCENE_NAME__ Performance Report

## Summary

- Status: `diagnosed/partially-diagnosed/blocked`
- Runtime route: `WebGLRenderer/WebGPURenderer` + `vanilla-three/r3f` + `EffectComposer/postprocessing/RenderPipeline/none`
- Target device class: `desktop-high/laptop-balanced/mobile-safe`
- Symptom: `TODO`
- Dominant bottleneck: `TODO`
- Secondary bottleneck: `TODO`
- Lowest-risk fix to test first: `TODO`
- Confidence: `high/medium/low`

## Runtime Route

| Field | Value | Notes |
| --- | --- | --- |
| Renderer path | `WebGLRenderer/WebGPURenderer` | `TODO` |
| Actual backend | `WebGPU/WebGL2/unknown` | `TODO` |
| Framework layer | `vanilla-three/@react-three/fiber` | `TODO` |
| Post stack | `EffectComposer/postprocessing/@react-three/postprocessing/RenderPipeline/none` | `TODO` |
| Browser / OS | `TODO` | `TODO` |
| Scene / route tested | `TODO` | `TODO` |

## Symptom and Repro

| Field | Value | Notes |
| --- | --- | --- |
| Symptom class | `low-fps/stutter/interaction-hitch/thermal/compile-stall/upload-spike/mixed` | `TODO` |
| Repro steps | `TODO` | `Short numbered or plain-language sequence` |
| Repro frequency | `always/intermittent/first-load-only` | `TODO` |
| Tested quality settings | `TODO` | `DPR, shadows, post, quality toggles` |
| Visual invariants | `TODO` | `What must survive optimization` |

## Instrumentation Used

| Instrument | Used | Output captured |
| --- | --- | --- |
| `renderer.info` | `yes/no` | `TODO` |
| Pass-local timings | `yes/no` | `TODO` |
| Browser performance flame chart | `yes/no` | `TODO` |
| GPU or WebGPU tooling | `yes/no` | `TODO` |
| App-specific logs or counters | `yes/no` | `TODO` |

## Baseline Measurements

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| Avg frame time | `TODO` | `TODO` | `ms` |
| Worst-frame time | `TODO` | `TODO` | `ms` |
| FPS | `TODO` | `TODO` | `Optional if frame time is primary` |
| DPR / render size | `TODO` | `TODO` | `TODO` |
| Draw calls | `TODO` | `TODO` | `If available` |
| Triangles / points / lines | `TODO` | `TODO` | `If available` |
| Textures / geometries / programs | `TODO` | `TODO` | `If available` |

## Isolation Results

| Toggle or probe | Observation | What it suggests |
| --- | --- | --- |
| Lower DPR / half resolution | `TODO` | `TODO` |
| Post off | `TODO` | `TODO` |
| Shadows off / frozen | `TODO` | `TODO` |
| Transparency / particles off | `TODO` | `TODO` |
| Object count / visibility reduced | `TODO` | `TODO` |
| Raycast / events off | `TODO` | `TODO` |
| Static camera / animation off | `TODO` | `TODO` |

## Bottleneck Classification

| Bottleneck | Severity | Evidence | Why it is or is not dominant |
| --- | --- | --- | --- |
| Scene-graph / draw-call saturation | `none/low/medium/high` | `TODO` | `TODO` |
| Shadow-map cost | `none/low/medium/high` | `TODO` | `TODO` |
| Transparency / overdraw | `none/low/medium/high` | `TODO` | `TODO` |
| Post / fullscreen pass chain | `none/low/medium/high` | `TODO` | `TODO` |
| Material / program churn | `none/low/medium/high` | `TODO` | `TODO` |
| Upload / allocation / resize thrash | `none/low/medium/high` | `TODO` | `TODO` |
| Raycasting / interaction | `none/low/medium/high` | `TODO` | `TODO` |
| Main-thread / React churn | `none/low/medium/high` | `TODO` | `TODO` |

## Performance Contract

| Field | Choice | Notes |
| --- | --- | --- |
| Device class | `desktop-high/laptop-balanced/mobile-safe` | `TODO` |
| Target FPS | `60/30/other` | `TODO` |
| Frame budget | `16.7ms/33.3ms/other` | `TODO` |
| Fidelity stance | `fidelity-first/balanced/fps-first` | `TODO` |
| Non-negotiable invariants | `TODO` | `TODO` |

## Recommendations

| Priority | Recommendation | Route scope | Expected gain | Risk / tradeoff |
| --- | --- | --- | --- | --- |
| `1` | `TODO` | `WebGL/WebGPU/R3F/wrapper-specific/shared` | `TODO` | `TODO` |
| `2` | `TODO` | `WebGL/WebGPU/R3F/wrapper-specific/shared` | `TODO` | `TODO` |
| `3` | `TODO` | `WebGL/WebGPU/R3F/wrapper-specific/shared` | `TODO` | `TODO` |

## Degradation Ladder

| Tier | Changes | Preserved | When to activate |
| --- | --- | --- | --- |
| Premium | `TODO` | `TODO` | `TODO` |
| Balanced | `TODO` | `TODO` | `TODO` |
| Safe | `TODO` | `TODO` | `TODO` |
| Minimum | `TODO` | `TODO` | `TODO` |

## Unknowns and Next Capture

| Unknown | Why it matters | Next measurement or test |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Final Call

- Dominant bottleneck:
- Secondary bottleneck:
- First fix to ship:
- First fallback tier to wire:
- What not to change yet:

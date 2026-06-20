# Scene Editor Interaction Performance Report

## Summary

- Status: `partially-diagnosed`
- Runtime route: `WebGLRenderer` + `r3f` + `@react-three/postprocessing`
- Target device class: `desktop-high`
- Symptom: `pointer-driven hitches appear during hover and selection sweeps even when the camera is static`
- Dominant bottleneck: `main-thread / React churn`
- Secondary bottleneck: `raycasting / interaction`
- Lowest-risk fix to test first: `stop updating React state from hot pointer paths and isolate hover state from the render tree`
- Confidence: `medium`

## Runtime Route

| Field | Value | Notes |
| --- | --- | --- |
| Renderer path | `WebGLRenderer` | `R3F canvas currently uses the standard WebGL path` |
| Actual backend | `WebGL2` | `Confirmed in browser diagnostics` |
| Framework layer | `@react-three/fiber` | `Editor panels and canvas state share React ownership` |
| Post stack | `@react-three/postprocessing` | `Outline pass and mild tone polish` |
| Browser / OS | `Chrome 123 / macOS` | `Desktop target with integrated GPU still shows hitches` |
| Scene / route tested | `editor/selection mode` | `Hover sweep across a dense object cluster` |

## Symptom and Repro

| Field | Value | Notes |
| --- | --- | --- |
| Symptom class | `interaction-hitch` | `Steady idle render is close to budget, but pointer motion spikes` |
| Repro steps | `Open the editor, enter selection mode, then move the pointer repeatedly across the dense object cluster without moving the camera.` | `Hover outlines and inspector sync are enabled` |
| Repro frequency | `always` | `Happens on every hover sweep` |
| Tested quality settings | `DPR 1.5, outline pass on, shadows on demand, frameloop always` | `Same editor preset across captures` |
| Visual invariants | `keep hover feedback and selection accuracy` | `Can restructure state flow, not remove editor affordances` |

## Instrumentation Used

| Instrument | Used | Output captured |
| --- | --- | --- |
| `renderer.info` | `yes` | `Draw calls are stable and not extreme during the hitch` |
| Pass-local timings | `no` | `Post stack is light and not the main suspect yet` |
| Browser performance flame chart | `yes` | `React commits and event work spike during pointer movement` |
| GPU or WebGPU tooling | `no` | `Evidence still points to CPU-side interaction work first` |
| App-specific logs or counters | `yes` | `Pointer-event rate, selection updates, and commit count` |

## Baseline Measurements

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| Avg frame time | `17.8` | `not measured` | `ms; steady idle average is acceptable, but interaction spikes are the real issue` |
| Worst-frame time | `41.6` | `not measured` | `ms during hover sweep` |
| FPS | `56` | `not measured` | `Average hides the interaction spikes` |
| DPR / render size | `1.5 / 2160x1350` | `not measured` | `Resolution changes did not materially change spike height` |
| Draw calls | `286` | `not measured` | `Stable across hover sweeps` |
| Triangles / points / lines | `1.0M / 0 / 0` | `not measured` | `Scene complexity is moderate` |
| Textures / geometries / programs | `69 / 188 / 19` | `not measured` | `No sign of shader or upload churn in the hitch window` |

## Isolation Results

| Toggle or probe | Observation | What it suggests |
| --- | --- | --- |
| Lower DPR / half resolution | `Only minor improvement in spike height` | `Not primarily fill-rate or fullscreen-pass bound` |
| Post off | `Little change` | `Outline and light post are not leading the hitch` |
| Shadows off / frozen | `Little change` | `Shadows are not driving the interaction spike` |
| Transparency / particles off | `No meaningful change` | `Not an overdraw issue` |
| Object count / visibility reduced | `Some improvement, but spikes remain when hover state updates stay enabled` | `Interaction work scales with scene breadth but is not only raw draw cost` |
| Raycast / events off | `Spike collapses sharply when pointer handlers are disabled` | `Event and interaction path is a major branch` |
| Static camera / animation off | `Static camera alone does not remove the hitch` | `Problem lives in interaction and update flow more than animation` |

## Bottleneck Classification

| Bottleneck | Severity | Evidence | Why it is or is not dominant |
| --- | --- | --- | --- |
| Scene-graph / draw-call saturation | `low` | `Draw calls are stable and moderate` | `Not enough evidence for a renderer-bound root cause` |
| Shadow-map cost | `none` | `Shadow toggles barely move the spike` | `Not relevant` |
| Transparency / overdraw | `none` | `Resolution sensitivity is weak` | `Not relevant` |
| Post / fullscreen pass chain | `low` | `Post-off isolation changes little` | `Secondary at most` |
| Material / program churn | `none` | `No compile or variant churn signal` | `Not relevant` |
| Upload / allocation / resize thrash | `low` | `No resize correlation and no warm-path upload spikes found yet` | `Possible background issue, not the current leader` |
| Raycasting / interaction | `medium` | `Disabling pointer handlers collapses the spike` | `Strong contributing branch` |
| Main-thread / React churn | `high` | `Flame chart shows commit bursts and state propagation during hover sweeps` | `Best current dominant call, but still needs one targeted confirmation capture` |

## Performance Contract

| Field | Choice | Notes |
| --- | --- | --- |
| Device class | `desktop-high` | `Editor targets desktop-class hardware first` |
| Target FPS | `60` | `Hover and selection should remain smooth` |
| Frame budget | `16.7ms` | `Interaction path should not spike far above budget` |
| Fidelity stance | `balanced` | `Keep editor affordances, trade internal architecture first` |
| Non-negotiable invariants | `accurate selection, hover outline, inspector sync` | `May defer sync timing, not remove it` |

## Recommendations

| Priority | Recommendation | Route scope | Expected gain | Risk / tradeoff |
| --- | --- | --- | --- | --- |
| `1` | `Stop calling React state setters from hot pointer-move paths; keep hover state in a mutable store or ref-backed interaction layer and batch UI sync.` | `R3F` | `Likely large reduction in commit spikes` | `Requires explicit synchronization boundary between canvas and inspector UI` |
| `2` | `Narrow the raycast set for hover and selection, and skip hit testing for objects outside the active editing context.` | `R3F/shared` | `Moderate reduction in event-path cost` | `Selection behavior needs validation for hidden or locked nodes` |
| `3` | `Re-test with demand-driven invalidation for inactive editor panels once hot-path state churn is reduced.` | `R3F` | `Potential additional CPU savings` | `Needs careful invalidation coverage to avoid stale UI` |

## Degradation Ladder

| Tier | Changes | Preserved | When to activate |
| --- | --- | --- | --- |
| Premium | `Current outline and full inspector sync with hot-path fixes applied` | `Full editor affordances` | `Desktop target after state-path cleanup` |
| Balanced | `Throttle inspector sync during pointer sweeps while keeping hover outline immediate` | `Selection accuracy and immediate hover feedback` | `Default desktop path if spikes still exceed budget` |
| Safe | `Disable secondary hover adornments and keep only core outline feedback` | `Primary selection affordance` | `Persistent spikes above 20 ms` |
| Minimum | `Coalesce hover updates to a slower cadence during dense sweeps` | `Basic selection feedback` | `Last-resort fallback for weaker desktops` |

## Unknowns and Next Capture

| Unknown | Why it matters | Next measurement or test |
| --- | --- | --- |
| `How much of the remaining spike is React commit cost versus raycast breadth once pointer-state updates are isolated` | `Determines whether the second fix should target state architecture or picking breadth first` | `Repeat the same hover sweep with pointer handlers still active but React state writes replaced by a ref-backed interaction buffer, then compare flame-chart time split` |

## Final Call

- Dominant bottleneck: `Main-thread and React churn on the hover-selection path`
- Secondary bottleneck: `Broad raycast and event work during dense pointer sweeps`
- First fix to ship: `Remove hot-path React state updates from pointer movement before touching GPU quality settings`
- First fallback tier to wire: `Throttle inspector sync during hover sweeps while keeping the core outline`
- What not to change yet: `Do not drop DPR or strip the outline pass before the interaction path is isolated`

# Configurator Showroom Performance Report

## Summary

- Status: `diagnosed`
- Runtime route: `WebGLRenderer` + `vanilla-three` + `none`
- Target device class: `laptop-balanced`
- Symptom: `camera movement drops below target budget when the full showroom is visible`
- Dominant bottleneck: `scene-graph / draw-call saturation`
- Secondary bottleneck: `material / program churn`
- Lowest-risk fix to test first: `replace repeated prop families with instancing and collapse near-duplicate materials`
- Confidence: `high`

## Runtime Route

| Field | Value | Notes |
| --- | --- | --- |
| Renderer path | `WebGLRenderer` | `Classic Three.js renderer path` |
| Actual backend | `WebGL2` | `Confirmed in Chrome graphics diagnostics` |
| Framework layer | `vanilla-three` | `No React wrapper involved` |
| Post stack | `none` | `No layered post path in the affected route` |
| Browser / OS | `Chrome 123 / macOS` | `Laptop-class integrated GPU` |
| Scene / route tested | `showroom/full-catalog camera path` | `Worst case is the full visible product wall` |

## Symptom and Repro

| Field | Value | Notes |
| --- | --- | --- |
| Symptom class | `low-fps` | `Budget misses happen during normal camera motion` |
| Repro steps | `Open showroom, switch to full catalog, orbit toward the product wall, then pan left across all visible props.` | `Stable repro on every run` |
| Repro frequency | `always` | `Not limited to first load` |
| Tested quality settings | `DPR 1.5, shadows on, no post` | `Same camera path used for every measurement` |
| Visual invariants | `keep full prop count and per-item selection affordance` | `Can change representation, not overall catalog density` |

## Instrumentation Used

| Instrument | Used | Output captured |
| --- | --- | --- |
| `renderer.info` | `yes` | `draw calls, triangles, textures, programs` |
| Pass-local timings | `no` | `No pass stack on this route` |
| Browser performance flame chart | `yes` | `Main-thread traversal and submit cost` |
| GPU or WebGPU tooling | `no` | `Not needed once resolution scaling showed weak sensitivity` |
| App-specific logs or counters | `yes` | `Visible prop count and selection-layer count` |

## Baseline Measurements

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| Avg frame time | `24.3` | `15.8` | `ms` |
| Worst-frame time | `32.9` | `21.1` | `ms` |
| FPS | `41` | `63` | `Same camera path and device class` |
| DPR / render size | `1.5 / 2160x1350` | `1.5 / 2160x1350` | `Resolution held constant for the fix test` |
| Draw calls | `1284` | `412` | `Instanced prop families and shared decals` |
| Triangles / points / lines | `2.1M / 0 / 0` | `2.1M / 0 / 0` | `Geometry load stayed mostly unchanged` |
| Textures / geometries / programs | `118 / 406 / 73` | `118 / 233 / 28` | `Program count fell with material consolidation` |

## Isolation Results

| Toggle or probe | Observation | What it suggests |
| --- | --- | --- |
| Lower DPR / half resolution | `Avg frame time improved by only ~9 percent` | `Not primarily fill-rate or fullscreen-pass bound` |
| Post off | `No change` | `No post stack involvement` |
| Shadows off / frozen | `Small gain of ~1.2 ms` | `Shadows contribute but are not dominant` |
| Transparency / particles off | `Negligible change` | `Not driven by overdraw-heavy layers` |
| Object count / visibility reduced | `Frame time dropped immediately when half the props were hidden` | `Strong scene-graph or submit-path signal` |
| Raycast / events off | `Minor gain` | `Interaction cost is secondary` |
| Static camera / animation off | `Static camera helps slightly, but visible-prop count still dominates` | `Traversal and submit cost persists outside animation updates` |

## Bottleneck Classification

| Bottleneck | Severity | Evidence | Why it is or is not dominant |
| --- | --- | --- | --- |
| Scene-graph / draw-call saturation | `high` | `1284 draw calls, strong object-count sensitivity, flame chart shows traversal and submit pressure` | `This is the clearest dominant signal` |
| Shadow-map cost | `low` | `Disabling shadows saves only ~1.2 ms` | `Real but not first-order` |
| Transparency / overdraw | `none` | `Resolution sensitivity is weak and transparent layers are sparse` | `Does not explain the miss pattern` |
| Post / fullscreen pass chain | `none` | `No layered post stack on the route` | `Not applicable` |
| Material / program churn | `medium` | `73 programs before consolidation, several near-duplicate material variants` | `Secondary because it amplifies draw-call cost` |
| Upload / allocation / resize thrash | `low` | `No spike correlation with resize or streaming` | `Not the steady-state issue` |
| Raycasting / interaction | `low` | `Turning off selection raycasts gives only a small gain` | `Secondary only` |
| Main-thread / React churn | `none` | `Vanilla route with no React layer` | `Not applicable` |

## Performance Contract

| Field | Choice | Notes |
| --- | --- | --- |
| Device class | `laptop-balanced` | `Integrated GPU laptop is the floor target for this route` |
| Target FPS | `60` | `Interactive configurator should stay at full-rate during orbit` |
| Frame budget | `16.7ms` | `Steady-state camera motion target` |
| Fidelity stance | `balanced` | `Keep scene density, allow representation changes` |
| Non-negotiable invariants | `full catalog visibility, per-item selection, material look parity` | `Do not reduce the visible assortment` |

## Recommendations

| Priority | Recommendation | Route scope | Expected gain | Risk / tradeoff |
| --- | --- | --- | --- | --- |
| `1` | `Convert repeated prop families to InstancedMesh or BatchedMesh and keep selection data in a parallel lightweight structure.` | `WebGL/shared` | `Large CPU-side submit reduction` | `Requires selection mapping work` |
| `2` | `Collapse near-duplicate materials and stop creating cosmetic variant programs for tiny label differences.` | `WebGL/shared` | `Lower program count and state churn` | `May require texture-atlas or decal cleanup` |
| `3` | `Freeze shadow updates outside lighting edits or hero interactions.` | `WebGL/shared` | `Small but safe budget recovery` | `Dynamic-light changes become explicit` |

## Degradation Ladder

| Tier | Changes | Preserved | When to activate |
| --- | --- | --- | --- |
| Premium | `Current lighting and per-item materials with instanced prop families` | `Full catalog look and selection fidelity` | `Desktop and strong laptop GPUs` |
| Balanced | `Instancing plus frozen shadows outside active edits` | `Catalog density and material parity` | `Default laptop path` |
| Safe | `Reduce secondary prop material variants and hide non-critical helpers` | `Hero items and selection affordance` | `Sustained budget misses above 18 ms` |
| Minimum | `Keep only hero row fully interactive and defer distant selection overlays` | `Core browsing flow` | `Fallback for weak integrated GPUs` |

## Unknowns and Next Capture

| Unknown | Why it matters | Next measurement or test |
| --- | --- | --- |
| `Exact share of time spent in selection overlay traversal after instancing` | `Determines whether interaction pruning is needed after the main fix` | `Re-run the same camera path with overlay traversal counters enabled after the instancing patch` |

## Final Call

- Dominant bottleneck: `Scene-graph / draw-call saturation driven by many separately submitted props`
- Secondary bottleneck: `Material and program churn from near-duplicate variants`
- First fix to ship: `Instance repeated prop families and consolidate cosmetic material variants`
- First fallback tier to wire: `Freeze shadow updates outside explicit lighting edits`
- What not to change yet: `Do not drop DPR or redesign materials before the submit path is reduced`

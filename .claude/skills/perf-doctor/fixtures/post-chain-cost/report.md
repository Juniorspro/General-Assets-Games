# Marketing Hero Scene Performance Report

## Summary

- Status: `diagnosed`
- Runtime route: `WebGLRenderer` + `vanilla-three` + `layered-post-stack`
- Target device class: `laptop-balanced`
- Symptom: `steady-state frame time rises above budget once the full post chain is enabled`
- Dominant bottleneck: `post / fullscreen pass chain`
- Secondary bottleneck: `transparency / overdraw`
- Lowest-risk fix to test first: `downsample the expensive post passes before changing scene content`
- Confidence: `high`

## Runtime Route

| Field | Value | Notes |
| --- | --- | --- |
| Renderer path | `WebGLRenderer` | `Stable WebGL route for the shipping page` |
| Actual backend | `WebGL2` | `WebGL route confirmed in runtime` |
| Framework layer | `vanilla-three` | `No framework wrapper on this page` |
| Post stack | `layered post stack` | `Bloom, SSAO, depth-of-field, film grain` |
| Browser / OS | `Chrome 123 / Windows 11` | `Laptop-class dGPU disabled to test the lower tier` |
| Scene / route tested | `landing/hero idle loop` | `Same camera angle and animation loop across runs` |

## Symptom and Repro

| Field | Value | Notes |
| --- | --- | --- |
| Symptom class | `low-fps` | `Budget miss is steady, not just a first-load hitch` |
| Repro steps | `Open the hero route, wait for the default camera settle, then leave the page idle for 10 seconds with the full effect stack enabled.` | `No interaction needed` |
| Repro frequency | `always` | `Reproducible on each refresh once assets are warm` |
| Tested quality settings | `DPR 2.0, SSAO high, DOF on, bloom on, film grain on` | `Default marketing preset` |
| Visual invariants | `keep cinematic glow and depth separation` | `Can change quality level, not the overall art direction` |

## Instrumentation Used

| Instrument | Used | Output captured |
| --- | --- | --- |
| `renderer.info` | `yes` | `Sanity check only; geometry counts are moderate` |
| Pass-local timings | `yes` | `Per-pass timings for bloom, SSAO, DOF` |
| Browser performance flame chart | `yes` | `Shows limited JS pressure relative to frame miss` |
| GPU or WebGPU tooling | `no` | `Pass timings and resolution sensitivity were sufficient` |
| App-specific logs or counters | `yes` | `Post preset and resolution-scale toggles` |

## Baseline Measurements

| Metric | Before | After | Notes |
| --- | --- | --- | --- |
| Avg frame time | `29.4` | `16.2` | `ms` |
| Worst-frame time | `36.8` | `20.5` | `ms` |
| FPS | `34` | `61` | `Same idle loop and device class` |
| DPR / render size | `2.0 / 2880x1620` | `2.0 / 2880x1620` | `Pass downsampling changed internal targets, not canvas size` |
| Draw calls | `214` | `214` | `Geometry path held constant` |
| Triangles / points / lines | `1.3M / 0 / 0` | `1.3M / 0 / 0` | `Scene itself is not the main lever` |
| Textures / geometries / programs | `87 / 144 / 24` | `90 / 150 / 25` | `Minor resource growth from extra targets is acceptable` |

## Isolation Results

| Toggle or probe | Observation | What it suggests |
| --- | --- | --- |
| Lower DPR / half resolution | `Frame time improves sharply, especially in the DOF and SSAO passes` | `Strong fill-rate or fullscreen-pass sensitivity` |
| Post off | `Frame time drops to budget immediately` | `Layered post stack is dominant` |
| Shadows off / frozen | `Small gain only` | `Lighting cost is secondary` |
| Transparency / particles off | `Moderate gain around bloom edges` | `Overdraw amplifies the post cost but does not lead it` |
| Object count / visibility reduced | `Limited change` | `Scene complexity is not the first-order driver` |
| Raycast / events off | `No meaningful change` | `Interaction is not relevant on this idle route` |
| Static camera / animation off | `Small gain from reduced temporal variance` | `The heavy cost is still in fullscreen processing` |

## Bottleneck Classification

| Bottleneck | Severity | Evidence | Why it is or is not dominant |
| --- | --- | --- | --- |
| Scene-graph / draw-call saturation | `low` | `Only 214 draw calls and weak object-count sensitivity` | `Not the main miss` |
| Shadow-map cost | `low` | `Shadow toggle recovers little budget` | `Secondary only` |
| Transparency / overdraw | `medium` | `Disabling particle haze trims bloom and DOF cost` | `Amplifier, not the root dominant path` |
| Post / fullscreen pass chain | `high` | `Post-off isolation and pass timings show SSAO and DOF dominating the miss` | `Clear dominant bottleneck` |
| Material / program churn | `low` | `No compile spikes or variant churn in steady state` | `Not relevant here` |
| Upload / allocation / resize thrash | `low` | `Issue persists in warm steady-state idle loop` | `Not a spike problem` |
| Raycasting / interaction | `none` | `No interaction-driven regression` | `Not applicable` |
| Main-thread / React churn | `none` | `Vanilla route with minimal JS work` | `Not applicable` |

## Performance Contract

| Field | Choice | Notes |
| --- | --- | --- |
| Device class | `laptop-balanced` | `Default shipping tier for the landing page` |
| Target FPS | `60` | `Hero route should feel smooth on mid-tier laptops` |
| Frame budget | `16.7ms` | `Idle loop target` |
| Fidelity stance | `fidelity-first` | `Preserve cinematic look, trade internal quality first` |
| Non-negotiable invariants | `bloom identity, depth separation, hero readability` | `Do not flatten the scene into an ungraded render` |

## Recommendations

| Priority | Recommendation | Route scope | Expected gain | Risk / tradeoff |
| --- | --- | --- | --- | --- |
| `1` | `Downsample SSAO and depth-of-field buffers and keep the final composite at full canvas size.` | `WebGL/wrapper-specific` | `Largest budget recovery with low art risk` | `Slight softness in secondary blur regions` |
| `2` | `Trim bloom threshold coverage and stop feeding low-value haze layers into the brightest path.` | `WebGL/wrapper-specific` | `Moderate GPU savings and less overdraw amplification` | `Requires art tuning around emissive accents` |
| `3` | `Provide a laptop preset that disables film grain before disabling bloom or DOF.` | `shared` | `Small but clean recovery` | `Minor loss of texture in dark gradients` |

## Degradation Ladder

| Tier | Changes | Preserved | When to activate |
| --- | --- | --- | --- |
| Premium | `Full stack at default internal scales` | `Complete cinematic look` | `Desktop-high devices` |
| Balanced | `SSAO and DOF downsampled, bloom retained` | `Glow signature and depth separation` | `Default laptop route` |
| Safe | `Film grain off, bloom scope trimmed, lower SSAO radius` | `Hero readability and broad atmosphere` | `Budget misses above 18 ms` |
| Minimum | `Bloom only, no SSAO or DOF` | `Basic highlight identity` | `Last-resort fallback for weak laptops` |

## Unknowns and Next Capture

| Unknown | Why it matters | Next measurement or test |
| --- | --- | --- |
| `Safari cost split across DOF versus SSAO` | `Could shift which pass should be trimmed first on Apple laptops` | `Capture the same idle route with pass-local timings in Safari and compare the top two passes` |

## Final Call

- Dominant bottleneck: `Fullscreen post cost led by SSAO and depth-of-field`
- Secondary bottleneck: `Transparent haze that inflates bloom and fill-rate pressure`
- First fix to ship: `Downsample the expensive post passes before touching scene geometry`
- First fallback tier to wire: `Balanced preset with SSAO and DOF downsampled`
- What not to change yet: `Do not reduce scene geometry or shadows before the post chain is tuned`

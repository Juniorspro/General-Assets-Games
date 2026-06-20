# Research Workflow

## Table of Contents

1. Choose the archetype route
2. Build the source set
3. Parse each source type
4. Expand the link tree
5. Build the terminology and module list
6. Run English-first search
7. Enforce the coding gate
8. Emit the research artifacts

## Choose the archetype route

Before deep research, pick the closest archetype from [archetypes.md](archetypes.md).

Record:

- chosen archetype
- nearest rejected archetype
- why the chosen route fits better

This keeps research focused and prevents collecting unrelated techniques.

## Build the source set

Start with the user-provided links at depth 0.

Rank source types in this order unless the task clearly demands otherwise:

1. Mainstream graphics sources: SIGGRAPH, papers, widely cited talks, production notes, official writeups, and high-signal canonical repos.
2. Cross-engine references: Unreal Engine, Unity, custom renderer writeups, or other rendering pipelines that explain how the effect is achieved.
3. Three.js landing sources: current Three.js docs, manual pages, examples, forum posts, and implementation notes that help adapt the technique into a browser demo.

Include all high-signal secondary sources you can extract from:

- Article body and footnotes
- Embedded demos and code blocks
- Shadertoy buffers, notes, and tags
- CodePen dependencies and comments
- GitHub README files, issues, discussions, and commit notes
- Video descriptions, captions, and pinned comments
- Social-thread replies that contain implementation clues

Ignore navigation links, obvious SEO spam, and repeated mirrors.

## Parse each source type

For every source, extract four things:

1. What the source proves.
2. Which technique or parameter it suggests.
3. Which outbound links or names are worth following.
4. Which risk or ambiguity remains after reading it.

Use this checklist by source type.

### Article, blog, or paper

Extract:

- Technique names and aliases
- Equations, pseudocode, and parameter names
- Author notes about quality, limitations, or shortcuts
- Outbound references to papers, repos, or demos

### Demo, Shadertoy, or CodePen

Extract:

- Pass structure and buffer topology
- Uniforms and control surfaces
- What is geometry versus what is post
- Whether the effect depends on history feedback, multi-pass blur, or procedural textures

### GitHub repo

Extract:

- Minimal file set needed to understand the effect
- Runtime constraints and dependencies
- Open issues about artifacts, precision, or performance
- Any screenshots or videos that reveal intended behavior

### Video or short clip

Extract:

- Signature keyframes
- Motion tempo and loop behavior
- Camera moves versus object motion
- Visible post stack: glow, aberration, vignette, grain, distortion

When code is unavailable, reverse-engineer the pass structure from the visuals.

### Engine-specific reference

Extract:

- which part of the look is engine-specific and which part is generic
- whether the engine is using material graph, custom shader code, compute, or a post stack
- which parts can be translated into Three.js directly and which parts require adaptation

### Discussion, comments, or issues

Extract:

- Performance bottlenecks
- Precision problems
- Engine-specific workarounds
- Better or simpler alternative techniques

Preserve either a short quote or a precise paraphrase for every important takeaway.

## Expand the link tree

Try to reach depth 3.

- Depth 0: user-provided links
- Depth 1: links directly cited from depth 0
- Depth 2: links cited from depth 1 that materially affect the plan
- Depth 3: the last useful layer of implementation or pitfall detail

At each depth, prioritize:

1. Code or pseudocode
2. Principle or derivation
3. Pitfall or performance discussion

Per page, stop after roughly 6 to 8 high-value links unless the effect is unusually complex.

Stop expanding when:

- New links repeat what you already know
- The remaining links are low signal
- The content is blocked by login or payment
- The effect is already well explained by the existing tree
- Two consecutive depth layers add no new technique modules, no new implementation clues, and no new pitfall notes
- Three consecutive high-signal links fail to change the plan, terminology list, or module boundaries
- Every critical module already has a principle source, an implementation source, and a pitfall source

If you stop early, say why in `REPORT.md`.

Use this output format:

```text
[0] https://example.com/demo - overall look and motion reference
  [1] https://example.com/blog - algorithm explanation
    [2] https://example.com/repo - implementation details
      [3] https://example.com/issue - precision fix for banding
```

## Build the terminology and module list

Before searching broadly, break the effect into 4 to 8 modules.

Examples:

- Shape generation
- Motion field
- Lighting model
- Atmospheric depth
- Post-processing
- Interaction mapping

For each module, list 3 to 6 English search phrases or aliases. Favor technique names, not visual adjectives.

Example:

| Module | Search phrases |
| --- | --- |
| Motion field | `curl noise`, `flow field`, `advected particles`, `vector field feedback` |
| Glow stack | `selective bloom`, `threshold bloom`, `mip bloom`, `hdr post process` |

## Run English-first search

Search in two passes.

### Pass 1: understand the technique

Query patterns:

- `<effect name> rendering technique`
- `<effect name> shader`
- `<technique> paper`
- `<technique> implementation details`
- `<technique> HLSL`
- `<technique> GLSL`
- `<technique> Unreal material`
- `<technique> Unity HDRP`

### Pass 2: land the technique in web/Three.js

Query patterns:

- `<technique> three.js`
- `<technique> WebGPU`
- `<technique> TSL`
- `<technique> three.js webgpu`
- `<technique> three.js webgpu tsl`
- `<technique> post-processing best settings`

Prefer sources that contain runnable code, author commentary, or explicit pitfall notes.

## Ignore Premature Performance Work

For the default desktop-first path:

- do not water down the look early just to save cycles
- do not reject the best-looking path because it might be expensive
- only optimize after the look is correct, unless the user explicitly gives a device or frame budget

## Enforce the coding gate

Do not start implementation until each critical module has either:

- A principle source
- An implementation source
- A pitfall or boundary source

Or:

- A documented gap
- A fallback approach
- A confidence note explaining the risk

Use this coverage table in `REPORT.md`:

| Module | Principle source | Implementation source | Pitfall source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Flow field | paper/blog | repo/demo | issue/thread | covered | curl noise with position texture |

## Emit the research artifacts

Always include these artifacts in the report.

### External link list

| Link | Type | Contribution |
| --- | --- | --- |
| `https://...` | paper/repo/demo/discussion/doc | explains shadows, provides shader, names pitfall |

### Comment takeaways

| Source | Takeaway | Evidence |
| --- | --- | --- |
| GitHub issue 12 | Half-float target fixed banding on mobile Safari | paraphrase |

### Search log

List the queries that actually changed your understanding or implementation plan.

### Evidence vs inference

For every important claim, mark whether it is:

- directly evidenced by a source
- inferred from multiple sources
- still uncertain

Use this table:

| Claim | Status | Evidence |
| --- | --- | --- |
| `TODO` | `evidenced/inferred/uncertain` | `source or reason` |

### Research summary

Answer these questions:

- What is the shortest convincing implementation path?
- Which parts are still inferred rather than proven?
- Which decisions are driven by look, and which by engineering constraints?

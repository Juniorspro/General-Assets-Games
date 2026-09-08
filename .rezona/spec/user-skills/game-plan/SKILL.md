---
name: game-plan
description: "Plan the **game design** for an H5 game once a direction exists (pre-direction divergence is `brainstorm`'s job; visual-novel planning is outside this skill set). Co-creates a game-design document across five core pillars — **Verb / Loop / Stakes / Setting / MVP** — and writes `PLAN_GAME.md`. Writes no code and no assets. Triggers: plan game / design game / scope game / game design doc / GDD / pitch a game / 规划游戏 / 设计游戏 / 核心玩法 / 玩法循环 / 玩法设计 / 游戏立项 / 写 GDD. (Bare 'brainstorm / 脑暴 / 不知道做什么' with no direction yet routes to the `brainstorm` skill instead.)"
---

# game-plan

A game-design planner. The user owns the creative vision; this skill's job is to surface well-shaped choices across the five pillars of a small H5 game, draft `PLAN_GAME.md` against those choices, and persist it only after explicit approval. Downstream (asset generation, game code via game-kit) reads the plan as the design source.

## The five pillars

A small H5 game design boils down to five questions. Every section of `PLAN_GAME.md` answers exactly one; anything else is implementation detail and belongs in code, not in the plan.

| # | Pillar | The question |
|---|---|---|
| 1 | **Verb** | What does the player **do** every second? One primary verb at MVP scope. |
| 2 | **Loop** | What's the **rhythm** — one round (30s) and one session (5min)? Each scale answers a different "why come back". |
| 3 | **Stakes** | What's at **risk**, what's the **reward**, how does the player **fail**? One bundled conflict structure. |
| 4 | **Setting** | Where does this take place, what's the **mood**, and what's the **art style** (one phrase)? Names the scenes + cast that become background / portrait / sprite assets. |
| 5 | **MVP** | Must-have / nice-to-have / **out of scope**? Without an explicit refusal list, scope creeps every iteration. |

## How to run it

**Scale the conversation to the seed.** Read what already exists first — an approved `current/CONCEPT.md` (from the `brainstorm` skill), a prior `PLAN_GAME.md` (ask: refinement or fresh start?), substantive code in `current/src/game/` (treat as constraints). Everything the seed already decided is **decided**: confirm it, don't re-ask. Only genuinely open or conflicting pillars go to the user — a detailed pitch might need one question; a vague mood needs most of them. If the seed conflicts with itself ("cozy bullet hell"), ask which side to honor.

**Co-create the open pillars** via `AskUserQuestion`, batching them into one call, 2–4 options each with one-line trade-offs, tailored to the seed. For the Setting pillar include an **art style** question — 2–4 style directions in your own words (`pixel art`, `watercolor storybook`, `flat vector`…); the chosen phrase becomes the style anchor appended to every image prompt later. When you want ready-made option menus (verb menu, loop archetypes, stakes patterns, mood vocabulary, tier caps), read `references/game-design-palette.md` — on demand, not upfront. If the user can't decide, recommend and say so explicitly: *"defaulting to X — editable later."* Never pick silently.

**Draft in conversation, persist only on approval.** Render the full draft as a Markdown preview in the chat using the template below, then ask: approve / adjust / cancel. Iterate until "approve" — only then write `current/PLAN_GAME.md` (overwriting any prior plan; the workspace root itself is not writable — only `current/**` and `AGENTS.md` are). A draft on disk before approval is a bug, not a plan.

**Offer the next hop, opt-in.** After the file is written, ask whether to proceed to asset generation + game code (the plan feeds it directly: Actions → SFX cues, Scenes/Cast → image list, Art style → prompt anchor, MVP tier → budget). Never auto-trigger.

## Plan template

`PLAN_GAME.md` must follow this structure — downstream work reads the plan by these sections.

```markdown
# Game Plan

- Planned at:     <ISO 8601 UTC timestamp>
- Mode:           <2d | 3d | unknown — the intended rendering approach; the game-kit skill makes the final 2D/3D call from the brief and this plan>
- One-line pitch: <one sentence that captures the entire game>

## 1. Verb — the moment-to-moment action

**Primary verb:** <one word — jump / match / tap / drag / aim / dodge / solve / build / collect / ...>
**Input:** <tap / swipe / hold / drag / keyboard / motion / mic / multi>

**Actions** (each is a candidate SFX cue for audio generation; mark core vs. secondary):

- `<action_name>` *(core)*: <when it fires, one clause>
- ...

## 2. Loop — the rhythm

**30-second loop:** <one sentence: one round of meaningful play>
**5-minute loop:** <one sentence: why the player starts a second round>

## 3. Stakes — what's at risk and what's earned

**Tension:** <one clause: the pressure source>
**Reward:** <one clause: the payoff>
**Failure:** <one clause: how the player loses, or "no-fail (sandbox / cozy / narrative)">

(The three lines must read as the SAME conflict viewed three ways.)

## 4. Setting — the lightweight vibe

**World:** <one clause: where this takes place>
**Mood:** <1–2 words: cozy / tense / silly / epic / dreamy / retro / minimalist / noir / ...>
**Art style:** <a short style-direction phrase in the planner's own words — e.g. "16-bit pixel art", "watercolor storybook". Appended as the style anchor to every image prompt during asset generation.>

**Scenes** (each is a candidate background asset):

- `<scene_key>`: <one clause>
- ...

**Cast** (each is a candidate portrait or sprite asset; omit if none):

- `<name>`: <one clause: their role>
- ...

## 5. MVP — the line we don't cross

**Tier:** <Minimal | Standard | Ambitious>

**Must-have** (the smallest thing that's still the game):
- ...

**Nice-to-have** (explicit "if we have time"):
- ...

**Out of scope** (the temptations we're refusing — must be non-empty):
- ...

**Asset budget:** <the concrete generation list this tier buys — e.g. "3 backgrounds, 1 portrait ×4 expressions, 2 spritesheets, 3 SFX, 1 BGM">. Every scene/cast/animation named above must appear here.

## Open questions

<anything guessed or deferred; omit the section if none.>
```

## Boundaries

This skill **must not**:

- Write any file other than `current/PLAN_GAME.md`, or write it before explicit approval.
- Modify anything else under `current/**` — the plan is design, not code.
- Call any generation tool.
- Auto-trigger the next stage without explicit user confirmation.
- Surface more than one primary verb at MVP scope on its own initiative. If the user asks for a second verb, push back once with the scope risk; if they hold firm, **do as they say** — plan both verbs and record the risk under *Open questions*. Creative authority belongs to the user.
- Inflate the Art style line into an art bible — one phrase, no palettes / fonts / motion specs.

## Reference

- `references/game-design-palette.md` — verb menu, loop archetypes, stakes patterns, mood vocabulary, MVP-tier caps. Read on demand when an open pillar needs an options menu.

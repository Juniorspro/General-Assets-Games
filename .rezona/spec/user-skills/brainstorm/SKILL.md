---
name: brainstorm
description: "Concept brainstorming for when the game DIRECTION is still undecided. Turns 'I don't know what to make' into an approved concept card written to current/CONCEPT.md, then hands off to `game-plan`. Boundary: if the user already HAS a direction ('a match-3 with cats') skip this skill and invoke `game-plan` directly — that skill owns five-pillar design for a decided game; this one owns pre-direction divergence only. Triggers: brainstorm / 脑暴 / 头脑风暴 / 我想做个游戏但不知道做什么 / 帮我想个点子 / 不知道做什么好 / give me game ideas / brainstorm a game idea / what game should I make / 有什么好玩的方向."
---

# brainstorm

Diverge with the user until a direction crystallizes, capture it as a **concept card**, and hand off to `game-plan`. The user owns the creative vision; this skill's only job is to put genuinely different directions in front of them and record what they choose.

## How to run it

Learn what the user is in the mood for, then propose 2-3 concept directions that are **genuinely different from each other** (not three flavors of one idea), with your recommendation. Iterate — pick one, merge, or reroll — until a direction wins. Then fill the concept card and render it **in the conversation** for approval.

**The one hard rule: nothing touches disk, and no downstream skill runs, before the user explicitly approves the card** (ask via `AskUserQuestion`). On approval, write the card to `current/CONCEPT.md` (only `current/**` is writable) and offer — opt-in — to invoke `game-plan`, which reads the card as a pre-approved seed and only asks about what it leaves open. If the concept is a VN, say plainly that the VN chain is not available in this skill set.

## Concept card template

```markdown
# Concept Card

- Approved at: <ISO 8601 UTC timestamp>

## Pitch

<one sentence that captures the whole thing — "a fox collects acorns at dawn before the sun rises">

## Product line

**Type:** <game | vn>
**Why:** <one clause — what makes it that and not the other>

## Style hunch

<optional — 1-2 short style-direction phrases (e.g. "pixel art") if a visual feel surfaced; omit otherwise. Final call happens in `game-plan`.>

## MVP tier

<optional — Minimal | Standard | Ambitious, only if scope came up naturally; omit otherwise — sizing is `game-plan`'s pillar 5.>

## Pillar signals

<optional — verb/loop/stakes/setting signals that surfaced naturally, in the user's own words ("就是躲子弹的" → Verb: dodge). Omit what didn't surface.>

- Verb: <signal>
- Loop: <signal>
- Stakes: <signal>
- Setting: <signal>
```

Every optional section follows the same rule: record what the conversation naturally produced, never quiz the user to fill a field — that's `game-plan`'s job, with its own option menus.

## Boundaries

This skill **must not**:

- Write any file other than `current/CONCEPT.md`, and never before explicit approval.
- Write code, generate any asset, or call any generation tool.
- Invoke `game-plan` (or any other skill) without explicit user confirmation.
- Design the game itself — verbs, loops, stakes and their trade-offs are `game-plan`'s territory. If the user starts designing mechanics in depth, offer to hand off rather than absorbing that work here.

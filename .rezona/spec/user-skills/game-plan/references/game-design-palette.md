# Game-design palette

Option menus for `game-plan`'s open pillars. These are vocabularies and named patterns to build choices from — not designs, not defaults; setting, art style, and every actual pick belong to the user and the live conversation.

## 1. Verb menu — what does the player do every second?

| Verb | One-line pitch | Genre fit | Typical input |
|---|---|---|---|
| `jump` | timing + precision platforming | platformer, runner | tap / space |
| `match` | recognize and chain | match-3, memory, connect | tap / drag |
| `tap` | rhythm or panic clicker | clicker, rhythm, defense | tap |
| `drag` | direct spatial control | puzzle, slingshot, draw-line | drag |
| `swipe` | flick gestures | swipe-runner, slice, gesture combat | swipe |
| `aim+shoot` | targeting precision | shooter, archer, billiards | drag-release / tap |
| `dodge` | reactive avoidance | bullet-hell, runner | swipe / tilt |
| `time` | hit the right moment | rhythm, parry, reflex | tap on cue |
| `solve` | spatial / logical reasoning | sokoban, slide-puzzle, escape-room | tap-to-select |
| `build` | place pieces to construct | tower-defense, factory, city-toy | drag-from-tray |
| `balance` | hold a state under drift | tilt-balance, plate-spin | tilt / hold |
| `guess` | inference from clues | mastermind, wordle-like | tap on options |
| `collect` | sweep up rewards | idle, pasture, gather | tap / passive |
| `feed` | nurture a creature | tamagotchi, garden, cozy-sim | tap / drag |

## 2. Loop archetype menu — what's the rhythm?

| Archetype | Round-scale loop | Session-scale loop | Best for |
|---|---|---|---|
| `high-score-chase` | one continuous run | die → see score → restart with knowledge | arcade, runner, defense |
| `level-progression` | clear one stage | unlock next → harder mechanic introduced | puzzle, platformer |
| `endless-escalation` | survive one wave | enemies/speed ramp until death | survival, bullet-hell |
| `narrative-arc` | one scene / choice | story unfolds toward a finite ending | interactive fiction, walking-sim |
| `idle-accumulation` | watch resources tick up | spend on upgrades that tick faster | clicker, idle, farm |
| `daily-session` | a single short timed session | come back tomorrow for a fresh seed | wordle-like, daily-puzzle |
| `sandbox-toy` | manipulate the world | no fail, no goal, expressive play | toy, fidget, generative-art |
| `roguelite-run` | one run with random pickups | meta-unlocks persist across runs | dungeon-crawl, deckbuilder |

## 3. Stakes patterns — what's at risk and what's earned?

Tension, reward, and failure are three faces of the **same** conflict structure — pick a pattern and all three fall out together.

| Pattern | Tension source | Reward shape | Failure mode |
|---|---|---|---|
| `survive-vs-time` | timer ticking down | beating your time / clock survival | clock hits 0 |
| `survive-vs-mass` | enemies / obstacles spawning | depth, kill count | HP → 0 |
| `precision-test` | small target / tight window | streak, multiplier | one miss breaks streak |
| `resource-scarcity` | limited ammo / lives / money | efficiency feels smart | run out, can't progress |
| `knowledge-test` | hidden information | "aha" moment when you crack it | guess wrong N times |
| `escalating-complexity` | rules pile up | mastery, becoming fluent | overwhelmed → game-over |
| `collection-completion` | gaps in a set | filling the last slot | (often no fail — collection-paced) |
| `narrative-stakes` | character / world at risk in fiction | choice consequence, story payoff | bad ending / regret |
| `no-fail` | none — fail is removed by design | expression, exploration, cozy ambience | n/a (sandbox / toy / cozy-sim) |

## 4. Mood vocabulary (one or two words goes in the plan)

```
cozy · tense · silly · epic · melancholic · dreamy
retro · minimalist · surreal · cyberpunk · pastoral · noir
```

## 5. MVP tier caps

| Tier | Total assets | Scenes | Named cast |
|---|---|---|---|
| **Minimal** | ≤8 (1 BGM, ≤4 SFX, ≤3 images) | 1 | 0–1 |
| **Standard** | ≤15 (2 BGM, ≤6 SFX, ≤7 images) | 2 | ≤2 |
| **Ambitious** | ≤25 (3 BGM, ≤12 SFX, ≤10 images) | 3 | ≤3 |

Scene shapes at each count: 1 = single-screen arcade; 2 = menu+play or play+result; 3 = menu+play+result. Each scene ≈ one background asset, each named cast member ≈ one portrait/sprite asset — the caps exist because every row converts to paid generation downstream.

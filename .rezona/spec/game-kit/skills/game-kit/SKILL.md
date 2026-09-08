---
name: game-kit
description: "Use for any game-creation task. Routes to the workspace contract, the 2D/3D genre guide inferred from the brief, and only the references bundled in this skill."
---

# game-kit

This skill is a router. The actual content lives in reference files next to this
SKILL.md, under `references/`. Read references on demand instead of guessing —
this file only tells you which file to open and when.

## Protocol

1. **ALWAYS read `references/contracts/global.md` first.** This is the mandatory
   workspace contract. Do not produce any game code or design before reading it.

2. **Decide 2D or 3D from the user's brief** (or from `PLAN_GAME.md` if a
   `game-plan` design doc already exists). There is no external mode flag —
   infer it from what the brief describes:
   - Flat/top-down/side-view visuals, sprite art, screen-space movement → **2D**.
     Read `references/genres/2d.md`.
   - Depth, a 3D camera, models/terrain, first/third-person movement → **3D**.
     Read `references/genres/3d.md`.
   - If the brief is genuinely ambiguous, ask the user rather than guessing.

3. **Ground the work in what already exists.**
   - If `current/PLAN_GAME.md` exists, read it — its Art style / Actions / MVP
     tiers are the build spec, not suggestions.
   - When iterating on an existing game, `Read` the latest `v{n}/cover.png`
     first to see what the player currently sees.
   - For a NEW game with no plan: default to ONE polished core loop (verb +
     fail-or-score + restart + feedback on every action) over feature breadth.

4. **Pull in optional references only when relevant.**
   Most genre and visual-style knowledge should come from the user's brief and
   the model's general knowledge, not from bundled encyclopedic references. Read:
   - `references/patterns/game-feel.md` for any action/arcade brief, and
     whenever a build plays correctly but feels flat or static.
   - `references/patterns/asset-pipeline.md` BEFORE generating any bundled
     asset (image / audio / 3D model).
   - `references/mechanics/interactive.md` only for `interactive_*` content.
   - `references/interactions/<name>.md` only when using that device API.
   - `references/interactions/purchase.md` ONLY after the user has invoked the
     `/purchase` skill — that skill is the sole gate for adding IAP. When
     in-app purchase / paid items / monetization (内购 / 付费 / 收费 / 购买道具 /
     复活收费 / IAP) merely comes up in conversation, do NOT implement and do
     NOT load this reference for implementation: reply suggesting the user type
     `/purchase`, and leave the game purchase-free until they do.
   - `references/patterns/h5-game-presentation.md` when a generated HTML game
     risks feeling like a generic web page rather than a game surface.
   - `references/patterns/mobile-game-controls.md` when the brief or mechanic
     already needs mobile touch movement, action buttons, aiming, drag zones, or
     device-input fallback. Use only the relevant control section; do not add
     visible control UI just because this reference is loaded.

5. **Available references**:

- contracts/global.md  (contract)
- genres/2d.md  (genre)
- genres/3d.md  (genre)
- interactions/camera.md  (interaction)
- interactions/microphone.md  (interaction)
- interactions/purchase.md  (interaction)
- interactions/tilt.md  (interaction)
- interactions/vibration.md  (interaction)
- mechanics/interactive.md  (mechanic)
- patterns/asset-pipeline.md  (pattern)
- patterns/game-feel.md  (pattern)
- patterns/h5-game-presentation.md  (pattern)
- patterns/mobile-game-controls.md  (pattern)

## Build / Seed Workflow

**Where your game lives.** Every script takes `--workspace <ws>`, where `<ws>` is
the CONTAINER (your cwd) — NOT the project root. Your game lives in `<ws>/current/`
— edit files there (e.g. `<ws>/current/src/App.tsx`). Version snapshots are
`<ws>/v{n}/` (cut automatically by the platform after each edit turn); never
edit those. The design brief is
`<ws>/AGENTS.md` (container level). Always pass the container `<ws>` to the scripts;
they resolve `current/` themselves.

**Definition of done — non-negotiable.** Before you treat ANY change as complete,
you MUST pass these gates:

1. `validate_workspace.py` returns `"ok": true`.
2. `build_game.py` returns `"status": "ok"`.
3. For a NEW game's first working version: one polish pass against
   `references/patterns/game-feel.md` → "Polish checklist", plus the visual
   self-review in workflow step 5 when the smoke runner is available. A first
   version that builds green but plays flat and silent is NOT done.

A change that has not passed these gates is NOT done — never report it as finished
or hand it off on a red or un-run validation/build. `validate_workspace.py` catches
unfinished scaffold placeholders and workspace-shape errors; `build_game.py` runs
the sanctioned build path for the current runtime (GKE Autopilot, no OS Bash
sandbox), via the pinned `bun install --frozen-lockfile` + `bun run build` flow.
On success the build produces `<ws>/current/dist/index.html`,
the served artifact checkpointing gates on. If source or dist changes after a build,
run `build_game.py` again.
NEVER run `bun`, `vite`, `npm`, or any install/build command yourself — builds go
through `build_game.py`, and dependencies are added ONLY via the dependency script
(three.js is already preinstalled in the template):

```
python3 /opt/agent_plugins/game-kit/scripts/add_dependency.py --workspace <ws> --pkg <name> [--pkg ...] [--dev]
```

It syncs `package.json` + `bun.lock` without touching your sources; re-run
`build_game.py` afterwards to compile with the new dependency.

The bundled scripts are NOT on PATH and NOT executable. ALWAYS invoke them as:

```
python3 /opt/agent_plugins/game-kit/scripts/<script>.py <args>
```

Bare `python3` in your shell is `/usr/local/bin/python3`, which does **not** carry
Pillow. The bundled scripts above are stdlib-only and run fine with it, but anything
that touches images — including `check_spritesheet.py` and the Pillow recipes in
`references/patterns/asset-pipeline.md` — must be invoked with the venv
interpreter `/app/.venv/bin/python3`, which has Pillow. Run them via Bash. Follow this sequence:

1. **Seed.** Scaffold the project into the workspace:

   ```
   python3 /opt/agent_plugins/game-kit/scripts/seed_template.py --workspace <ws>
   ```

   This seeds the project into `<ws>/current/` and writes the brief to
   `<ws>/AGENTS.md`. Add `--force` to overwrite existing files.

2. **Edit.** Edit the game under `<ws>/current/` with Read / Write / Edit (e.g.
   `<ws>/current/src/App.tsx`). Pull the 2D/3D genre guide and any interaction
   references on demand as you go. Never hand-edit `<ws>/v{n}/` snapshots.

3. **Validate.** Run the workspace validator and read its JSON output:

   ```
   python3 /opt/agent_plugins/game-kit/scripts/validate_workspace.py --workspace <ws>
   ```

   Fix every error before building. Leftover `SCAFFOLD-PLACEHOLDER-*` markers
   are validation ERRORS — the generated game is still starter scaffolding and
   cannot be checkpointed until they are replaced with real game code.

4. **Build.** Run the build and read its JSON output:

   ```
   python3 /opt/agent_plugins/game-kit/scripts/build_game.py --workspace <ws> --json
   ```

   `--timeout SECONDS` is optional (default 600). A successful build syncs the
   compiled bundle into `<ws>/current/dist/` (with `dist/index.html`).

5. **Runtime smoke + visual self-review (mandatory when the runner is available).**

   ```
   python3 /opt/agent_plugins/game-kit/scripts/smoke_dist.py --workspace <ws>
   ```

   This serves `current/dist/` on loopback, opens it in Playwright, and:
   - FAILS on page/console errors and on a blank/uniform viewport — treat
     failures as repair signals before finishing your turn;
   - writes three screenshots to `<ws>/.smoke/` (`initial.png`, `settled.png`,
     `probed.png` — the last one after a synthetic center-tap, arrow-key hold,
     and Space press) and reports `fps_estimate`, `motion_diff_ratio`, and
     `interaction_diff_ratio` as evidence, NOT as gates.

   Then **`Read` `<ws>/.smoke/settled.png` (and `probed.png`) and judge them
   against the brief and the genre delivery checklist** — composition, palette,
   HUD legibility, leftover placeholder look, whether the probe visibly did
   anything. The JSON only catches crashes and blank frames; the aesthetic and
   playability judgment is yours. Fix and re-run until the screenshots look
   intentional.

6. **Inspect.**

   ```
   python3 /opt/agent_plugins/game-kit/scripts/inspect_workspace.py --workspace <ws>
   ```

7. **Checkpoint — platform-owned. Do NOT run `checkpoint.py` yourself.** After
   your reply ends, the platform detects that `current/` changed during the
   turn, re-validates, builds, and cuts the immutable version snapshot `v{n}`
   automatically. Running `checkpoint.py` manually would snapshot the same edit
   twice (your `v{n}` plus the platform's `v{n+1}`) and duplicate cover
   generation. Your job ends at a green validate/build (and runtime smoke when
   available).

8. **Package.** When done, archive the build:

   ```
   python3 /opt/agent_plugins/game-kit/scripts/package_dist.py --workspace <ws> --out <archive.zip>
   ```

   If the source or dist changed after the last build, re-run `build_game.py`
   first.

### build_game.py output contract

`build_game.py` prints JSON. Read it to drive the repair loop.

- **Success:**
  `{"status":"ok","stage":"done","exit_code":0,"logs":{"install":"...","build":"..."},"dist_files":[...]}`
- **Failure:**
  `{"status":"error","stage":"validate|install|build|verify","exit_code":N,"logs":{...},"dist_files":[]}`
  — `validate` and `verify` stages also carry an `"error"` message.

On failure: read `logs[stage]` for the error, fix the code, then re-run
`build_game.py`. It runs the FIXED `bun install` + build itself — NEVER invent
your own build commands.

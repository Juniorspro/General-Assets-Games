#!/usr/bin/env python3
"""Seed a game-kit workspace from the read-only template.

Layout (Option B): ``--workspace`` is the CONTAINER (the agent's cwd).
  <ws>/current/  = the live Vite project (this is the project root).
  <ws>/v1/ v2/ … = immutable version snapshots (created by checkpoint.py).
  <ws>/AGENTS.md = workspace-level design brief (container level, never snapshotted).

Copies /opt/agent_plugins/game-kit/templates into <ws>/current/ and
initializes an AGENTS.md design brief at <ws>/AGENTS.md.

THIN: copy + brief only. No install, no build, no publish, no command passthrough.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

TEMPLATE_ROOT = Path("/opt/agent_plugins/game-kit/templates")
AGENTS_FILENAME = "AGENTS.md"

# The live Vite project always lives at <ws>/current. Version snapshots are
# <ws>/v1, <ws>/v2, … and are never touched here.
PROJECT_SUBDIR = "current"

# Never copy these from the template into the workspace. node_modules in
# particular: the image prewarm bakes it under /opt, but the workspace lives on
# the gcsfuse mount — copying a node_modules tree there would be huge and slow
# (and pointless: build_game installs deps in a /tmp scratch, never on fuse).
EXCLUDE_DIRS = {"node_modules", "dist", ".git"}


def fail(message: str) -> "None":
    """Emit a JSON error to stderr and exit non-zero."""
    json.dump({"status": "error", "error": message}, sys.stdout)
    sys.stdout.write("\n")
    sys.exit(1)


def copy_tree(src: Path, dst: Path, *, force: bool) -> tuple[list[str], list[str]]:
    """Copy ``src`` into ``dst`` recursively.

    Returns ``(written, skipped)`` lists of workspace-relative paths. Existing
    files are never overwritten unless ``force`` is set.
    """
    written: list[str] = []
    skipped: list[str] = []
    for entry in sorted(src.rglob("*")):
        rel = entry.relative_to(src)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        target = dst / rel
        if entry.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        if target.exists() and not force:
            skipped.append(str(rel))
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(entry, target)
        written.append(str(rel))
    return written, skipped


def init_agents_brief(workspace: Path, *, force: bool) -> bool:
    """Write a starter AGENTS.md design brief at the container level.

    ``workspace`` is the container; the brief lives at <ws>/AGENTS.md (NOT inside
    current/) so it is never captured in a version snapshot. Returns True if written.
    """
    brief = workspace / AGENTS_FILENAME
    if brief.exists() and not force:
        return False
    brief.write_text(
        """# Game Design Brief

## Workspace Contract
- The live project lives in `current/` (edit `current/src/...`); version snapshots are `v1/`, `v2/`, … and must never be edited by hand.
- Replace every scaffold placeholder block (the marked `BEGIN`/`END` comment regions) with real game code before building — leftover placeholders are validation ERRORS.
- Dependencies: `python3 /opt/agent_plugins/game-kit/scripts/add_dependency.py --workspace <ws> --pkg <name>` (three.js preinstalled); never run bun/npm yourself and never hand-edit `bun.lock`.
- `current/src/engine/` ships foundation helpers (loop / input / canvas2d / audio-unlock) — use them or delete them; keep tunables in `src/game/config.ts`.
- Build flow is fixed: `bun install --frozen-lockfile` then `bun run build` via `build_game.py`; output is `current/dist/index.html`.
- After a green build, run `smoke_dist.py --workspace <ws>` when browser automation is available — then LOOK at `<ws>/.smoke/*.png` and self-review against the brief.
- Checkpoint/package require a green build (`current/dist/index.html`); rerun `build_game.py` after any source or dist change.
""",
        encoding="utf-8",
    )
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed a game-kit workspace from the template."
    )
    parser.add_argument(
        "--workspace",
        required=True,
        help="Target workspace container (the agent's cwd). The project is seeded into <ws>/current.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing workspace files (default: never overwrite).",
    )
    args = parser.parse_args()

    if not TEMPLATE_ROOT.is_dir():
        fail(f"template not found: {TEMPLATE_ROOT}")

    workspace = Path(args.workspace)
    project = workspace / PROJECT_SUBDIR
    try:
        project.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        fail(f"cannot create project dir {project}: {exc}")

    written, skipped = copy_tree(TEMPLATE_ROOT, project, force=args.force)

    # The brief lives at the container level so version snapshots never capture it.
    brief_written = init_agents_brief(workspace, force=args.force)

    json.dump(
        {
            "status": "ok",
            "workspace": str(workspace.resolve()),
            "current": str(project.resolve()),
            "template_source": str(TEMPLATE_ROOT),
            "files_written": written,
            "files_skipped": skipped,
            "agents_brief_written": brief_written,
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

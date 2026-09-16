#!/usr/bin/env python3
"""Statically validate a game-kit workspace before building.

Layout (Option B): ``--workspace`` is the CONTAINER; the project validated is
<ws>/current. Version snapshots (<ws>/v1, v2, …) are not inspected here.

Checks structure, required files, forbidden paths, and leftover scaffold placeholders.
This is a read-only linter: it never installs, builds, or mutates the workspace.

THIN: validation only. JSON {status, stage, ok, errors[], warnings[]}.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

# The live Vite project always lives at <ws>/current.
PROJECT_SUBDIR = "current"

REQUIRED_FILES = (
    "package.json",
    "index.html",
    "vite.config.ts",
    "src",
)

# Paths that must NOT be committed/seeded into a clean workspace.
FORBIDDEN_PATHS = (
    "node_modules",
    ".git",
)

# Leftover scaffold markers signal unfinished work.
PLACEHOLDER_MARKERS = (
    "SCAFFOLD-PLACEHOLDER-BEGIN",
    "SCAFFOLD-PLACEHOLDER-END",
)

# File extensions worth scanning for placeholder markers.
SCAN_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json", ".md"}
SCAN_EXCLUDE_DIRS = {"node_modules", "dist", ".git"}
PRUNE_NODE_MODULES_ATTEMPTS = 5


def check_required(workspace: Path, errors: list[str]) -> None:
    for rel in REQUIRED_FILES:
        if not (workspace / rel).exists():
            errors.append(f"missing required path: {rel}")


def check_package_json(workspace: Path, errors: list[str]) -> None:
    pkg_path = workspace / "package.json"
    if not pkg_path.is_file():
        errors.append("package.json missing")
        return
    try:
        pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        errors.append(f"package.json unreadable: {exc}")
        return
    scripts = pkg.get("scripts")
    if not isinstance(scripts, dict) or not isinstance(scripts.get("build"), str):
        errors.append("package.json scripts.build missing")


def prune_node_modules(workspace: Path, errors: list[str]) -> None:
    """Best-effort cleanup of dependency installs before forbidden-path checks."""
    if workspace.is_symlink() or not workspace.is_dir():
        return
    node_modules = workspace / "node_modules"
    for _ in range(PRUNE_NODE_MODULES_ATTEMPTS):
        try:
            if node_modules.is_symlink() or node_modules.is_file():
                node_modules.unlink()
            else:
                shutil.rmtree(node_modules)
            return
        except FileNotFoundError:
            if not node_modules.exists():
                return
            # A gcsfuse fd-walk can lose one child while siblings remain.
            # Retry until the forbidden directory is actually gone.
        except OSError as exc:
            errors.append(
                "could not clear forbidden path before validation: "
                f"node_modules ({exc})"
            )
            return
    if node_modules.exists():
        errors.append(
            "could not clear forbidden path before validation: node_modules "
            "(persistent removal race)"
        )


def check_forbidden(workspace: Path, errors: list[str]) -> None:
    for rel in FORBIDDEN_PATHS:
        if (workspace / rel).exists():
            errors.append(f"forbidden path present (should not be seeded): {rel}")


def check_no_symlinks(workspace: Path, errors: list[str]) -> None:
    """Reject symlinks under current/.

    The build copies with ``copytree(symlinks=False)``: it follows symlinks and
    copies their TARGETS, so a symlink could pull bytes from outside the workspace
    into the built artifact, or make the copy fail on a loop. A clean project is
    exactly the files it appears to be. dist/, node_modules and .git are not
    source and aren't scanned (mirrors the placeholder scan).
    """
    # current/ itself being a symlink is invisible to the descendant walk below
    # (os.walk opens its target), so check the root link explicitly.
    if workspace.is_symlink():
        errors.append("symlink not allowed: current/ must not be a symlink")
        return
    for dirpath, dirnames, filenames in os.walk(workspace):  # followlinks=False
        dirnames[:] = [d for d in dirnames if d not in SCAN_EXCLUDE_DIRS]
        base = Path(dirpath)
        for name in (*dirnames, *filenames):
            if (base / name).is_symlink():
                rel = (base / name).relative_to(workspace)
                errors.append(f"symlink not allowed under current/: {rel}")


def check_placeholders(workspace: Path, errors: list[str]) -> None:
    """Leftover scaffold markers are ERRORS: a placeholder build is starter
    scaffolding, not the user's game, and must never pass the gate into a
    checkpointed version."""
    for path in sorted(workspace.rglob("*")):
        if not path.is_file() or path.suffix not in SCAN_SUFFIXES:
            continue
        if any(part in SCAN_EXCLUDE_DIRS for part in path.relative_to(workspace).parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for marker in PLACEHOLDER_MARKERS:
            if marker in text:
                rel = path.relative_to(workspace)
                errors.append(f"leftover scaffold placeholder {marker!r} in {rel}")
                break


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a game-kit workspace.")
    parser.add_argument(
        "--workspace",
        required=True,
        help="Workspace container (the agent's cwd). The project validated is <ws>/current.",
    )
    parser.add_argument(
        "--mode",
        help="Ignored compatibility flag. The validation contract is workspace shape.",
    )
    args = parser.parse_args()

    start = time.perf_counter()
    workspace = Path(args.workspace)
    project = workspace / PROJECT_SUBDIR
    errors: list[str] = []
    warnings: list[str] = []

    if not project.is_dir():
        json.dump(
            {
                "status": "error",
                "stage": "validate",
                "ok": False,
                "errors": [
                    f"project dir not found: {project} (run seed_template first)"
                ],
                "warnings": [],
                "duration_ms": int((time.perf_counter() - start) * 1000),
            },
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        sys.exit(1)

    prune_node_modules(project, errors)
    check_required(project, errors)
    check_package_json(project, errors)
    check_forbidden(project, errors)
    check_no_symlinks(project, errors)
    check_placeholders(project, errors)

    ok = not errors
    json.dump(
        {
            "status": "ok" if ok else "error",
            "stage": "validate",
            "ok": ok,
            "workspace": str(workspace.resolve()),
            "current": str(project.resolve()),
            "errors": errors,
            "warnings": warnings,
            "duration_ms": int((time.perf_counter() - start) * 1000),
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

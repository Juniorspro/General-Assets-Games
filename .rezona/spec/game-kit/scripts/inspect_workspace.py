#!/usr/bin/env python3
"""Inspect a game-kit workspace and report a structured summary.

Layout (Option B): ``--workspace`` is the CONTAINER; the project inspected is
<ws>/current. Version snapshots (<ws>/v1, v2, …) are listed separately.

Produces a bounded file-tree summary, parsed package.json highlights, an assets
listing, and dist status for <ws>/current, plus a list of existing version
snapshots. Read-only: never installs, builds, or mutates anything.

THIN: reporting only. JSON output.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from _gcs import list_child_dirs, list_files, object_exists

EXCLUDE_DIRS = {"node_modules", ".git"}

# The live Vite project always lives at <ws>/current.
PROJECT_SUBDIR = "current"

# Version snapshots are <ws>/v1, v2, … (created by checkpoint.py).
VERSION_RE = re.compile(r"^v[0-9]+$")
ASSET_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",
    ".glb",
    ".gltf",
    ".obj",
    ".fbx",
    ".mp4",
    ".webm",
    ".ttf",
    ".otf",
    ".woff",
    ".woff2",
}
MAX_TREE_ENTRIES = 500


def build_tree(workspace: Path) -> tuple[list[str], int, bool]:
    """Return (relative paths, total file count, truncated flag)."""
    entries: list[str] = []
    total = 0
    truncated = False
    for path in sorted(workspace.rglob("*")):
        rel = path.relative_to(workspace)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        if path.is_file():
            total += 1
        if len(entries) < MAX_TREE_ENTRIES:
            entries.append(str(rel) + ("/" if path.is_dir() else ""))
        else:
            truncated = True
    return entries, total, truncated


def read_package(workspace: Path) -> dict[str, object]:
    pkg_path = workspace / "package.json"
    if not pkg_path.is_file():
        return {"present": False}
    try:
        pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return {"present": True, "error": f"unreadable: {exc}"}
    return {
        "present": True,
        "name": pkg.get("name"),
        "version": pkg.get("version"),
        "type": pkg.get("type"),
        "scripts": pkg.get("scripts", {}),
        "dependencies": pkg.get("dependencies", {}),
        "devDependencies": pkg.get("devDependencies", {}),
    }


def list_assets(workspace: Path) -> list[dict[str, object]]:
    assets: list[dict[str, object]] = []
    for path in sorted(workspace.rglob("*")):
        rel = path.relative_to(workspace)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        if path.is_file() and path.suffix.lower() in ASSET_SUFFIXES:
            try:
                size = path.stat().st_size
            except OSError:
                size = -1
            assets.append({"path": str(rel), "bytes": size})
    return assets


def dist_status(workspace: Path) -> dict[str, object]:
    dist = workspace / "dist"
    try:
        api_files = list_files(dist)
    except Exception:
        # Keep inspection usable when the GCS API probe fails and dist/ exists
        # through the filesystem fallback path.
        api_files = None
    if api_files is not None:
        return {
            "present": bool(api_files),
            "has_index_html": "index.html" in api_files,
            "file_count": len(api_files),
            "files": api_files[:200],
        }
    if not dist.is_dir():
        return {"present": False}
    files = sorted(str(p.relative_to(dist)) for p in dist.rglob("*") if p.is_file())
    return {
        "present": True,
        "has_index_html": (dist / "index.html").is_file(),
        "file_count": len(files),
        "files": files[:200],
    }


def list_versions(workspace: Path) -> list[dict[str, object]]:
    """List <ws>/v[0-9]+/ snapshot dirs with readiness and dist status.

    Each entry reports whether the snapshot has dist/index.html and whether the
    checkpoint completion sentinel (.ready) is present.
    """
    versions: list[dict[str, object]] = []
    try:
        api_children = list_child_dirs(workspace)
    except Exception:
        api_children = None
    if api_children is not None:
        version_names = sorted(name for name in api_children if VERSION_RE.match(name))
    else:
        version_names = sorted(
            entry.name
            for entry in workspace.iterdir()
            if entry.is_dir() and VERSION_RE.match(entry.name)
        )
    for name in version_names:
        entry = workspace / name
        dist_index = entry / "dist" / "index.html"
        try:
            api_ready = object_exists(entry / ".ready")
        except Exception:
            api_ready = None
        try:
            api_dist_index = object_exists(dist_index)
        except Exception:
            api_dist_index = None
        versions.append(
            {
                "name": name,
                "ready": api_ready
                if api_ready is not None
                else (entry / ".ready").is_file(),
                "has_dist_index_html": api_dist_index
                if api_dist_index is not None
                else dist_index.is_file(),
            }
        )
    versions.sort(key=lambda v: int(str(v["name"])[1:]))
    return versions


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect a game-kit workspace.")
    parser.add_argument(
        "--workspace",
        required=True,
        help="Workspace container (the agent's cwd). The project inspected is <ws>/current.",
    )
    args = parser.parse_args()

    workspace = Path(args.workspace)
    if not workspace.is_dir():
        json.dump(
            {"status": "error", "error": f"workspace is not a directory: {workspace}"},
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        sys.exit(1)

    project = workspace / PROJECT_SUBDIR
    if not project.is_dir():
        json.dump(
            {
                "status": "error",
                "error": f"project dir not found: {project} (run seed_template first)",
                "versions": list_versions(workspace),
            },
            sys.stdout,
            indent=2,
        )
        sys.stdout.write("\n")
        sys.exit(1)

    tree, total_files, truncated = build_tree(project)
    json.dump(
        {
            "status": "ok",
            "workspace": str(workspace.resolve()),
            "current": str(project.resolve()),
            "package_json": read_package(project),
            "tree": {
                "total_files": total_files,
                "truncated": truncated,
                "entries": tree,
            },
            "assets": list_assets(project),
            "dist": dist_status(project),
            "versions": list_versions(workspace),
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

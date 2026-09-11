#!/usr/bin/env python3
"""Build provenance helpers for game-kit workspaces."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MANIFEST_NAME = ".game-kit-build.json"
MANIFEST_VERSION = 1

EXCLUDED_DIRS = {"dist", "node_modules", ".git"}


def source_digest(project: Path) -> str:
    """Return a stable digest for project sources and build inputs."""
    digest = hashlib.sha256()
    for path in sorted(project.rglob("*")):
        rel = path.relative_to(project)
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        if path.name == MANIFEST_NAME:
            continue
        if not path.is_file():
            continue
        digest.update(rel.as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def file_digest(path: Path) -> str | None:
    if not path.is_file():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dist_files(project: Path) -> list[str]:
    dist = project / "dist"
    if not dist.is_dir():
        return []
    return sorted(str(p.relative_to(dist)) for p in dist.rglob("*") if p.is_file())


def manifest_path(project: Path) -> Path:
    return project / MANIFEST_NAME


def write_manifest(
    project: Path, *, mode: str, dist_file_list: list[str]
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "version": MANIFEST_VERSION,
        "mode": mode,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "source_digest": source_digest(project),
        "lockfile_digest": file_digest(project / "bun.lock"),
        "dist_files": sorted(dist_file_list),
    }
    manifest_path(project).write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return payload


def verify_manifest(project: Path, *, mode: str | None = None) -> dict[str, Any]:
    path = manifest_path(project)
    if not path.is_file():
        raise ValueError(
            f"{MANIFEST_NAME} not found; run build_game.py before checkpoint/package"
        )
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"{MANIFEST_NAME} is unreadable: {exc}") from exc

    if payload.get("version") != MANIFEST_VERSION:
        raise ValueError(
            f"{MANIFEST_NAME} version is {payload.get('version')!r}; "
            f"expected {MANIFEST_VERSION}"
        )
    if mode is not None and payload.get("mode") != mode:
        raise ValueError(
            f"{MANIFEST_NAME} mode is {payload.get('mode')!r}; expected {mode!r}"
        )

    current_source_digest = source_digest(project)
    if payload.get("source_digest") != current_source_digest:
        raise ValueError(
            "build source digest does not match current source; run build_game.py again"
        )

    current_lock_digest = file_digest(project / "bun.lock")
    if payload.get("lockfile_digest") != current_lock_digest:
        raise ValueError(
            "build lockfile digest does not match current lockfile; run build_game.py again"
        )

    current_dist_files = dist_files(project)
    if payload.get("dist_files") != current_dist_files:
        raise ValueError(
            "build dist file list does not match current dist; run build_game.py again"
        )

    return payload

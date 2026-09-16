#!/usr/bin/env python3
"""Cut an immutable version snapshot of a game-kit workspace.

Layout (Option B): ``--workspace`` is the CONTAINER; the live Vite project is
<ws>/current. Version snapshots are <ws>/v1, v2, ... -- each an immutable copy of
a ``current/`` state at the moment it was green.

Flow:
  1. GATE: require <ws>/current/dist/index.html (i.e. build_game produced a green
     build). This is the ONLY gate that couples build -> version.
  2. Determine the next version: scan <ws> for dirs matching ^v[0-9]+$, take the
     max number + 1 (v1 if none exist).
  3. Copy <ws>/current -> <ws>/v{n} (recursive; exclude node_modules and .git;
     INCLUDE dist/ since it is the served artifact).
  4. Write an EMPTY completion sentinel <ws>/v{n}/.ready after every file is
     copied. The backend scans <ws>/v*/ and must treat a version as ready only if
     .ready exists (gcsfuse directory copy is not atomic). No other manifest.
  5. Best-effort cover backfill: if configured, spawn a detached worker to
     screenshot v{n}/dist/index.html and write v{n}/cover.png once. Cover
     failures do not fail checkpoint.

THIN: copy + sentinel + optional configured cover worker only. No publish,
no upload, no arbitrary command passthrough.
"""

from __future__ import annotations

import argparse
import asyncio
import ipaddress
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

import httpx

from _gcs import (
    gcs_copy_dir,
    list_child_dirs,
    list_files,
    object_exists,
    parallel_copy_dir,
    read_object,
    write_object,
)

# The live Vite project always lives at <ws>/current.
PROJECT_SUBDIR = "current"

# Version snapshots are <ws>/v1, v2, ...
VERSION_RE = re.compile(r"^v[0-9]+$")

# Build artifact that gates checkpointing.
DIST_ARTIFACT = "dist/index.html"

# Completion sentinel written after the snapshot copy so readers can detect a
# fully-copied snapshot. Cover backfill may write cover.png after this point.
READY_SENTINEL = ".ready"
COVER_FILENAME = "cover.png"

# Directories never copied into a snapshot. dist/ is intentionally NOT excluded:
# it is the served artifact and must be captured.
SNAPSHOT_EXCLUDE = {"node_modules", ".git"}

DEFAULT_COVER_STORAGE = "oss"
DEFAULT_COVER_DEVICE = "mobile"
DEFAULT_COVER_WIDTH = 430
DEFAULT_COVER_HEIGHT = 870
DEFAULT_COVER_WAIT_MS = 1200
DEFAULT_COVER_TIMEOUT_SECONDS = 60.0
DEFAULT_COVER_MAX_BYTES = 32 * 1024 * 1024
REDIRECT_LIMIT = 5
CONTROL_RESPONSE_CAP = 1024 * 1024


def fail(message: str) -> "None":
    """Emit a JSON error to stdout and exit non-zero."""
    json.dump({"status": "error", "error": message}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    sys.exit(1)


def next_version(workspace: Path) -> int:
    """Return the next version number: max existing v{n} + 1, or 1 if none.

    On gcsfuse, list the children through the GCS API (authoritative) rather than
    ``iterdir`` (gcsfuse caches directory listings): snapshots are written via the
    API, so a cached gcsfuse listing could miss a just-written v{n} and reuse the
    number, overwriting an immutable snapshot. Off gcsfuse, fall back to iterdir.
    """
    names = list_child_dirs(workspace)
    if names is None:
        names = [entry.name for entry in workspace.iterdir() if entry.is_dir()]
    highest = 0
    for name in names:
        if VERSION_RE.match(name):
            highest = max(highest, int(name[1:]))
    return highest + 1


def cover_config_from_env() -> dict[str, Any]:
    return {
        "enabled": os.environ.get("GAME_KIT_COVER_ENABLED", "false").lower() == "true",
        "screenshot_endpoint": os.environ.get(
            "GAME_KIT_COVER_SCREENSHOT_ENDPOINT", ""
        ).strip(),
        "preview_base": os.environ.get("GAME_KIT_PREVIEW_BASE", "").strip().rstrip("/"),
        "user_id": os.environ.get("GAME_KIT_USER_ID", "").strip(),
        "project_id": os.environ.get("GAME_KIT_PROJECT_ID", "").strip(),
        "storage": os.environ.get("GAME_KIT_COVER_STORAGE", DEFAULT_COVER_STORAGE),
        "device": os.environ.get("GAME_KIT_COVER_DEVICE", DEFAULT_COVER_DEVICE),
        "width": int(os.environ.get("GAME_KIT_COVER_WIDTH", DEFAULT_COVER_WIDTH)),
        "height": int(os.environ.get("GAME_KIT_COVER_HEIGHT", DEFAULT_COVER_HEIGHT)),
        "wait_ms": int(os.environ.get("GAME_KIT_COVER_WAIT_MS", DEFAULT_COVER_WAIT_MS)),
        "timeout_seconds": float(
            os.environ.get(
                "GAME_KIT_COVER_TIMEOUT_SECONDS", DEFAULT_COVER_TIMEOUT_SECONDS
            )
        ),
        "max_bytes": int(
            os.environ.get("GAME_KIT_COVER_MAX_BYTES", DEFAULT_COVER_MAX_BYTES)
        ),
    }


def schedule_cover_backfill(workspace: Path, version: str) -> dict[str, Any]:
    cfg = cover_config_from_env()
    if not cfg["enabled"]:
        return {"scheduled": False, "reason": "disabled"}
    missing = [
        key
        for key in ("screenshot_endpoint", "preview_base", "user_id", "project_id")
        if not cfg[key]
    ]
    if missing:
        return {"scheduled": False, "reason": "missing_config", "missing": missing}
    cover_path = workspace / version / COVER_FILENAME
    if cover_path.exists():
        return {"scheduled": False, "reason": "already_exists", "path": str(cover_path)}

    argv = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--cover-worker",
        "--workspace",
        str(workspace),
        "--version",
        version,
    ]
    try:
        subprocess.Popen(
            argv,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=os.environ.copy(),
            start_new_session=True,
        )
    except OSError as exc:
        return {"scheduled": False, "reason": "spawn_failed", "error": str(exc)}
    return {"scheduled": True, "version": version, "path": str(cover_path)}


async def maybe_generate_cover(workspace: Path, version: str) -> dict[str, Any]:
    cfg = cover_config_from_env()
    if not cfg["enabled"]:
        return {"written": False, "reason": "disabled"}
    missing = [
        key
        for key in ("screenshot_endpoint", "preview_base", "user_id", "project_id")
        if not cfg[key]
    ]
    if missing:
        return {"written": False, "reason": "missing_config", "missing": missing}

    cover_path = workspace / version / COVER_FILENAME
    if cover_path.exists():
        return {"written": False, "reason": "already_exists", "path": str(cover_path)}

    target_url = preview_url(
        cfg["preview_base"],
        user_id=cfg["user_id"],
        project_id=cfg["project_id"],
        version=version,
        path=DIST_ARTIFACT,
    )
    try:
        oss_url = await request_screenshot(cfg, target_url)
        raw = await download_public_url(
            oss_url, timeout=cfg["timeout_seconds"], cap=cfg["max_bytes"]
        )
        await asyncio.to_thread(write_once, cover_path, raw)
    except FileExistsError:
        return {"written": False, "reason": "already_exists", "path": str(cover_path)}
    except Exception as exc:  # noqa: BLE001
        return {"written": False, "reason": "failed", "error": str(exc)}

    return {"written": True, "path": str(cover_path), "target_url": target_url}


async def request_screenshot(cfg: dict[str, Any], target_url: str) -> str:
    payload = {
        "targetUrl": target_url,
        "storage": cfg["storage"],
        "device": cfg["device"],
        "width": cfg["width"],
        "height": cfg["height"],
        "waitMs": cfg["wait_ms"],
    }
    headers = {"content-type": "application/json", "x-source": "koubou-agent"}
    async with httpx.AsyncClient(timeout=cfg["timeout_seconds"]) as client:
        async with client.stream(
            "POST", cfg["screenshot_endpoint"], json=payload, headers=headers
        ) as response:
            if not response.is_success:
                detail = (
                    await read_response_capped(response, 500, "Screenshot response")
                ).decode("utf-8", "replace")
                raise ValueError(
                    f"screenshot failed: HTTP {response.status_code} {detail}"
                )
            raw = await read_response_capped(
                response, CONTROL_RESPONSE_CAP, "Screenshot response"
            )
    parsed = json.loads(raw.decode("utf-8"))
    if not isinstance(parsed, dict) or parsed.get("code") != 0:
        raise ValueError(f"screenshot rejected: {parsed!r}")
    data = parsed.get("data") or {}
    if not isinstance(data, dict):
        raise ValueError("screenshot response data is not an object")
    oss_url = str(data.get("ossUrl") or "").strip()
    if not oss_url:
        raise ValueError("screenshot response missing data.ossUrl")
    return oss_url


async def download_public_url(url: str, *, timeout: float, cap: int) -> bytes:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(REDIRECT_LIMIT):
            await assert_public_http_url(url)
            async with client.stream("GET", url) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("cover download redirect without location")
                    url = str(httpx.URL(url).join(location))
                    continue
                if not response.is_success:
                    detail = (
                        await read_response_capped(response, 500, "Cover download")
                    ).decode("utf-8", "replace")
                    raise ValueError(
                        f"cover download failed: HTTP {response.status_code} {detail}"
                    )
                return await read_response_capped(response, cap, "Cover download")
    raise ValueError("cover download exceeded the redirect limit")


async def assert_public_http_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError(f"download URL must be http(s), got {parsed.scheme!r}")
    host = parsed.hostname
    if not host:
        raise ValueError("download URL has no host")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(
            host, port, type=socket.SOCK_STREAM
        )
    except OSError as exc:
        raise ValueError(f"download host {host!r} does not resolve") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise ValueError(f"download host {host!r} resolves to a non-public address")


async def read_response_capped(
    response: httpx.Response, cap: int, operation: str
) -> bytes:
    declared = response.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > cap:
        raise ValueError(f"{operation} exceeds the configured byte limit")
    buffer = bytearray()
    async for chunk in response.aiter_bytes():
        buffer += chunk
        if len(buffer) > cap:
            raise ValueError(f"{operation} exceeds the configured byte limit")
    return bytes(buffer)


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(fd, "wb") as handle:
        handle.write(data)


def preview_url(
    preview_base: str, *, user_id: str, project_id: str, version: str, path: str
) -> str:
    return (
        f"{preview_base.rstrip('/')}/preview/"
        f"{quote(user_id, safe='')}/{quote(project_id, safe='')}/"
        f"{quote(version, safe='')}/{quote(path, safe='/')}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cut an immutable version snapshot of a game-kit workspace."
    )
    parser.add_argument(
        "--workspace",
        required=True,
        help="Workspace container (the agent's cwd). The project snapshotted is <ws>/current.",
    )
    parser.add_argument(
        "--note",
        default=None,
        help="Optional free-text note describing this version (echoed in JSON).",
    )
    parser.add_argument("--cover-worker", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--version", default="", help=argparse.SUPPRESS)
    args = parser.parse_args()

    workspace = Path(args.workspace)
    if args.cover_worker:
        if not args.version:
            fail("--cover-worker requires --version")
        result = asyncio.run(maybe_generate_cover(workspace, args.version))
        json.dump({"status": "ok", "cover": result}, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return
    start = time.perf_counter()
    if not workspace.is_dir():
        fail(f"workspace is not a directory: {workspace}")

    project = workspace / PROJECT_SUBDIR
    if not project.is_dir():
        fail(f"project dir not found: {project} (run seed_template first)")

    # GATE: only a green build (dist/index.html) may be checkpointed. On gcsfuse,
    # build_game writes dist/ via the GCS API, so check object existence there
    # rather than depending on a FUSE stat/listing cache to notice it.
    dist_artifact = project / DIST_ARTIFACT
    try:
        api_exists = object_exists(dist_artifact)
    except Exception:
        # GCS existence is an optimization for API-written dist/ objects. If the
        # API is unavailable and dist was written through the filesystem fallback,
        # keep the old gate behavior.
        api_exists = None
    api_dist_gate = api_exists is True
    if not (api_exists if api_exists is not None else dist_artifact.is_file()):
        fail(
            f"{PROJECT_SUBDIR}/{DIST_ARTIFACT} not found; run build_game first to "
            "produce a green build before checkpointing"
        )

    version = next_version(workspace)
    name = f"v{version}"
    dest = workspace / name
    if dest.exists():  # defensive; next_version should preclude this
        fail(f"version dir already exists: {dest}")

    # Snapshot current/ -> v{n}. On gcsfuse, copy objects server-side via the GCS
    # API (no per-file FUSE latency, ~360 chunks in ~2s vs ~64s); off gcsfuse, or
    # on any GCS error, fall back to a threaded filesystem copy.
    copied: list[str] | None = None
    try:
        copied = gcs_copy_dir(project, dest, exclude_dirs=SNAPSHOT_EXCLUDE)
    except Exception:
        shutil.rmtree(dest, ignore_errors=True)  # drop any partial API copy
        copied = None

    # If the dist gate succeeded only via the GCS API but the snapshot API copy
    # failed, a filesystem fallback may not see API-uploaded dist/ through FUSE
    # caches. Do not publish a ready snapshot with missing/stale build output.
    if copied is None and api_dist_gate:
        files = list_files(project, exclude_dirs=SNAPSHOT_EXCLUDE)
        if files is None:
            fail("cannot fall back to filesystem snapshot after API-only dist gate")
            raise AssertionError("unreachable after fail")
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        for rel in files:
            data = read_object(project / rel)
            if data is None:
                fail(f"source file disappeared while checkpointing: {rel}")
                raise AssertionError("unreachable after fail")
            target = dest / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        copied = files

    if copied is not None:
        files = copied
        # Land the completion sentinel as a real object beside the API copy
        # (writing it through gcsfuse would not be visible to the API listing).
        if not write_object(dest / READY_SENTINEL, b""):
            (dest / READY_SENTINEL).touch()
        files.append(READY_SENTINEL)
    else:
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        try:
            parallel_copy_dir(project, dest, ignore_names=SNAPSHOT_EXCLUDE)
        except OSError as exc:
            fail(f"failed to copy {project} -> {dest}: {exc}")
        files = sorted(str(p.relative_to(dest)) for p in dest.rglob("*") if p.is_file())
        # Write the completion sentinel after all snapshot files are in place.
        try:
            (dest / READY_SENTINEL).touch()
        except OSError as exc:
            fail(f"failed to write completion sentinel in {dest}: {exc}")
        files.append(READY_SENTINEL)

    cover_result = schedule_cover_backfill(workspace, name)

    result: dict[str, object] = {
        "status": "ok",
        "version": name,
        "path": str(dest),
        "files": files,
        "cover": cover_result,
        "duration_ms": int((time.perf_counter() - start) * 1000),
    }
    if args.note is not None:
        result["note"] = args.note
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Browser-smoke a built game-kit dist artifact.

This is a thin post-build runtime check. It serves ``dist/`` on a loopback HTTP
server, then delegates browser inspection to a runner command. By default the
runner is ``smoke_dist_runner.mjs`` via npx Playwright; tests may inject
``GAME_KIT_SMOKE_RUNNER``.
"""

from __future__ import annotations

import argparse
import functools
import json
import os
import shlex
import shutil
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

PROJECT_SUBDIR = "current"
VERSION_RE_PREFIX = "v"
DIST_ARTIFACT = "index.html"
RUNNER = Path(__file__).resolve().with_name("smoke_dist_runner.mjs")


def emit(payload: dict[str, Any], exit_code: int) -> "None":
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    sys.exit(exit_code)


def fail(stage: str, message: str, *, exit_code: int = 1, **extra: Any) -> "None":
    payload: dict[str, Any] = {
        "status": "error",
        "stage": stage,
        "error": message,
    }
    payload.update(extra)
    emit(payload, exit_code)


def resolve_target(workspace: Path, version: str | None) -> tuple[Path, str]:
    if version is None:
        return workspace / PROJECT_SUBDIR, PROJECT_SUBDIR
    if not version.startswith(VERSION_RE_PREFIX) or not version[1:].isdigit():
        fail("validate", f"invalid --version {version!r}; expected e.g. v3")
    return workspace / version, version


def runner_command() -> list[str]:
    injected = os.environ.get("GAME_KIT_SMOKE_RUNNER", "").strip()
    if injected:
        return shlex.split(injected)
    return [
        "npx",
        "--yes",
        "--package",
        "playwright",
        "node",
        str(RUNNER),
    ]


def serve_dist(dist: Path) -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(dist))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    return server, f"http://{host}:{port}/{DIST_ARTIFACT}"


def run_browser(
    url: str, *, timeout_ms: int, wait_ms: int, shots_dir: Path, probe: bool
) -> tuple[int, str, str]:
    cmd = runner_command() + [
        "--url",
        url,
        "--timeout-ms",
        str(timeout_ms),
        "--wait-ms",
        str(wait_ms),
        "--shots-dir",
        str(shots_dir),
        "--probe",
        "1" if probe else "0",
    ]
    proc = subprocess.run(
        cmd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=max(1, int(timeout_ms / 1000) + 10),
        check=False,
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def parse_browser_payload(stdout: str, stderr: str) -> dict[str, Any]:
    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError as exc:
        detail = stderr.strip() or stdout.strip() or str(exc)
        raise ValueError(f"browser runner did not return JSON: {detail}") from exc
    if not isinstance(payload, dict):
        raise ValueError("browser runner JSON is not an object")
    return payload


def browser_error_message(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("errors", "page_errors", "console_errors"):
        values = payload.get(key)
        if isinstance(values, list):
            parts.extend(str(value) for value in values)
    return "; ".join(parts) or "browser smoke failed"


def main() -> None:
    parser = argparse.ArgumentParser(description="Browser-smoke a built game-kit dist.")
    parser.add_argument(
        "--workspace", required=True, help="Workspace container directory."
    )
    parser.add_argument(
        "--version",
        default=None,
        help="Smoke a version snapshot such as v3; default smokes current/.",
    )
    parser.add_argument("--timeout-ms", type=int, default=30000)
    parser.add_argument("--wait-ms", type=int, default=1200)
    parser.add_argument(
        "--shots-dir",
        default=None,
        help="Directory for initial/settled/probed screenshots (default: <ws>/.smoke).",
    )
    parser.add_argument(
        "--no-probe",
        action="store_true",
        help="Skip the synthetic input probe (tap/keys) and its screenshot.",
    )
    parser.add_argument(
        "--screenshot",
        default=None,
        help="Deprecated alias: additionally copy the settled screenshot here.",
    )
    args = parser.parse_args()

    workspace = Path(args.workspace)
    if not workspace.is_dir():
        fail("validate", f"workspace is not a directory: {workspace}")

    target, source_label = resolve_target(workspace, args.version)
    if not target.is_dir():
        fail("validate", f"project not found: {target}")

    dist = target / "dist"
    artifact = dist / DIST_ARTIFACT
    if not artifact.is_file():
        fail(
            "validate",
            f"{source_label}/dist/{DIST_ARTIFACT} not found; run build_game.py first",
        )

    # Screenshots default to the CONTAINER-level .smoke/ dir: readable by the
    # agent for its visual self-review, never captured into version snapshots.
    shots_dir = Path(args.shots_dir) if args.shots_dir else workspace / ".smoke"
    try:
        shots_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        fail("validate", f"cannot create shots dir {shots_dir}: {exc}")

    server: ThreadingHTTPServer | None = None
    try:
        server, url = serve_dist(dist)
        code, stdout, stderr = run_browser(
            url,
            timeout_ms=args.timeout_ms,
            wait_ms=args.wait_ms,
            shots_dir=shots_dir,
            probe=not args.no_probe,
        )
    except subprocess.TimeoutExpired as exc:
        fail("browser", f"browser runner timed out: {exc}")
    except OSError as exc:
        fail("browser", f"failed to run browser runner: {exc}")
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()

    try:
        browser = parse_browser_payload(stdout, stderr)
    except ValueError as exc:
        fail("browser", str(exc), runner_stderr=stderr)

    if code != 0 or browser.get("status") != "ok":
        fail(
            "browser",
            browser_error_message(browser),
            exit_code=code if code else 1,
            browser=browser,
            runner_stderr=stderr,
        )

    shots = browser.get("shots") if isinstance(browser.get("shots"), dict) else {}
    if args.screenshot and shots.get("settled"):
        # Deprecated --screenshot alias: keep old callers working by copying
        # the settled shot to the requested path.
        try:
            shutil.copy2(shots["settled"], args.screenshot)
        except OSError:
            pass

    emit(
        {
            "status": "ok",
            "stage": "done",
            "source": source_label,
            "url": url,
            "shots": shots,
            "browser": browser,
        },
        0,
    )


if __name__ == "__main__":
    main()

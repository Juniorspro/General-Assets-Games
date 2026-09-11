#!/usr/bin/env python3
"""Add npm dependencies to a game-kit workspace via bun, without touching fuse.

Copies <ws>/current/{package.json,bun.lock} into a /tmp scratch, runs the
FIXED command ``bun add [--dev] <specs...>`` there (node_modules lands in the
scratch, never on the gcsfuse workspace), then syncs ONLY the two manifest
files back. Rebuild with build_game.py afterwards — this script never builds.

THIN: manifest sync only. No install into the workspace, no build, no
arbitrary command passthrough. Package specs are validated against a strict
shape so arguments can never smuggle bun flags.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# The live Vite project always lives at <ws>/current.
PROJECT_SUBDIR = "current"

MANIFEST_FILES = ("package.json", "bun.lock")

# name[@range], with an optional @scope/ prefix. Anything else — flags,
# paths, URLs, spaces — is rejected before reaching bun.
SPEC_RE = re.compile(
    r"^(@[a-z0-9~][\w.-]*/)?[a-z0-9~][\w.-]*(@[\w.^~<>=*|-]+)?$",
    re.IGNORECASE,
)

# Allowed roots for the workspace. Same contract as build_game.py.
DEFAULT_ALLOWED_ROOTS = ("/workspace", "/tmp", tempfile.gettempdir())
LOG_TRUNCATE_BYTES = 8000


def fail(stage: str, message: str, exit_code: int = 1) -> "None":
    """Emit a structured JSON failure and exit."""
    json.dump(
        {
            "status": "error",
            "stage": stage,
            "exit_code": exit_code,
            "error": message,
            "logs": {},
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")
    sys.exit(exit_code)


def allowed_roots() -> list[Path]:
    extra = os.environ.get("GAME_KIT_ALLOWED_ROOTS", "")
    roots = list(DEFAULT_ALLOWED_ROOTS) + [p for p in extra.split(os.pathsep) if p]
    return [Path(r).resolve() for r in roots]


def is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def validate_workspace_root(workspace: Path) -> None:
    resolved = workspace.resolve()
    if not resolved.is_dir():
        fail("validate", f"workspace is not a directory: {resolved}")
    roots = allowed_roots()
    if not any(is_within(resolved, root) for root in roots):
        fail(
            "validate",
            f"workspace {resolved} is outside allowed roots {[str(r) for r in roots]}",
        )


def validate_specs(specs: list[str]) -> None:
    for spec in specs:
        if spec.startswith("-") or not SPEC_RE.fullmatch(spec):
            fail("validate", f"invalid package spec: {spec!r}")


def truncate(text: str) -> str:
    data = text.encode("utf-8", errors="replace")
    if len(data) <= LOG_TRUNCATE_BYTES:
        return text
    head = data[:LOG_TRUNCATE_BYTES].decode("utf-8", errors="replace")
    return head + f"\n... [truncated, {len(data) - LOG_TRUNCATE_BYTES} more bytes]"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add npm dependencies to a game-kit workspace (manifest sync only)."
    )
    parser.add_argument(
        "--workspace",
        required=True,
        help="Workspace container (the agent's cwd). The project is <ws>/current.",
    )
    parser.add_argument(
        "--pkg",
        action="append",
        required=True,
        metavar="SPEC",
        help="Package spec like three or three@0.185.1; repeat for multiple packages.",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Add to devDependencies instead of dependencies.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
        help="bun add timeout in seconds (default: 300).",
    )
    args = parser.parse_args()

    workspace = Path(args.workspace)
    validate_workspace_root(workspace)
    project = (workspace / PROJECT_SUBDIR).resolve()
    if not project.is_dir():
        fail("validate", f"project dir not found: {project} (run seed_template first)")

    pkg_path = project / "package.json"
    if not pkg_path.is_file():
        fail("validate", f"package.json not found in {project}")
    try:
        json.loads(pkg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        fail("validate", f"cannot parse package.json: {exc}")

    validate_specs(args.pkg)

    scratch: Path | None = None
    logs: dict[str, str] = {}
    timings: dict[str, int] = {}
    try:
        scratch = Path(tempfile.mkdtemp(prefix="game-kit-add-"))
        for name in MANIFEST_FILES:
            src = project / name
            if src.is_file():  # bun.lock may not exist yet on a fresh workspace
                shutil.copy2(src, scratch / name)

        cmd = ["bun", "add", *(["--dev"] if args.dev else []), *args.pkg]
        t0 = time.perf_counter()
        try:
            proc = subprocess.run(
                cmd,
                cwd=str(scratch),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=args.timeout,
                text=True,
                check=False,
            )
            add_code, add_log = proc.returncode, proc.stdout or ""
        except FileNotFoundError as exc:
            add_code, add_log = 127, f"command not found: bun ({exc})"
        except subprocess.TimeoutExpired as exc:
            partial = exc.output or ""
            if isinstance(partial, bytes):
                partial = partial.decode("utf-8", errors="replace")
            add_code, add_log = 124, f"timed out after {args.timeout}s\n{partial}"
        timings["add_ms"] = int((time.perf_counter() - t0) * 1000)
        logs["add"] = truncate(add_log)

        if add_code != 0:
            json.dump(
                {
                    "status": "error",
                    "stage": "add",
                    "exit_code": add_code,
                    "logs": logs,
                    "timings": timings,
                },
                sys.stdout,
                indent=2,
            )
            sys.stdout.write("\n")
            sys.exit(add_code if add_code in (124, 127) else 1)

        for name in MANIFEST_FILES:
            src = scratch / name
            if not src.is_file():
                fail("sync", f"bun add did not produce {name} in the scratch")
            shutil.copy2(src, project / name)
    finally:
        if scratch is not None:
            shutil.rmtree(scratch, ignore_errors=True)

    json.dump(
        {
            "status": "ok",
            "stage": "done",
            "exit_code": 0,
            "workspace": str(workspace.resolve()),
            "current": str(project),
            "added": args.pkg,
            "dev": args.dev,
            "logs": logs,
            "timings": timings,
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")


def _emit_internal_error(exc: BaseException) -> None:
    """Surface unexpected crashes through the JSON contract instead of a raw
    traceback (same rationale as build_game.py)."""
    import traceback

    detail = "".join(traceback.format_exception_only(type(exc), exc)).strip()
    fail("internal", f"add_dependency.py crashed before producing a result: {detail}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - deliberate catch-all; see _emit_internal_error
        _emit_internal_error(exc)

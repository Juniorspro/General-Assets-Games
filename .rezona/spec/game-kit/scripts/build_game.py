#!/usr/bin/env python3
"""Build a game-kit workspace with a FIXED, non-negotiable flow.

Layout (Option B): ``--workspace`` is the CONTAINER; the live Vite project is
<ws>/current. Version snapshots (<ws>/v1, v2, …) live alongside it and are never
touched — current/ is self-contained, so there is nothing to exclude.

Flow (no deviations, no repair loops):
  1. Validate the workspace container lives under an allowed root.
  2. Verify <ws>/current/package.json exists and is parseable.
  3. Copy <ws>/current to a /tmp scratch (excluding node_modules, dist, .git).
  4. Run ``bun install --frozen-lockfile``.
  5. Run ``bun run build``.
  6. Verify ``dist/index.html`` exists in the scratch.
  7. Sync ``dist/`` back into <ws>/current/dist.

THIN: no repair, no publish, no screenshots, no arbitrary command passthrough.
The two commands are hard-coded constants and are NOT configurable.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from _gcs import gcs_upload_dir, parallel_copy_dir

# The live Vite project always lives at <ws>/current.
PROJECT_SUBDIR = "current"

# Fixed build flow. These are constants on purpose: no caller may change them.
INSTALL_CMD = ("bun", "install", "--frozen-lockfile")
BUILD_CMD = ("bun", "run", "build")
DIST_ARTIFACT = "dist/index.html"

# Directories never copied into the scratch build dir.
SCRATCH_EXCLUDE = {"node_modules", "dist", ".git"}
PRUNE_NODE_MODULES_ATTEMPTS = 5

# Allowed roots for the workspace. Overridable via env for non-default deployments,
# but always constrained to a known prefix so we never build arbitrary paths.
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
            "dist_files": [],
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


def verify_package_json(workspace: Path) -> None:
    pkg_path = workspace / "package.json"
    if not pkg_path.is_file():
        fail("validate", f"package.json not found in {workspace}")
    try:
        json.loads(pkg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        fail("validate", f"cannot parse package.json: {exc}")


def reject_symlinks(project: Path) -> None:
    """Fail the build if current/ contains a symlink.

    ``copy_to_scratch`` copies with ``copytree(symlinks=False)``: it follows
    symlinks and copies their TARGETS, so a symlink could pull bytes from outside
    the workspace into the built artifact, or make copytree fail on a loop. Reject
    up front so current/ is exactly the files it appears to be. dist/, node_modules
    and .git are never copied, so they aren't scanned.
    """
    # current/ itself being a symlink is invisible to the descendant walk below
    # (os.walk opens its target), so check the root link explicitly.
    if project.is_symlink():
        fail(
            "validate", "current/ must not be a symlink (the build copies its target)."
        )
    offenders: list[str] = []
    for dirpath, dirnames, filenames in os.walk(project):  # followlinks=False
        dirnames[:] = [d for d in dirnames if d not in SCRATCH_EXCLUDE]
        base = Path(dirpath)
        for name in (*dirnames, *filenames):
            if (base / name).is_symlink():
                offenders.append(str((base / name).relative_to(project)))
    if offenders:
        fail(
            "validate",
            "symlinks are not allowed under current/ (the build copies their "
            f"targets): {', '.join(sorted(offenders)[:20])}",
        )


def copy_to_scratch(workspace: Path) -> Path:
    scratch = Path(tempfile.mkdtemp(prefix="game-kit-build-"))
    ignore = shutil.ignore_patterns(*SCRATCH_EXCLUDE)
    dst = scratch / "src"
    shutil.copytree(workspace, dst, ignore=ignore, symlinks=False)
    return dst


def truncate(text: str) -> str:
    data = text.encode("utf-8", errors="replace")
    if len(data) <= LOG_TRUNCATE_BYTES:
        return text
    head = data[:LOG_TRUNCATE_BYTES].decode("utf-8", errors="replace")
    return head + f"\n... [truncated, {len(data) - LOG_TRUNCATE_BYTES} more bytes]"


def run_stage(cmd: tuple[str, ...], cwd: Path, timeout: int) -> tuple[int, str]:
    """Run a fixed command, capturing combined stdout/stderr."""
    try:
        proc = subprocess.run(
            list(cmd),
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        return 127, f"command not found: {cmd[0]} ({exc})"
    except subprocess.TimeoutExpired as exc:
        partial = exc.output or ""
        if isinstance(partial, bytes):
            partial = partial.decode("utf-8", errors="replace")
        return 124, f"timed out after {timeout}s\n{partial}"
    return proc.returncode, proc.stdout or ""


def prune_current_node_modules(project: Path) -> None:
    """Remove dependency installs from current/ without touching build output."""
    node_modules = project / "node_modules"
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
    if node_modules.exists():
        raise RuntimeError(
            f"could not clear {node_modules} after build (persistent removal race)"
        )


def sync_dist_back(scratch: Path, workspace: Path) -> list[str]:
    src_dist = scratch / "dist"
    dst_dist = workspace / "dist"
    # Prefer the GCS API on gcsfuse: a 3D dist can contain hundreds of chunks,
    # and FUSE writes hit streaming-write block limits under parallel copy. The
    # checkpoint gate also uses the GCS API for dist/index.html, so API-written
    # objects are immediately visible to the rest of the flow.
    uploaded = gcs_upload_dir(src_dist, dst_dist)
    if uploaded is not None:
        return uploaded
    # Drop any previous dist before copying the fresh one. Do NOT gate on
    # exists(): on a gcsfuse mount a stale metadata-cache / implicit-dir view can
    # report the directory present while rmtree's fd-walk then hits a missing path
    # and raises FileNotFoundError. Tolerate ONLY that missing-path race — and
    # actually FINISH the removal: the race can fire mid-walk after deleting some
    # children, leaving siblings; a plain pass would then copy onto a partial old
    # dist and let stale files survive in dist_files. Retry until the tree is gone.
    # A directory symlink (OSError) or any other error still propagates to the
    # top-level handler (ignore_errors would suppress the symlink refusal and let
    # the copy below write through the link, outside the workspace).
    for _ in range(5):
        try:
            shutil.rmtree(dst_dist)
            break  # fully removed
        except FileNotFoundError:
            if not dst_dist.exists():
                break  # whole tree gone (top absent, or the last child raced away)
            # a child vanished mid fd-walk; loop to clear the surviving siblings
    else:
        # Retries exhausted and the directory is still present. Do NOT copy onto a
        # partial dist (stale files would survive in dist_files) — fail loudly so
        # the top-level handler reports it instead.
        raise RuntimeError(
            f"could not clear {dst_dist} before copying the fresh build "
            "(persistent gcsfuse removal race)"
        )
    parallel_copy_dir(src_dist, dst_dist)
    return sorted(
        str(p.relative_to(dst_dist)) for p in dst_dist.rglob("*") if p.is_file()
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a game-kit workspace (fixed flow)."
    )
    parser.add_argument(
        "--workspace",
        required=True,
        help="Workspace container (the agent's cwd). The project built is <ws>/current.",
    )
    parser.add_argument(
        "--mode",
        help="Ignored compatibility flag. The build contract is workspace shape + dist/index.html.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Per-stage timeout in seconds (default: 600).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit JSON (default behavior; flag kept for explicit invocation).",
    )
    args = parser.parse_args()

    # Allowed-roots validation runs on the container path.
    workspace = Path(args.workspace)
    validate_workspace_root(workspace)
    workspace = workspace.resolve()

    # The project itself is <ws>/current; everything below operates on it.
    project = workspace / PROJECT_SUBDIR
    if not project.is_dir():
        fail("validate", f"project dir not found: {project} (run seed_template first)")
    verify_package_json(project)
    reject_symlinks(project)

    scratch: Path | None = None
    logs: dict[str, str] = {}
    # Per-stage wall-clock (ms). The build gate persists this into the build
    # events so we can see where the build floor actually goes (copy / install /
    # compile / dist sync) without re-instrumenting later. compile_ms is named
    # apart from the gate's top-level build_ms, which is the whole subprocess.
    timings: dict[str, int] = {}
    try:
        t0 = time.perf_counter()
        scratch = copy_to_scratch(project)
        timings["scratch_copy_ms"] = int((time.perf_counter() - t0) * 1000)

        t0 = time.perf_counter()
        install_code, install_log = run_stage(INSTALL_CMD, scratch, args.timeout)
        timings["install_ms"] = int((time.perf_counter() - t0) * 1000)
        logs["install"] = truncate(install_log)
        if install_code != 0:
            json.dump(
                {
                    "status": "error",
                    "stage": "install",
                    "exit_code": install_code,
                    "logs": logs,
                    "dist_files": [],
                    "timings": timings,
                },
                sys.stdout,
                indent=2,
            )
            sys.stdout.write("\n")
            sys.exit(install_code if install_code in (124, 127) else 1)

        t0 = time.perf_counter()
        build_code, build_log = run_stage(BUILD_CMD, scratch, args.timeout)
        timings["compile_ms"] = int((time.perf_counter() - t0) * 1000)
        logs["build"] = truncate(build_log)
        if build_code != 0:
            json.dump(
                {
                    "status": "error",
                    "stage": "build",
                    "exit_code": build_code,
                    "logs": logs,
                    "dist_files": [],
                    "timings": timings,
                },
                sys.stdout,
                indent=2,
            )
            sys.stdout.write("\n")
            sys.exit(build_code if build_code in (124, 127) else 1)

        artifact = scratch / DIST_ARTIFACT
        if not artifact.is_file():
            json.dump(
                {
                    "status": "error",
                    "stage": "verify",
                    "exit_code": 1,
                    "error": f"{DIST_ARTIFACT} not produced by build",
                    "logs": logs,
                    "dist_files": [],
                    "timings": timings,
                },
                sys.stdout,
                indent=2,
            )
            sys.stdout.write("\n")
            sys.exit(1)

        t0 = time.perf_counter()
        dist_files = sync_dist_back(scratch, project)
        timings["dist_sync_ms"] = int((time.perf_counter() - t0) * 1000)
    finally:
        prune_error: BaseException | None = None
        t0 = time.perf_counter()
        try:
            prune_current_node_modules(project)
        except Exception as exc:  # noqa: BLE001 - do not mask earlier JSON exits
            prune_error = exc
        finally:
            timings["prune_ms"] = int((time.perf_counter() - t0) * 1000)
            if scratch is not None:
                shutil.rmtree(scratch.parent, ignore_errors=True)
        if prune_error is not None and "dist_files" in locals():
            raise prune_error

    json.dump(
        {
            "status": "ok",
            "stage": "done",
            "exit_code": 0,
            "workspace": str(workspace),
            "current": str(project),
            "logs": logs,
            "dist_files": dist_files,
            "timings": timings,
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")


def _emit_internal_error(exc: BaseException) -> None:
    """Last resort for an unexpected crash: surface it as the structured JSON
    error contract instead of letting a Python traceback escape to stdout.

    The Stop build gate feeds a failed build script's output back to the agent
    as a block reason. A raw traceback (the script exiting non-zero with no JSON)
    becomes garbage "instructions" the agent then tries to act on, so any
    unhandled exception must still leave through the JSON contract.
    """
    import traceback

    detail = "".join(traceback.format_exception_only(type(exc), exc)).strip()
    fail("internal", f"build_game.py crashed before producing a result: {detail}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001 - deliberate catch-all; see _emit_internal_error
        # SystemExit (the fail()/exit paths above) and KeyboardInterrupt are not
        # Exception, so they propagate untouched; only genuine crashes land here.
        _emit_internal_error(exc)

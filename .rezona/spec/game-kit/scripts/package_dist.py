#!/usr/bin/env python3
"""Package a built game-kit workspace into a zip archive.

Zips ``dist/`` when present (the deployable artifact); otherwise falls back to
archiving the whole workspace minus heavy/transient dirs. Archiving only: it
never builds, installs, publishes, or uploads.

THIN: archive only. JSON {archive_path, bytes}.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

from _gcs import list_files, object_exists, read_object

PROJECT_SUBDIR = "current"
VERSION_RE = re.compile(r"^v[0-9]+$")


def fail(message: str) -> "None":
    json.dump({"status": "error", "error": message}, sys.stdout, indent=2)
    sys.stdout.write("\n")
    sys.exit(1)


def collect_files(root: Path, *, exclude: set[str]) -> list[Path]:
    files: list[Path] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if any(part in exclude for part in rel.parts):
            continue
        files.append(path)
    return files


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Package a game-kit dist/ into a zip archive."
    )
    parser.add_argument(
        "--workspace", required=True, help="Workspace container directory."
    )
    parser.add_argument("--out", required=True, help="Output archive path (.zip).")
    parser.add_argument(
        "--version",
        default=None,
        help="Package a version snapshot's dist (e.g. v3); default packages the "
        "current build (<ws>/current/dist).",
    )
    args = parser.parse_args()

    workspace = Path(args.workspace)
    if not workspace.is_dir():
        fail(f"workspace is not a directory: {workspace}")

    # Resolve the project to archive: a v{n} snapshot or the live current/ build.
    if args.version is not None:
        if not VERSION_RE.fullmatch(args.version):
            fail(f"invalid --version {args.version!r}; expected 'v' + digits, e.g. v3")
        target = workspace / args.version
        if not target.is_dir() and object_exists(target / ".ready") is not True:
            fail(f"version not found: {target}")
        source_label = args.version
    else:
        target = workspace / PROJECT_SUBDIR
        if not target.is_dir():
            fail(f"no project at {target}; run seed_template first")
        source_label = PROJECT_SUBDIR

    # Archive the deployable artifact only (dist/), never the whole tree. On
    # gcsfuse, build_game may have uploaded dist/ through the GCS API, so list
    # via the API first instead of depending on FUSE directory cache freshness.
    dist = target / "dist"
    try:
        api_files = list_files(dist)
    except Exception:
        # If the GCS API path is unavailable, preserve the old filesystem archive
        # path for builds that synced dist/ through the filesystem fallback.
        api_files = None
    if api_files is not None:
        if not api_files:
            fail(f"no files to archive under {dist}")
    else:
        if not dist.is_dir():
            hint = (
                "run build_game first"
                if args.version is None
                else "snapshot has no dist"
            )
            fail(f"no dist/ under {target}; {hint}")
        api_files = None
        source_root = dist
        files = collect_files(source_root, exclude=set())
        if not files:
            fail(f"no files to archive under {source_root}")

    out = Path(args.out)
    if out.suffix.lower() != ".zip":
        out = out.with_suffix(".zip")
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            if api_files is not None:
                for rel in api_files:
                    data = read_object(dist / rel)
                    if data is None:
                        fail(f"dist file disappeared while archiving: {rel}")
                        raise AssertionError("unreachable after fail")
                    zf.writestr((Path("dist") / rel).as_posix(), data)
            else:
                for path in files:
                    arcname = Path("dist") / path.relative_to(source_root)
                    zf.write(path, arcname.as_posix())
    except OSError as exc:
        fail(f"failed to write archive {out}: {exc}")

    json.dump(
        {
            "status": "ok",
            "archive_path": str(out.resolve()),
            "bytes": out.stat().st_size,
            "source": source_label,
            "file_count": len(api_files) if api_files is not None else len(files),
        },
        sys.stdout,
        indent=2,
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

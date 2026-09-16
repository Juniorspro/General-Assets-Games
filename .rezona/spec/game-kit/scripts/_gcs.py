#!/usr/bin/env python3
"""Fast directory copy for game-kit workspaces, for use on a gcsfuse mount.

A 3D build emits ~360 small chunk files. ``shutil.copytree`` copies them one at a
time, and on a gcsfuse mount each file op pays ~170ms of latency, so a single
copy takes a minute-plus. These helpers hide that latency two ways:

* ``gcs_copy_dir`` — when source and destination are on the SAME gcsfuse bucket,
  copy objects server-side via the GCS API (``copy_blob``), so the bytes never
  travel through the FUSE layer or the pod (a 362-object snapshot drops from
  ~64s to ~2s, measured). Reads the source listing and writes the destination
  entirely through the API, so it never reads back objects it just wrote (which
  gcsfuse would still have cached).
* ``gcs_upload_dir`` — when a freshly-built local ``dist/`` is being synced
  onto a gcsfuse workspace, upload/delete objects via the GCS API instead of
  opening many FUSE write handles (avoids streaming-write block limits).
* ``parallel_copy_dir`` — a threaded filesystem fallback for non-gcsfuse paths
  or GCS API failures. It still hides per-file latency when used on gcsfuse, but
  the API path is preferred for build output.

Both detect the gcsfuse mount from ``/proc/mounts`` and signal a fallback when the
path is not on gcsfuse (local/dev), so callers run plain ``copytree`` there.
``google-cloud-storage`` is imported lazily, so non-gcsfuse runs need no
dependency.
"""

from __future__ import annotations

import mimetypes
import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

# gcsfuse latency is per-op, not bandwidth; this many concurrent ops hides it
# without overwhelming the mount (validated sweet spot in-pod).
_PARALLELISM = 32


class GcsUploadError(RuntimeError):
    """GCS upload failed; ``mutated`` says destination may have changed."""

    def __init__(self, message: str, *, mutated: bool) -> None:
        super().__init__(message)
        self.mutated = mutated


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def detect_gcsfuse_mount(path: Path) -> tuple[str, Path] | None:
    """Return ``(bucket, mountpoint)`` for the gcsfuse mount containing ``path``.

    Parses ``/proc/mounts`` for fuse mounts (gcsfuse's device field is the bucket
    name) and returns the longest mountpoint that is a prefix of ``path``. Returns
    ``None`` off gcsfuse (local/dev) or when /proc/mounts is unavailable, so
    callers fall back to a filesystem copy.
    """
    target = path.resolve()
    best: tuple[str, Path] | None = None
    try:
        with open("/proc/mounts", encoding="utf-8") as handle:
            for line in handle:
                fields = line.split()
                if len(fields) < 3:
                    continue
                device, mountpoint, fstype = fields[0], fields[1], fields[2]
                if "fuse" not in fstype:
                    continue
                mnt = Path(mountpoint)
                if (target == mnt or _is_within(target, mnt)) and (
                    best is None or len(mountpoint) > len(str(best[1]))
                ):
                    best = (device, mnt)
    except OSError:
        return None
    return best


def _object_prefix(path: Path, mountpoint: Path) -> str:
    return path.resolve().relative_to(mountpoint).as_posix()


def gcs_copy_dir(
    src_dir: Path,
    dst_dir: Path,
    *,
    exclude_dirs: frozenset[str] | set[str] = frozenset(),
) -> list[str] | None:
    """Server-side copy every object under ``src_dir`` to ``dst_dir``.

    Both must be on the same gcsfuse bucket. Returns the sorted list of copied
    paths (relative to ``dst_dir``) on success, or ``None`` when not on gcsfuse
    (caller should fall back). Raises on a GCS error so the caller can clean up
    and fall back. Reads the source via ``list_blobs`` (fresh — gcsfuse has
    already flushed prior writes to GCS) and writes only via the API.
    """
    src_mount = detect_gcsfuse_mount(src_dir)
    dst_mount = detect_gcsfuse_mount(dst_dir)
    if src_mount is None or dst_mount is None or src_mount[0] != dst_mount[0]:
        return None
    bucket_name, mountpoint = src_mount
    src_prefix = _object_prefix(src_dir, mountpoint).rstrip("/") + "/"
    dst_prefix = _object_prefix(dst_dir, mountpoint).rstrip("/")

    from google.cloud import storage  # lazy: only when actually on gcsfuse

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    items: list[tuple[object, str]] = []
    for blob in client.list_blobs(bucket_name, prefix=src_prefix):
        rel = blob.name[len(src_prefix) :]
        if not rel or rel.endswith("/"):
            continue  # the prefix's own dir placeholder, if any
        if any(part in exclude_dirs for part in rel.split("/")[:-1]):
            continue
        items.append((blob, rel))

    def _copy(item: tuple[object, str]) -> None:
        blob, rel = item
        bucket.copy_blob(blob, bucket, f"{dst_prefix}/{rel}")

    with ThreadPoolExecutor(_PARALLELISM) as pool:
        list(pool.map(_copy, items))
    return sorted(rel for _blob, rel in items)


def _content_type(path: Path) -> str:
    overrides = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".svg": "image/svg+xml",
        ".wasm": "application/wasm",
    }
    suffix = path.suffix.lower()
    if suffix in overrides:
        return overrides[suffix]
    guessed, _encoding = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"


def gcs_upload_dir(
    src_dir: Path, dst_dir: Path, *, replace: bool = True
) -> list[str] | None:
    """Upload local ``src_dir`` into a gcsfuse-backed ``dst_dir`` via GCS API.

    Returns sorted relative file paths on success, or ``None`` when ``dst_dir`` is
    not on gcsfuse so the caller should use a filesystem fallback. When
    ``replace`` is true, all existing objects under the destination prefix are
    deleted before upload, matching ``rm -rf dst && copytree(src, dst)``.
    """
    mount = detect_gcsfuse_mount(dst_dir)
    if mount is None:
        return None
    bucket_name, mountpoint = mount
    dst_prefix = _object_prefix(dst_dir, mountpoint).rstrip("/")

    mutated = False
    try:
        from google.cloud import storage  # lazy: only when actually on gcsfuse

        client = storage.Client()
        bucket = client.bucket(bucket_name)
        if replace:
            existing = list(client.list_blobs(bucket_name, prefix=f"{dst_prefix}/"))
            # From this point on, an error can leave the destination prefix
            # partially replaced. Callers must not treat that like a safe
            # off-gcsfuse fallback.
            mutated = bool(existing)

            def _delete(blob: Any) -> None:
                blob.delete()

            with ThreadPoolExecutor(_PARALLELISM) as pool:
                list(pool.map(_delete, existing))

        files: list[tuple[Path, str]] = []
        for path in sorted(src_dir.rglob("*")):
            if path.is_symlink() or not path.is_file():
                continue
            rel = path.relative_to(src_dir).as_posix()
            files.append((path, rel))

        def _upload(item: tuple[Path, str]) -> None:
            path, rel = item
            blob = bucket.blob(f"{dst_prefix}/{rel}")
            blob.upload_from_filename(str(path), content_type=_content_type(path))

        mutated = mutated or bool(files)
        with ThreadPoolExecutor(_PARALLELISM) as pool:
            list(pool.map(_upload, files))
        return [rel for _path, rel in files]
    except Exception as exc:
        raise GcsUploadError(str(exc), mutated=mutated) from exc


def object_exists(path: Path) -> bool | None:
    """Return GCS object existence for a gcsfuse path; ``None`` off gcsfuse."""
    mount = detect_gcsfuse_mount(path)
    if mount is None:
        return None
    bucket_name, mountpoint = mount

    from google.cloud import storage

    client = storage.Client()
    return (
        client.bucket(bucket_name).blob(_object_prefix(path, mountpoint)).exists(client)
    )


def list_files(
    path: Path,
    *,
    exclude_dirs: frozenset[str] | set[str] = frozenset(),
) -> list[str] | None:
    """List object names relative to a gcsfuse directory; ``None`` off gcsfuse."""
    mount = detect_gcsfuse_mount(path)
    if mount is None:
        return None
    bucket_name, mountpoint = mount
    prefix = _object_prefix(path, mountpoint).rstrip("/") + "/"

    from google.cloud import storage

    client = storage.Client()
    files: list[str] = []
    for blob in client.list_blobs(bucket_name, prefix=prefix):
        rel = blob.name[len(prefix) :]
        if not rel or rel.endswith("/"):
            continue
        if any(part in exclude_dirs for part in rel.split("/")[:-1]):
            continue
        files.append(rel)
    return sorted(files)


def read_object(path: Path) -> bytes | None:
    """Read a GCS object for a gcsfuse path; ``None`` off gcsfuse or missing."""
    mount = detect_gcsfuse_mount(path)
    if mount is None:
        return None
    bucket_name, mountpoint = mount

    from google.cloud import storage

    client = storage.Client()
    blob = client.bucket(bucket_name).blob(_object_prefix(path, mountpoint))
    if not blob.exists(client):
        return None
    return blob.download_as_bytes()


def write_object(path: Path, data: bytes) -> bool:
    """Write ``data`` to ``path`` via the GCS API when on gcsfuse; else False.

    Used for the checkpoint completion sentinel so it lands as a real object
    alongside the API-copied snapshot (no gcsfuse round-trip).
    """
    mount = detect_gcsfuse_mount(path)
    if mount is None:
        return False
    bucket_name, mountpoint = mount
    from google.cloud import storage

    client = storage.Client()
    client.bucket(bucket_name).blob(
        _object_prefix(path, mountpoint)
    ).upload_from_string(data)
    return True


def list_child_dirs(path: Path) -> list[str] | None:
    """Immediate child "directory" names under ``path``, listed via the GCS API.

    Returns ``None`` when not on gcsfuse. Uses a delimiter so the bucket returns
    the child prefixes directly — authoritative and free of gcsfuse's
    directory-listing cache. The checkpoint allocates v{n} from this so version
    numbering stays coherent with snapshots that were written via the API (a
    gcsfuse ``iterdir`` could still miss a just-written v{n} and reuse it).
    """
    mount = detect_gcsfuse_mount(path)
    if mount is None:
        return None
    bucket_name, mountpoint = mount
    prefix = _object_prefix(path, mountpoint).rstrip("/") + "/"

    from google.cloud import storage

    client = storage.Client()
    iterator = client.list_blobs(bucket_name, prefix=prefix, delimiter="/")
    # Consume the pages so the prefixes (child "dirs") are populated.
    for _page in iterator.pages:
        pass
    return [child[len(prefix) :].rstrip("/") for child in iterator.prefixes]


def parallel_copy_dir(
    src_dir: Path,
    dst_dir: Path,
    *,
    ignore_names: frozenset[str] | set[str] = frozenset(),
) -> None:
    """Threaded recursive copy of ``src_dir`` into a (new) ``dst_dir``.

    A drop-in for ``shutil.copytree`` whose per-file copies run concurrently, so
    gcsfuse's per-file latency is hidden. Stays on the filesystem path (gcsfuse),
    so written files are immediately visible to later gcsfuse reads. Directories
    named in ``ignore_names`` are skipped at any depth; symlinks are not followed.
    """
    src_dir = Path(src_dir)
    dst_dir = Path(dst_dir)
    files: list[tuple[Path, Path]] = []
    for dirpath, dirnames, filenames in os.walk(src_dir):
        dirnames[:] = [d for d in dirnames if d not in ignore_names]
        rel_dir = Path(dirpath).relative_to(src_dir)
        (dst_dir / rel_dir).mkdir(parents=True, exist_ok=True)
        for name in filenames:
            src = Path(dirpath) / name
            if src.is_symlink() or not src.is_file():
                continue
            files.append((src, dst_dir / rel_dir / name))

    def _copy(pair: tuple[Path, Path]) -> None:
        # copyfile, not copy2: a build output / immutable snapshot needs only the
        # bytes, and skipping the metadata copy saves a per-file setattr — which
        # on gcsfuse is another ~170ms round-trip.
        shutil.copyfile(pair[0], pair[1])

    with ThreadPoolExecutor(_PARALLELISM) as pool:
        list(pool.map(_copy, files))

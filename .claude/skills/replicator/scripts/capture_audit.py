#!/usr/bin/env python3
"""Generate a manifest and lightweight review summary for replicator review artifacts."""

from __future__ import annotations

import argparse
import json
import re
import struct
import sys
from pathlib import Path

SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ANIMATED_IMAGE_EXTENSIONS = {".gif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
KNOWN_ARTIFACT_EXTENSIONS = tuple(
    sorted(SUPPORTED_IMAGE_EXTENSIONS | ANIMATED_IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | {".avif"})
)
UNPARSED_FORMAT_HINTS = {
    ".avif": "AVIF review artifacts are detected but image-size parsing is not implemented yet.",
    ".gif": "GIF review artifacts are detected but frame metadata parsing is not implemented yet.",
    ".mp4": "Video review artifacts are recorded for presence only; duration metadata is not parsed.",
    ".webm": "Video review artifacts are recorded for presence only; duration metadata is not parsed.",
    ".mov": "Video review artifacts are recorded for presence only; duration metadata is not parsed.",
}
REVIEW_ARTIFACTS_DIRNAME = "review-artifacts"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit file-based review artifacts stored under review-artifacts/ for a replicator effect.",
    )
    parser.add_argument(
        "effect_dir",
        help="Effect directory that contains review-artifacts/, for example effects/my-effect.",
    )
    parser.add_argument(
        "--ids",
        default="",
        help="Comma-separated artifact ids to expect. Leave empty to infer ids from files on disk.",
    )
    parser.add_argument(
        "--slots",
        dest="ids",
        help="Backward-compatible alias for --ids.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if any expected reference/current artifact pair is missing.",
    )
    return parser.parse_args()


def read_png_size(path: Path) -> tuple[int, int] | None:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", header[16:24])
    return width, height


def read_jpeg_size(path: Path) -> tuple[int, int] | None:
    with path.open("rb") as handle:
        data = handle.read()
    if not data.startswith(b"\xff\xd8"):
        return None

    offset = 2
    length = len(data)
    while offset + 9 < length:
        if data[offset] != 0xFF:
            offset += 1
            continue
        marker = data[offset + 1]
        offset += 2
        if marker in {0xD8, 0xD9}:
            continue
        if offset + 2 > length:
            return None
        segment_length = int.from_bytes(data[offset : offset + 2], "big")
        if segment_length < 2 or offset + segment_length > length:
            return None
        if marker in {
            0xC0,
            0xC1,
            0xC2,
            0xC3,
            0xC5,
            0xC6,
            0xC7,
            0xC9,
            0xCA,
            0xCB,
            0xCD,
            0xCE,
            0xCF,
        }:
            if offset + 7 > length:
                return None
            height = int.from_bytes(data[offset + 3 : offset + 5], "big")
            width = int.from_bytes(data[offset + 5 : offset + 7], "big")
            return width, height
        offset += segment_length
    return None


def read_webp_size(path: Path) -> tuple[int, int] | None:
    with path.open("rb") as handle:
        header = handle.read(30)
    if len(header) < 30 or header[:4] != b"RIFF" or header[8:12] != b"WEBP":
        return None
    chunk = header[12:16]
    if chunk == b"VP8X" and len(header) >= 30:
        width = 1 + int.from_bytes(header[24:27], "little")
        height = 1 + int.from_bytes(header[27:30], "little")
        return width, height
    return None


def read_image_size(path: Path) -> tuple[int, int] | None:
    suffix = path.suffix.lower()
    if suffix == ".png":
        return read_png_size(path)
    if suffix in {".jpg", ".jpeg"}:
        return read_jpeg_size(path)
    if suffix == ".webp":
        return read_webp_size(path)
    return None


def collect_artifact_ids(review_artifacts_dir: Path, default_ids: list[str]) -> list[str]:
    artifact_ids = set(default_ids)
    pattern = re.compile(r"^(reference|current)-([a-zA-Z0-9_-]+)\.[^.]+$")

    for path in review_artifacts_dir.iterdir():
        if not path.is_file() or path.suffix.lower() not in KNOWN_ARTIFACT_EXTENSIONS:
            continue
        match = pattern.match(path.name)
        if match:
            artifact_ids.add(match.group(2))

    return sorted(artifact_ids)


def resolve_artifact_file(review_artifacts_dir: Path, prefix: str, artifact_id: str) -> Path | None:
    for ext in KNOWN_ARTIFACT_EXTENSIONS:
        candidate = review_artifacts_dir / f"{prefix}-{artifact_id}{ext}"
        if candidate.exists():
            return candidate
    return None


def classify_artifact_kind(path: Path | None) -> str | None:
    if path is None:
        return None
    suffix = path.suffix.lower()
    if suffix in SUPPORTED_IMAGE_EXTENSIONS or suffix == ".avif":
        return "still-image"
    if suffix in ANIMATED_IMAGE_EXTENSIONS:
        return "animated-image"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    return "unknown"


def describe_unparsed_format(path: Path | None) -> str | None:
    if path is None:
        return None
    suffix = path.suffix.lower()
    if suffix in SUPPORTED_IMAGE_EXTENSIONS:
        return None
    return UNPARSED_FORMAT_HINTS.get(
        suffix,
        f"{suffix} review artifacts are detected but not parsed for automated metadata checks.",
    )


def build_manifest(effect_dir: Path, artifact_ids: list[str]) -> dict[str, object]:
    review_artifacts_dir = effect_dir / REVIEW_ARTIFACTS_DIRNAME
    entries: list[dict[str, object]] = []

    for artifact_id in artifact_ids:
        reference_path = resolve_artifact_file(review_artifacts_dir, "reference", artifact_id)
        current_path = resolve_artifact_file(review_artifacts_dir, "current", artifact_id)
        reference_size = read_image_size(reference_path) if reference_path else None
        current_size = read_image_size(current_path) if current_path else None
        reference_kind = classify_artifact_kind(reference_path)
        current_kind = classify_artifact_kind(current_path)

        entry = {
            "artifact_id": artifact_id,
            "reference_path": str(reference_path.relative_to(effect_dir)) if reference_path else None,
            "current_path": str(current_path.relative_to(effect_dir)) if current_path else None,
            "reference_exists": reference_path is not None,
            "current_exists": current_path is not None,
            "reference_kind": reference_kind,
            "current_kind": current_kind,
            "kind_match": bool(reference_kind and current_kind and reference_kind == current_kind),
            "reference_size": list(reference_size) if reference_size else None,
            "current_size": list(current_size) if current_size else None,
            "image_dimension_match": (
                bool(reference_size and current_size and reference_size == current_size)
                if reference_size or current_size
                else None
            ),
        }
        entries.append(entry)

    complete_pairs = sum(1 for entry in entries if entry["reference_exists"] and entry["current_exists"])
    missing_reference = [entry["artifact_id"] for entry in entries if not entry["reference_exists"]]
    missing_current = [entry["artifact_id"] for entry in entries if not entry["current_exists"]]
    kind_mismatches = [
        entry["artifact_id"]
        for entry in entries
        if entry["reference_exists"] and entry["current_exists"] and not entry["kind_match"]
    ]
    image_dimension_mismatches = [
        entry["artifact_id"]
        for entry in entries
        if entry["reference_exists"]
        and entry["current_exists"]
        and entry["image_dimension_match"] is False
    ]
    unparsed_formats = []

    for entry in entries:
        for prefix in ("reference", "current"):
            path_key = f"{prefix}_path"
            note = describe_unparsed_format(effect_dir / str(entry[path_key])) if entry[path_key] else None
            if note:
                unparsed_formats.append(
                    {
                        "artifact_id": entry["artifact_id"],
                        "role": prefix,
                        "path": entry[path_key],
                        "note": note,
                    }
                )

    return {
        "effect_slug": effect_dir.name,
        "artifacts_subdir": REVIEW_ARTIFACTS_DIRNAME,
        "expected_ids": artifact_ids,
        "complete_pairs": complete_pairs,
        "missing_reference": missing_reference,
        "missing_current": missing_current,
        "kind_mismatches": kind_mismatches,
        "image_dimension_mismatches": image_dimension_mismatches,
        "unparsed_formats": unparsed_formats,
        "entries": entries,
    }


def write_review(effect_dir: Path, manifest: dict[str, object]) -> None:
    review_artifacts_dir = effect_dir / REVIEW_ARTIFACTS_DIRNAME
    entries = manifest["entries"]
    lines = [
        "# Review Artifact Audit",
        "",
        f"- Complete pairs: `{manifest['complete_pairs']}`",
        f"- Missing reference artifact ids: `{', '.join(manifest['missing_reference']) or 'none'}`",
        f"- Missing current artifact ids: `{', '.join(manifest['missing_current']) or 'none'}`",
        f"- Kind mismatches: `{', '.join(manifest['kind_mismatches']) or 'none'}`",
        f"- Image dimension mismatches: `{', '.join(manifest['image_dimension_mismatches']) or 'none'}`",
        f"- Unparsed formats: `{len(manifest['unparsed_formats'])}`",
        "",
        "## Pair Coverage",
        "",
        "| Artifact ID | Reference | Current | Kind Match | Image Size Match | Notes |",
        "| --- | --- | --- | --- | --- | --- |",
    ]

    for entry in entries:
        ref_label = entry["reference_path"] or "missing"
        cur_label = entry["current_path"] or "missing"
        kind_match = "yes" if entry["kind_match"] else ("n/a" if not entry["reference_exists"] or not entry["current_exists"] else "no")
        dimension_match = (
            "yes"
            if entry["image_dimension_match"] is True
            else ("no" if entry["image_dimension_match"] is False else "n/a")
        )
        lines.append(
            f"| `{entry['artifact_id']}` | `{ref_label}` | `{cur_label}` | `{kind_match}` | `{dimension_match}` | `TODO` |"
        )

    lines.extend(
        [
            "",
            "## Unparsed Format Notes",
            "",
        ]
    )

    unparsed_formats = manifest["unparsed_formats"]
    if unparsed_formats:
        for item in unparsed_formats:
            lines.append(
                f"- `{item['path']}`: {item['note']}"
            )
    else:
        lines.append("- `none`")

    lines.extend(
        [
            "",
            "## Review Notes",
            "",
            "- Use still-image pairs only when they represent the important questions for the effect.",
            "- For motion-heavy or interaction-heavy scenes, pair this audit with clips, keyframes, or concise review notes.",
            "- Focus first on silhouette, motion, density, palette, finish, and interaction gaps that the chosen artifact type can actually prove.",
            "",
        ]
    )
    (review_artifacts_dir / "review.md").write_text("\n".join(lines))


def main() -> int:
    args = parse_args()
    effect_dir = Path(args.effect_dir).resolve()
    review_artifacts_dir = effect_dir / REVIEW_ARTIFACTS_DIRNAME

    if not effect_dir.exists():
        print(f"[ERROR] effect directory not found: {effect_dir}", file=sys.stderr)
        return 1
    if not review_artifacts_dir.exists():
        print(f"[ERROR] review-artifacts/ directory not found under: {effect_dir}", file=sys.stderr)
        return 1

    default_ids = [artifact_id.strip() for artifact_id in args.ids.split(",") if artifact_id.strip()]
    artifact_ids = collect_artifact_ids(review_artifacts_dir, default_ids)
    manifest = build_manifest(effect_dir, artifact_ids)

    (review_artifacts_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    write_review(effect_dir, manifest)

    print(f"[OK] wrote {review_artifacts_dir / 'manifest.json'}")
    print(f"[OK] wrote {review_artifacts_dir / 'review.md'}")

    unparsed_formats = manifest["unparsed_formats"]
    if unparsed_formats:
        print("[WARN] review artifact formats with limited metadata were detected:", file=sys.stderr)
        for item in unparsed_formats:
            print(f"[WARN] {item['path']}: {item['note']}", file=sys.stderr)

    if args.strict and (manifest["missing_reference"] or manifest["missing_current"]):
        print("[ERROR] review artifact pairs are incomplete", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

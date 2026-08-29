#!/usr/bin/env python3
"""Check a generated spritesheet against the grid contract, numerically.

Serves `gen-sprite-animation`, whose eye check cannot reliably catch the two
failures that ruin an animation while looking unremarkable in a preview:
**duplicate frames** (the same pose N times, so the flipbook looks frozen) and
**drawn cell separators** (lines on the seams, which the slicer bakes into every
cell as a box around the sprite).

Slices the sheet into cols x rows cells and reports per-cell ink coverage, the
seam lines drawn on the cell boundaries, and pairwise frame-difference metrics,
then returns a PASS/FAIL verdict. Pixel measurement lives in the sibling
``_spritesheet_metrics`` module; this file owns slicing, the verdict and the CLI.

THIN: measurement and reporting, plus one surgical repair. Read-only on the sheet
unless ``--fix-seams`` is passed, in which case a detected divider is erased and
the sheet is rewritten in place — a divider sits on a line whose position is
known exactly, so erasing it is cheaper and more reliable than a re-roll. Never
re-rolls, never touches anything else.

Thresholds are conservative starting points, not calibrated constants; the
report prints the full metric distribution so a borderline sheet can be judged
(and the thresholds retuned) from real numbers.

Known limitation: comparison is position-sensitive, so two cells holding the
SAME pose at different offsets inside their cells score as different.
Translation-invariant matching is deliberately out of scope.
"""

from __future__ import annotations

import argparse
import json
import sys
from itertools import combinations
from pathlib import Path

from PIL import Image

from _spritesheet_metrics import (
    DEFAULT_BORDER_INK_THRESHOLD,
    DEFAULT_HASH_THRESHOLD,
    DEFAULT_IOU_THRESHOLD,
    DEFAULT_MAE_THRESHOLD,
    DEFAULT_MIN_INK_RATIO,
    DEFAULT_SEAM_OCCUPANCY,
    DEFAULT_SEAM_RIDGE_DROP,
    IDENTICAL_MAE,
    border_ink_ratio,
    comparable,
    dhash_bits,
    erase_seam_lines,
    find_seam_lines,
    hamming,
    has_real_alpha,
    ink_mask,
    ink_ratio,
    load_sheet,
    mean_abs_diff,
    opaque_background_color,
    silhouette_bits,
    silhouette_iou,
    union_mean_abs_diff,
)


def slice_cells(sheet: Image.Image, cols: int, rows: int) -> list[Image.Image]:
    """Cut the sheet row-major into cols x rows equal cells."""
    cell_width = sheet.width // cols
    cell_height = sheet.height // rows
    cells: list[Image.Image] = []
    for index in range(cols * rows):
        left = (index % cols) * cell_width
        top = (index // cols) * cell_height
        cells.append(
            sheet.crop((left, top, left + cell_width, top + cell_height)).copy()
        )
    return cells


def write_contact_sheet(
    cells: list[Image.Image], cols: int, rows: int, destination: Path
) -> None:
    """Write the sliced cells back out as a labeled contact sheet to eyeball.

    Cells are drawn over a checkerboard so transparent regions stay visible,
    separated by real gutters (this image is for humans, never for the model).
    """
    from PIL import ImageDraw

    thumb = 192
    gutter = 8
    label = 14
    tile_height = thumb + label
    canvas = Image.new(
        "RGB",
        (cols * thumb + (cols + 1) * gutter, rows * tile_height + (rows + 1) * gutter),
        (32, 32, 36),
    )
    draw = ImageDraw.Draw(canvas)
    for index, cell in enumerate(cells):
        column = index % cols
        row = index // cols
        x = gutter + column * (thumb + gutter)
        y = gutter + row * (tile_height + gutter)
        checker = Image.new("RGB", (thumb, thumb), (200, 200, 200))
        for cx in range(0, thumb, 16):
            for cy in range(0, thumb, 16):
                if (cx // 16 + cy // 16) % 2 == 0:
                    checker.paste((240, 240, 240), (cx, cy, cx + 16, cy + 16))
        scaled = cell.resize((thumb, thumb), Image.BILINEAR)
        checker.paste(scaled, (0, 0), scaled)
        canvas.paste(checker, (x, y))
        draw.text((x + 2, y + thumb + 1), f"#{index}", fill=(230, 230, 230))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)


def check_sheet(
    path: Path,
    *,
    cols: int,
    rows: int,
    min_ink_ratio: float = DEFAULT_MIN_INK_RATIO,
    mae_threshold: float = DEFAULT_MAE_THRESHOLD,
    iou_threshold: float = DEFAULT_IOU_THRESHOLD,
    hash_threshold: int = DEFAULT_HASH_THRESHOLD,
    border_ink_threshold: float = DEFAULT_BORDER_INK_THRESHOLD,
    seam_occupancy: float = DEFAULT_SEAM_OCCUPANCY,
    seam_ridge_drop: float = DEFAULT_SEAM_RIDGE_DROP,
    fix_seams: bool = False,
    contact_sheet: Path | None = None,
) -> dict[str, object]:
    """Measure a sheet against the grid contract and return a JSON-ready report.

    With ``fix_seams`` a detected divider is erased and the sheet is rewritten in
    place before the rest of the measurements run, so the report describes the
    repaired sheet — the one the game will actually load.
    """
    sheet = load_sheet(path)
    expected = cols * rows
    has_alpha = has_real_alpha(sheet)
    background = (255, 255, 255) if has_alpha else opaque_background_color(sheet)

    failures: list[str] = []
    warnings: list[str] = []

    # Seam lines first: they contaminate every other per-cell measurement, and
    # repairing before measuring means one pass instead of check-fix-recheck.
    sheet_mask = ink_mask(sheet, has_alpha=has_alpha, background=background)
    seam_lines = find_seam_lines(
        sheet_mask,
        cols,
        rows,
        occupancy_threshold=seam_occupancy,
        ridge_drop=seam_ridge_drop,
    )
    seams_repaired = False
    if seam_lines and fix_seams:
        sheet = erase_seam_lines(
            sheet, seam_lines, has_alpha=has_alpha, background=background
        )
        sheet.save(path)
        seams_repaired = True
        sheet_mask = ink_mask(sheet, has_alpha=has_alpha, background=background)
        remaining = find_seam_lines(
            sheet_mask,
            cols,
            rows,
            occupancy_threshold=seam_occupancy,
            ridge_drop=seam_ridge_drop,
        )
        if remaining:
            failures.append(
                f"{len(remaining)} seam line(s) survived --fix-seams "
                f"({remaining}) — the divider is wider than the erase band, so "
                "the sheet needs a re-roll rather than a repair"
            )
        seam_lines = remaining
    elif seam_lines:
        rendered = ", ".join(
            f"{entry['axis']}={entry['position']}(occupancy {entry['occupancy']})"
            for entry in seam_lines
        )
        failures.append(
            f"{len(seam_lines)} separator line(s) drawn on the cell seams "
            f"({rendered}) — the slicer bakes each into its neighbouring cells "
            "as a box around the sprite. Re-run with --fix-seams to erase them, "
            "or re-roll with the 'no drawn lines, empty margin' wording"
        )

    if sheet.width % cols or sheet.height % rows:
        failures.append(
            f"sheet {sheet.width}x{sheet.height} does not divide evenly into "
            f"{cols}x{rows} — slicing drifts a fractional pixel per cell; "
            f"regenerate at a multiple of {cols}x{rows}"
        )
    if not has_alpha:
        warnings.append(
            "sheet has no transparency — matting did not produce alpha; it was "
            f"analyzed against background rgb{background}. Sprites need alpha: "
            "check that transparent:true was passed"
        )

    cells = slice_cells(sheet, cols, rows)
    masks = [
        ink_mask(cell, has_alpha=has_alpha, background=background) for cell in cells
    ]

    cell_report: list[dict[str, object]] = []
    blank: list[int] = []
    bordered: list[int] = []
    for index, mask in enumerate(masks):
        ink = ink_ratio(mask)
        border = border_ink_ratio(mask)
        if ink < min_ink_ratio:
            blank.append(index)
        if border >= border_ink_threshold:
            bordered.append(index)
        cell_report.append(
            {
                "index": index,
                "ink_ratio": round(ink, 4),
                "border_ink_ratio": round(border, 4),
                "blank": ink < min_ink_ratio,
            }
        )

    if blank:
        failures.append(
            f"{len(blank)} of {expected} cells are blank/background-only "
            f"(cells {blank}) — the flipbook will flash empty on those frames"
        )
    if len(bordered) > expected // 2:
        failures.append(
            f"{len(bordered)} of {expected} cells have an inked outer band "
            f"(cells {bordered}) — the model drew separator lines on the cell "
            "seams, which the slicer bakes into every cell as a box around the "
            "sprite; re-roll with the 'no drawn lines, empty margin' wording"
        )

    views = [comparable(cell) for cell in cells]
    hashes = [dhash_bits(cell) for cell in cells]
    silhouettes = [silhouette_bits(mask) for mask in masks]
    blank_set = set(blank)
    scored: list[tuple[float, dict[str, object]]] = []
    duplicates: list[tuple[int, int]] = []
    for left, right in combinations(range(expected), 2):
        whole_mae = mean_abs_diff(views[left], views[right])
        ink_mae = union_mean_abs_diff(
            views[left], views[right], silhouettes[left], silhouettes[right]
        )
        iou = silhouette_iou(silhouettes[left], silhouettes[right])
        distance = hamming(hashes[left], hashes[right])
        # Two blank cells trivially match; the blank-cell failure already names
        # them, so reporting them again as duplicates only adds noise.
        both_blank = left in blank_set and right in blank_set
        identical = whole_mae < IDENTICAL_MAE and not both_blank
        near = (
            not both_blank
            and iou >= iou_threshold
            and ink_mae < mae_threshold
            and distance <= hash_threshold
        )
        if identical or near:
            duplicates.append((left, right))
        scored.append(
            (
                iou,
                {
                    "cells": [left, right],
                    "silhouette_iou": round(iou, 4),
                    "ink_mean_abs_diff": round(ink_mae, 3),
                    "mean_abs_diff": round(whole_mae, 3),
                    "hash_distance": distance,
                    "verdict": "identical"
                    if identical
                    else ("near" if near else ("blank" if both_blank else "distinct")),
                },
            )
        )
    # Most-similar first, so the riskiest pairs head the report.
    scored.sort(key=lambda entry: -entry[0])
    pairs = [entry[1] for entry in scored]

    if duplicates:
        rendered = ", ".join(f"#{left}~#{right}" for left, right in duplicates)
        failures.append(
            f"{len(duplicates)} cell pair(s) hold the same or near-identical "
            f"pose ({rendered}) — at ~10fps the player sees the animation "
            "freeze, which is worse than one honest static image; re-roll "
            "reinforcing that every frame must differ at a glance"
        )

    contact_sheet_path: str | None = None
    if contact_sheet is not None:
        write_contact_sheet(cells, cols, rows, contact_sheet)
        contact_sheet_path = str(contact_sheet.resolve())

    return {
        "status": "fail" if failures else "pass",
        "sheet": str(path.resolve()),
        "sheet_size": [sheet.width, sheet.height],
        "grid": {"cols": cols, "rows": rows, "expected_frames": expected},
        "cell_size": [sheet.width // cols, sheet.height // rows],
        "alpha_present": has_alpha,
        "background_rgb": list(background),
        "thresholds": {
            "min_ink_ratio": min_ink_ratio,
            "ink_mean_abs_diff": mae_threshold,
            "identical_mean_abs_diff": IDENTICAL_MAE,
            "silhouette_iou": iou_threshold,
            "hash_distance": hash_threshold,
            "border_ink_ratio": border_ink_threshold,
            "seam_occupancy": seam_occupancy,
            "seam_ridge_drop": seam_ridge_drop,
        },
        "seam_lines": seam_lines,
        "seams_repaired": seams_repaired,
        "cells": cell_report,
        "duplicate_pairs": [list(pair) for pair in duplicates],
        "pairs": pairs,
        "failures": failures,
        "warnings": warnings,
        "contact_sheet": contact_sheet_path,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Measure a generated spritesheet against the grid contract."
    )
    parser.add_argument("--sheet", required=True, help="path to the spritesheet PNG")
    parser.add_argument("--cols", type=int, default=3, help="grid columns (default 3)")
    parser.add_argument("--rows", type=int, default=3, help="grid rows (default 3)")
    parser.add_argument(
        "--contact-sheet",
        default=None,
        help="optional path to write a labeled contact sheet for the eye check",
    )
    parser.add_argument("--min-ink-ratio", type=float, default=DEFAULT_MIN_INK_RATIO)
    parser.add_argument("--mae-threshold", type=float, default=DEFAULT_MAE_THRESHOLD)
    parser.add_argument("--iou-threshold", type=float, default=DEFAULT_IOU_THRESHOLD)
    parser.add_argument("--hash-threshold", type=int, default=DEFAULT_HASH_THRESHOLD)
    parser.add_argument(
        "--border-ink-threshold", type=float, default=DEFAULT_BORDER_INK_THRESHOLD
    )
    parser.add_argument("--seam-occupancy", type=float, default=DEFAULT_SEAM_OCCUPANCY)
    parser.add_argument(
        "--seam-ridge-drop", type=float, default=DEFAULT_SEAM_RIDGE_DROP
    )
    parser.add_argument(
        "--fix-seams",
        action="store_true",
        help=(
            "erase any divider drawn on the cell seams and rewrite the sheet IN "
            "PLACE, then re-measure the repaired sheet"
        ),
    )
    args = parser.parse_args()

    if args.cols < 1 or args.rows < 1:
        raise SystemExit("--cols and --rows must both be >= 1")

    report = check_sheet(
        Path(args.sheet),
        cols=args.cols,
        rows=args.rows,
        min_ink_ratio=args.min_ink_ratio,
        mae_threshold=args.mae_threshold,
        iou_threshold=args.iou_threshold,
        hash_threshold=args.hash_threshold,
        border_ink_threshold=args.border_ink_threshold,
        seam_occupancy=args.seam_occupancy,
        seam_ridge_drop=args.seam_ridge_drop,
        fix_seams=args.fix_seams,
        contact_sheet=Path(args.contact_sheet) if args.contact_sheet else None,
    )
    json.dump(report, sys.stdout, indent=2)
    sys.stdout.write("\n")
    sys.exit(2 if report["status"] == "fail" else 0)


if __name__ == "__main__":
    main()

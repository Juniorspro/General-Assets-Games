"""Pixel measurements a spritesheet verdict is built from.

Split out of ``check_spritesheet.py`` to keep each file inside the repo's
500-line ceiling: this module owns masks, seam-line geometry and the pairwise
similarity metrics; the caller owns grid slicing, the verdict and the CLI.

Imported as a sibling (``from _spritesheet_metrics import ...``) the same way
``_gcs.py`` is — scripts run as ``python3 .../scripts/x.py``, so their directory
is ``sys.path[0]``.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops

ALPHA_BACKGROUND_MAX = 16

# Per-channel tolerance when deriving background from a corner color (no alpha).
OPAQUE_BACKGROUND_TOLERANCE = 24

# Cells are compared at this resolution — small enough to be cheap, large
# enough that a single moved limb still moves the metrics.
COMPARE_SIZE = 64

# dhash grid; yields (HASH_GRID * HASH_GRID) bits of gradient signature.
HASH_GRID = 16

# A cell with less ink than this is treated as blank / background-only.
DEFAULT_MIN_INK_RATIO = 0.005

# Mean absolute grayscale difference (0-255) below which two cells are called
# near-identical, when the silhouette and hash checks agree. Measured only over
# the two cells' combined ink, so a generous empty margin cannot dilute it —
# whole-cell MAE would report a big pose change as a small number purely
# because most of the cell is background.
DEFAULT_MAE_THRESHOLD = 6.0

# Below this whole-cell MAE two cells are the same pixels for all purposes.
IDENTICAL_MAE = 1.0

# Silhouette agreement above which two cells hold the same shape. This is the
# primary duplicate signal: it is normalized by the union of the two
# silhouettes, so it is independent of how much margin the model left.
DEFAULT_IOU_THRESHOLD = 0.98

# Hamming distance (out of HASH_GRID * HASH_GRID bits) below which two cells
# share a gradient signature.
DEFAULT_HASH_THRESHOLD = 8

# Width of the band sampled at each cell edge. Secondary signal only: it catches
# a frame drawn *inside* each cell, but not a divider drawn ON the boundary —
# that one straddles two cells and leaves ~1px in each band (measured 0.50
# against this 0.60 threshold on the sheets that shipped a visible box).
BORDER_BAND_PX = 2
DEFAULT_BORDER_INK_THRESHOLD = 0.6

# ── Seam lines (primary divider signal) ─────────────────────────────────────
# A divider is not "ink near an edge", it is a full-length straight line at a
# position we can compute. So look only there, and look for the geometry.

# How far either side of a computed seam a line may sit (models are a pixel or
# two off, and odd sheet sizes make the boundary land between pixels).
SEAM_WINDOW_PX = 4

# Fraction of a row/column that must be inked before it counts as a line. A 1px
# hairline scores 1.0 here, which is why this beats any edge-band average.
DEFAULT_SEAM_OCCUPANCY = 0.85

# Ridge test: sampled this far from the peak, on both sides, to tell a thin line
# apart from art that simply fills the cell edge to edge.
SEAM_RIDGE_OFFSET_PX = 7

# The peak must exceed its shoulders by at least this much to be called a line.
# Full-bleed art has equally high shoulders and is therefore left alone.
DEFAULT_SEAM_RIDGE_DROP = 0.35

# --fix-seams clears the peak plus this many pixels either side. Wide enough for
# the 3px dividers seen in practice, narrow enough to stay off the sprite body.
SEAM_ERASE_HALF_WIDTH_PX = 2


def load_sheet(path: Path) -> Image.Image:
    """Open the sheet as RGBA, raising a readable error for a bad path."""
    try:
        return Image.open(path).convert("RGBA")
    except FileNotFoundError as exc:
        raise SystemExit(f"sheet not found: {path}") from exc
    except OSError as exc:
        raise SystemExit(f"cannot read sheet {path}: {exc}") from exc


def has_real_alpha(sheet: Image.Image) -> bool:
    """True when the sheet carries transparency (matting produced real alpha)."""
    alpha = sheet.getchannel("A")
    return alpha.getextrema()[0] <= ALPHA_BACKGROUND_MAX


def opaque_background_color(sheet: Image.Image) -> tuple[int, int, int]:
    """Guess the background of an opaque sheet from its most common corner."""
    width, height = sheet.size
    corners = [
        sheet.getpixel((0, 0)),
        sheet.getpixel((width - 1, 0)),
        sheet.getpixel((0, height - 1)),
        sheet.getpixel((width - 1, height - 1)),
    ]
    counts: dict[tuple[int, int, int], int] = {}
    for pixel in corners:
        rgb = (int(pixel[0]), int(pixel[1]), int(pixel[2]))
        counts[rgb] = counts.get(rgb, 0) + 1
    return max(counts.items(), key=lambda item: item[1])[0]


def ink_mask(
    cell: Image.Image,
    *,
    has_alpha: bool,
    background: tuple[int, int, int],
) -> Image.Image:
    """Return an 'L' mask where 255 marks subject pixels and 0 background."""
    if has_alpha:
        return cell.getchannel("A").point(
            lambda value: 255 if value > ALPHA_BACKGROUND_MAX else 0
        )
    difference = ImageChops.difference(
        cell.convert("RGB"), Image.new("RGB", cell.size, background)
    )
    red, green, blue = difference.split()
    widest = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    return widest.point(lambda value: 255 if value > OPAQUE_BACKGROUND_TOLERANCE else 0)


def _bytes_of(image: Image.Image) -> bytes:
    """Raw single-channel pixel bytes.

    ``tobytes`` rather than ``getdata`` — the latter is deprecated in Pillow 12
    and this script runs against the image's pinned ``pillow>=12``.
    """
    return image.tobytes()


def ink_ratio(mask: Image.Image) -> float:
    """Fraction of the mask that is subject rather than background."""
    data = _bytes_of(mask)
    if not data:
        return 0.0
    return sum(1 for value in data if value) / len(data)


def _axis_occupancy(mask: Image.Image) -> tuple[list[float], list[float]]:
    """Inked fraction of every column and of every row of a whole-sheet mask."""
    width, height = mask.size
    data = _bytes_of(mask)
    columns = [0] * width
    rows = [0] * height
    for y in range(height):
        offset = y * width
        row_total = 0
        for x in range(width):
            if data[offset + x]:
                columns[x] += 1
                row_total += 1
        rows[y] = row_total
    return (
        [count / height for count in columns] if height else [],
        [count / width for count in rows] if width else [],
    )


def _seam_positions(length: int, divisions: int) -> list[int]:
    """Pixel positions of the interior boundaries of an evenly divided axis."""
    return [round(length * k / divisions) for k in range(1, divisions)]


def _find_axis_seam_lines(
    occupancy: list[float],
    seams: list[int],
    *,
    axis: str,
    occupancy_threshold: float,
    ridge_drop: float,
) -> list[dict[str, object]]:
    """Locate drawn lines sitting on the given seams of one axis.

    Two conditions, both required. The line must be *inked across the axis*
    (occupancy at or above the threshold — true even of a 1px hairline), and it
    must be a *ridge*: markedly higher than the sheet a few pixels away. The
    ridge test is what keeps full-bleed art, whose cell edges are legitimately
    solid, from being condemned as a divider.
    """
    found: list[dict[str, object]] = []
    limit = len(occupancy)
    for seam in seams:
        window = range(
            max(0, seam - SEAM_WINDOW_PX), min(limit, seam + SEAM_WINDOW_PX + 1)
        )
        candidates = [(occupancy[index], index) for index in window]
        if not candidates:
            continue
        peak, position = max(candidates)
        if peak < occupancy_threshold:
            continue
        shoulders = [
            occupancy[index]
            for index in (
                position - SEAM_RIDGE_OFFSET_PX,
                position + SEAM_RIDGE_OFFSET_PX,
            )
            if 0 <= index < limit
        ]
        # No shoulder to compare against (a seam at the very edge) — treat the
        # inked run as art rather than guess.
        if not shoulders:
            continue
        if peak - max(shoulders) < ridge_drop:
            continue
        found.append(
            {
                "axis": axis,
                "seam": seam,
                "position": position,
                "occupancy": round(peak, 4),
                "shoulder": round(max(shoulders), 4),
            }
        )
    return found


def find_seam_lines(
    mask: Image.Image,
    cols: int,
    rows: int,
    *,
    occupancy_threshold: float = DEFAULT_SEAM_OCCUPANCY,
    ridge_drop: float = DEFAULT_SEAM_RIDGE_DROP,
) -> list[dict[str, object]]:
    """Every drawn divider found on the interior cell boundaries of the sheet."""
    column_occupancy, row_occupancy = _axis_occupancy(mask)
    return _find_axis_seam_lines(
        column_occupancy,
        _seam_positions(mask.width, cols),
        axis="x",
        occupancy_threshold=occupancy_threshold,
        ridge_drop=ridge_drop,
    ) + _find_axis_seam_lines(
        row_occupancy,
        _seam_positions(mask.height, rows),
        axis="y",
        occupancy_threshold=occupancy_threshold,
        ridge_drop=ridge_drop,
    )


def erase_seam_lines(
    sheet: Image.Image,
    lines: list[dict[str, object]],
    *,
    has_alpha: bool,
    background: tuple[int, int, int],
    half_width: int = SEAM_ERASE_HALF_WIDTH_PX,
) -> Image.Image:
    """Clear the detected divider pixels, leaving everything else untouched.

    Only the few pixels around each confirmed line are cleared — the ridge test
    upstream has already established that this is a thin line and not sprite
    body. Transparent sheets get alpha 0; an opaque sheet is painted back to its
    background colour so the slicer sees the same thing either way.
    """
    from PIL import ImageDraw

    repaired = sheet.copy()
    fill = (0, 0, 0, 0) if has_alpha else (*background, 255)
    painter = ImageDraw.Draw(repaired)
    for line in lines:
        position = int(line["position"])  # type: ignore[call-overload]
        low, high = position - half_width, position + half_width
        if line["axis"] == "x":
            painter.rectangle((low, 0, high, repaired.height - 1), fill=fill)
        else:
            painter.rectangle((0, low, repaired.width - 1, high), fill=fill)
    return repaired


def border_ink_ratio(mask: Image.Image, band: int = BORDER_BAND_PX) -> float:
    """Fraction of the cell's outer band that is inked.

    Secondary signal: catches a frame drawn inside a cell. A divider drawn ON
    the boundary is owned by ``find_seam_lines`` instead — it straddles two
    cells and leaves too little in either band to move this number.
    """
    width, height = mask.size
    band = max(1, min(band, width // 2, height // 2))
    edges = [
        mask.crop((0, 0, width, band)),
        mask.crop((0, height - band, width, height)),
        mask.crop((0, band, band, height - band)),
        mask.crop((width - band, band, width, height - band)),
    ]
    inked = 0
    total = 0
    for edge in edges:
        data = _bytes_of(edge)
        inked += sum(1 for value in data if value)
        total += len(data)
    return inked / total if total else 0.0


def comparable(cell: Image.Image) -> Image.Image:
    """Grayscale, fixed-size view of a cell composited over white.

    Compositing makes transparent and opaque sheets comparable with one metric,
    and matches what the player sees over a light scene.
    """
    canvas = Image.new("RGBA", cell.size, (255, 255, 255, 255))
    canvas.alpha_composite(cell)
    return canvas.convert("L").resize((COMPARE_SIZE, COMPARE_SIZE), Image.BILINEAR)


def mean_abs_diff(left: Image.Image, right: Image.Image) -> float:
    """Mean absolute grayscale difference over the whole view (0-255)."""
    left_data = _bytes_of(left)
    right_data = _bytes_of(right)
    if not left_data:
        return 0.0
    total = sum(abs(a - b) for a, b in zip(left_data, right_data, strict=True))
    return total / len(left_data)


def silhouette_bits(mask: Image.Image) -> list[int]:
    """Binarized silhouette of a cell at COMPARE_SIZE, as a bit list."""
    scaled = mask.resize((COMPARE_SIZE, COMPARE_SIZE), Image.NEAREST)
    return [1 if value else 0 for value in _bytes_of(scaled)]


def union_mean_abs_diff(
    left: Image.Image,
    right: Image.Image,
    left_bits: list[int],
    right_bits: list[int],
) -> float:
    """Mean absolute grayscale difference over the two cells' combined ink.

    Restricting to the union keeps the number meaningful whatever margin the
    model left: a whole-cell average is dominated by the identical background
    both cells share, so a real pose change reads as a deceptively small value.
    """
    left_data = _bytes_of(left)
    right_data = _bytes_of(right)
    total = 0
    counted = 0
    for index, (a, b) in enumerate(zip(left_data, right_data, strict=True)):
        if left_bits[index] or right_bits[index]:
            total += abs(a - b)
            counted += 1
    if counted == 0:
        # Both cells are empty; the blank-cell check owns that failure.
        return 0.0
    return total / counted


def silhouette_iou(left_bits: list[int], right_bits: list[int]) -> float:
    """Intersection-over-union of two binarized silhouettes."""
    intersection = sum(a & b for a, b in zip(left_bits, right_bits, strict=True))
    union = sum(a | b for a, b in zip(left_bits, right_bits, strict=True))
    if union == 0:
        # Two empty silhouettes are identical by definition.
        return 1.0
    return intersection / union


def dhash_bits(cell: Image.Image) -> list[int]:
    """Horizontal-gradient signature of a cell, as a bit list."""
    view = comparable(cell).resize((HASH_GRID + 1, HASH_GRID), Image.BILINEAR)
    pixels = _bytes_of(view)
    bits: list[int] = []
    for row in range(HASH_GRID):
        offset = row * (HASH_GRID + 1)
        for column in range(HASH_GRID):
            left = pixels[offset + column]
            right = pixels[offset + column + 1]
            bits.append(1 if left > right else 0)
    return bits


def hamming(left: list[int], right: list[int]) -> int:
    """Number of differing bits between two equal-length signatures."""
    return sum(a != b for a, b in zip(left, right, strict=True))

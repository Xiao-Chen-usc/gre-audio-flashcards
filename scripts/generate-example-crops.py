#!/usr/bin/env python3
"""Render the source PDF and crop each vocabulary row into a web asset.

Usage:
  python3 scripts/generate-example-crops.py /path/to/source.pdf

The PDF is intentionally not committed. The generated crops are deterministic
assets named from the stable card IDs, for example p02r01.webp.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
WORD_DATA = ROOT / "app" / "wordData.ts"
OUTPUT = ROOT / "public" / "example-crops"


def table_boundaries(source: Image.Image) -> list[int]:
    """Find the ten row boundaries from the table's dashed separators."""
    image = source.convert("RGB")
    width, height = image.size
    scan_left = round(width * 0.22)
    scan_right = round(width * 0.27)
    candidates: list[tuple[int, int]] = []

    for y in range(round(height * 0.12), round(height * 0.999)):
        score = 0
        for x in range(scan_left, scan_right):
            pixel = image.getpixel((x, y))
            average = sum(pixel) / 3
            if max(pixel) - min(pixel) < 10 and average < 245:
                score += 1
        if score > (scan_right - scan_left) * 0.3:
            candidates.append((y, score))

    groups: list[list[tuple[int, int]]] = []
    for candidate in candidates:
        if not groups or candidate[0] > groups[-1][-1][0] + 1:
            groups.append([candidate])
        else:
            groups[-1].append(candidate)
    peaks = [max(group, key=lambda item: item[1])[0] for group in groups]

    top = round(height * 0.1015)
    internal = [value for value in peaks if value > top + height * 0.06][:9]
    if len(internal) != 9:
        raise RuntimeError(
            f"Expected 9 internal row separators, found {len(internal)}"
        )

    typical = sorted(
        [internal[index] - internal[index - 1] for index in range(1, 9)]
    )[4]
    later = [value for value in peaks if value > internal[-1]]
    bottom = (
        later[0]
        if later and typical * 0.7 < later[0] - internal[-1] < typical * 1.3
        else min(height - 3, internal[-1] + typical)
    )
    return [top, *internal, bottom]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the source PDF path as the only argument.")

    pdf = Path(sys.argv[1]).expanduser().resolve()
    if not pdf.is_file():
        raise SystemExit(f"PDF not found: {pdf}")
    if shutil.which("pdftoppm") is None:
        raise SystemExit("pdftoppm is required (install poppler-utils).")

    ids = {
        (int(page), int(row))
        for page, row in re.findall(
            r'"id":"p(\d{2})r(\d{2})[ab]"', WORD_DATA.read_text()
        )
    }
    if not ids:
        raise SystemExit("No stable word IDs found in app/wordData.ts.")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gre-example-pages-") as temp:
        prefix = Path(temp) / "page"
        subprocess.run(
            [
                "pdftoppm",
                "-f",
                "2",
                "-l",
                "51",
                "-r",
                "144",
                "-jpeg",
                "-jpegopt",
                "quality=90",
                str(pdf),
                str(prefix),
            ],
            check=True,
        )

        for page, row in sorted(ids):
            rendered = prefix.parent / f"page-{page:02d}.jpg"
            if not rendered.exists():
                raise SystemExit(f"Rendered page missing: {rendered}")

            with Image.open(rendered) as source:
                width, height = source.size
                # Crop only the example/translation column. Separator
                # detection handles pages whose final row reaches the footer.
                left = round(width * 0.355)
                right = round(width * 0.965)
                boundaries = table_boundaries(source)
                top = boundaries[row - 1] + 4
                bottom = boundaries[row] - 4
                crop = source.crop((left, top, right, bottom))
                crop.save(
                    OUTPUT / f"p{page:02d}r{row:02d}.webp",
                    "WEBP",
                    quality=84,
                    method=6,
                )

    print(f"Generated {len(ids)} example crops in {OUTPUT}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""OCR the generated example crops into native web text.

Usage:
  TESSDATA_PREFIX=/path/to/tessdata \
    python3 scripts/extract-example-text.py

Run generate-example-crops.py first. OCR output is intentionally treated as an
editable first pass: the stable pair ID makes later human corrections simple.
"""

from __future__ import annotations

import json
import csv
import io
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CROPS = ROOT / "tmp" / "example-crops"
OUTPUT = ROOT / "app" / "exampleData.ts"
PROGRESS = ROOT / ".example-ocr-progress.json"


def normalize(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([,.;:!?，。；：！？])", r"\1", text)
    return text


def run_tesseract(path: Path, language: str) -> str:
    return subprocess.run(
        [
            "tesseract",
            str(path),
            "stdout",
            "-l",
            language,
            "--psm",
            "6",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout


def english_from_tsv(path: Path) -> str:
    result = subprocess.run(
        [
            "tesseract",
            str(path),
            "stdout",
            "-l",
            "eng+chi_sim",
            "--psm",
            "6",
            "tsv",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    groups: dict[tuple[str, str, str], list[dict[str, str]]] = {}
    for row in csv.DictReader(io.StringIO(result), delimiter="\t"):
        if row["level"] != "5" or not row["text"].strip():
            continue
        key = (row["block_num"], row["par_num"], row["line_num"])
        groups.setdefault(key, []).append(row)

    lines: list[tuple[int, float, str]] = []
    for words in groups.values():
        text = normalize(" ".join(word["text"] for word in words))
        confidence = sum(float(word["conf"]) for word in words) / len(words)
        top = min(int(word["top"]) for word in words)
        lines.append((top, confidence, text))
    lines.sort()

    first_han_top = next(
        (top for top, _, text in lines if len(re.findall(r"[\u3400-\u9fff]", text)) >= 2),
        10**9,
    )
    selected = [
        text
        for top, confidence, text in lines
        if top < first_han_top
        and confidence >= 55
        and len(re.findall(r"[A-Za-z]", text)) >= 4
    ]
    return normalize(" ".join(selected))


def ocr(path: Path) -> tuple[str, str]:
    with Image.open(path) as source:
        image = source.convert("L").resize(
            (source.width * 2, source.height * 2), Image.Resampling.LANCZOS
        )
        image = ImageEnhance.Contrast(image).enhance(1.4)
        image = image.filter(ImageFilter.SHARPEN)
        english_image = image.crop((0, 0, image.width, round(image.height * 0.68)))
        chinese_image = image.crop(
            (0, round(image.height * 0.49), image.width, image.height)
        )
        english_path = path.with_suffix(".english-ocr.png")
        chinese_path = path.with_suffix(".chinese-ocr.png")
        english_image.save(english_path)
        chinese_image.save(chinese_path)

    try:
        english = english_from_tsv(path)
        chinese_result = run_tesseract(chinese_path, "chi_sim+eng")
    finally:
        english_path.unlink(missing_ok=True)
        chinese_path.unlink(missing_ok=True)

    chinese_lines = [
        normalize(line)
        for line in chinese_result.splitlines()
        if len(re.findall(r"[\u3400-\u9fff]", line)) >= 2
    ]
    chinese = normalize(" ".join(chinese_lines))
    # Chinese OCR often inserts a space between every glyph. Remove only
    # Han-to-Han spaces, preserving useful separation around Latin words.
    while re.search(r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", chinese):
        chinese = re.sub(
            r"(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])", "", chinese
        )
    return english, chinese


def main() -> None:
    paths = sorted(CROPS.glob("p??r??.webp"))
    if len(paths) != 495:
        raise SystemExit(f"Expected 495 example crops, found {len(paths)}")

    data: dict[str, dict[str, str]] = (
        json.loads(PROGRESS.read_text()) if PROGRESS.exists() else {}
    )
    for index, path in enumerate(paths, start=1):
        if path.stem in data:
            continue
        english, chinese = ocr(path)
        data[path.stem] = {"english": english, "chinese": chinese}
        if len(data) % 10 == 0:
            PROGRESS.write_text(json.dumps(data, ensure_ascii=False))
        if len(data) % 25 == 0:
            print(f"OCR {len(data)}/{len(paths)}", flush=True)

    PROGRESS.write_text(json.dumps(data, ensure_ascii=False))
    serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "export type ExampleText = { english: string; chinese: string };\n\n"
        f"export const EXAMPLES: Record<string, ExampleText> = {serialized};\n"
    )
    PROGRESS.unlink(missing_ok=True)
    print(f"Wrote {len(data)} examples to {OUTPUT}", flush=True)


if __name__ == "__main__":
    main()

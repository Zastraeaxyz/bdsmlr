#!/usr/bin/env python3
"""Renders the app, PWA, and favicon images from src/assets/app-icon.png.

Chrome's install criteria require real 192px and 512px raster icons, and
Android crops maskable icons into a circle or squircle. The artwork is a
photograph with a soft transparent edge, so every icon composites it over the
app background rather than leaving it on transparency where the silver metal
loses contrast.

- "any" icons use the app background with the art at 74% width.
- maskable icons keep the art inside the 80% safe zone (58% width).
- the Apple touch icon and favicon use the same background treatment.

Usage: ./scripts/generate-icons.py
Requires Pillow (python3 -m pip install pillow).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src" / "assets" / "app-icon.png"
OUT = ROOT / "public"

BACKGROUND = (13, 17, 23, 255)  # #0d1117, matches theme_color and background_color

# name, canvas size, art width as a fraction of the canvas, background
ICONS = [
    ("icons/icon-192.png", 192, 0.74, BACKGROUND),
    ("icons/icon-512.png", 512, 0.74, BACKGROUND),
    ("icons/icon-maskable-192.png", 192, 0.58, BACKGROUND),
    ("icons/icon-maskable-512.png", 512, 0.58, BACKGROUND),
    ("icons/apple-touch-icon.png", 180, 0.72, BACKGROUND),
    ("favicon.png", 64, 0.9, BACKGROUND),
]


def trim(image: Image.Image) -> Image.Image:
    """Crop away the transparent margin so the art is centered by its content."""
    alpha = image.getchannel("A").point(lambda value: 255 if value > 8 else 0)
    box = alpha.getbbox()
    return image.crop(box) if box else image


def render(art: Image.Image, size: int, fraction: float, background) -> Image.Image:
    width = max(1, round(size * fraction))
    height = max(1, round(width * art.height / art.width))
    scaled = art.resize((width, height), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), background)
    offset = ((size - width) // 2, (size - height) // 2)
    canvas.alpha_composite(scaled, offset)
    return canvas.convert("RGB") if background[3] == 255 else canvas


def main() -> None:
    art = trim(Image.open(SOURCE).convert("RGBA"))

    for name, size, fraction, background in ICONS:
        path = OUT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        icon = render(art, size, fraction, background)
        icon.save(path, optimize=True)
        print(f"Wrote {path.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()

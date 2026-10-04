"""
add_profile.py - make zoomable tiles for one profile and add it to the site.

    1. create a folder  profiles/<ID>/  and put the photo in it as  original.jpg
    2. run              python tools/add_profile.py <ID>

Creates (or refreshes) profiles/<ID>/tiles/ (WebP Deep Zoom tiles + thumb.jpg),
creates profiles/<ID>/profile.json if it doesn't exist yet, and adds <ID>
to data/profiles.json.

Needs Pillow:  pip install pillow
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
TILE, OVERLAP = 254, 1

NEW_PROFILE = {
    "name": "",
    "summary": "",
    "info": {"WRB": "", "USDA": "", "Location": "", "Parent material": ""},
    "credit": "",
    "px_per_cm": 100,
    "zero_y_px": 0,
    "horizons": [
        {"name": "A", "top_cm": 0, "bottom_cm": 20, "description": ""}
    ],
    "features": [
        {"title": "", "x": 0, "y": 0, "description": ""}
    ],
}


def make_tiles(img, tiles_dir):
    w, h = img.size
    top = math.ceil(math.log2(max(w, h)))
    for level in range(top, -1, -1):
        scale = 2 ** (top - level)
        lw, lh = math.ceil(w / scale), math.ceil(h / scale)
        lvl = img.resize((lw, lh), Image.LANCZOS) if (lw, lh) != img.size else img
        out = tiles_dir / "image_files" / str(level)
        out.mkdir(parents=True, exist_ok=True)
        for c in range(math.ceil(lw / TILE)):
            for r in range(math.ceil(lh / TILE)):
                box = (max(0, c * TILE - OVERLAP), max(0, r * TILE - OVERLAP),
                       min(lw, (c + 1) * TILE + OVERLAP), min(lh, (r + 1) * TILE + OVERLAP))
                lvl.crop(box).save(out / f"{c}_{r}.webp", quality=80)
    (tiles_dir / "image.dzi").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" Format="webp" '
        f'Overlap="{OVERLAP}" TileSize="{TILE}"><Size Width="{w}" Height="{h}"/></Image>\n')
    thumb = img.copy()
    thumb.thumbnail((400, 800))
    thumb.save(tiles_dir / "thumb.jpg", quality=85)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pid = sys.argv[1]
    folder = ROOT / "profiles" / pid
    originals = sorted(folder.glob("original.*"))
    if not originals:
        sys.exit(f"Put the photo in {folder.relative_to(ROOT)} as original.jpg (or .png / .tif) first.")

    img = ImageOps.exif_transpose(Image.open(originals[0])).convert("RGB")
    print(f"Tiling {originals[0].name} ({img.width} x {img.height} px)...")
    tiles = folder / "tiles"
    for old in tiles.rglob("*.*"):    # remove old tiles (files only: OneDrive can lock folders)
        old.unlink()
    make_tiles(img, tiles)

    pj = folder / "profile.json"
    if not pj.exists():
        pj.write_text(json.dumps({**NEW_PROFILE, "name": pid}, indent=2) + "\n", encoding="utf-8")
        print(f"Created {pj.relative_to(ROOT)} - fill it in.")

    index = ROOT / "data" / "profiles.json"
    ids = json.loads(index.read_text()) if index.exists() else []
    if pid not in ids:
        index.write_text(json.dumps(ids + [pid], indent=2) + "\n")
        print(f"Added {pid} to data/profiles.json")
    print("Done.")


if __name__ == "__main__":
    main()

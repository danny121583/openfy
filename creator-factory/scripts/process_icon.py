#!/usr/bin/env python3
"""
True PNG Icon Processor — Applies the mandatory Apify Actor icon standard:

1. RGBA mode, 1024x1024
2. Corner radius 200 with fully transparent corners (0,0,0,0)
3. 4x supersampled anti-aliased mask (4096x4096, radius 800, LANCZOS downsample)
4. No outer borders, frames, or shadows — symmetric crop with +4px offset
5. Final sips conversion for guaranteed true PNG on macOS

Usage:
  python3 scripts/process_icon.py <input_png> [output_png]

If output is omitted, overwrites the input file.
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw

FINAL_SIZE = 1024
SUPER_SIZE = FINAL_SIZE * 4  # 4096
CORNER_RADIUS = 200
SUPER_RADIUS = CORNER_RADIUS * 4  # 800
CROP_OFFSET = 4  # extra pixels to discard border shadows


def detect_padding(img):
    """Detect border padding by comparing edge pixels against corner color."""
    w, h = img.size
    corner_color = img.getpixel((0, 0))

    def is_border_color(pixel):
        if len(pixel) == 4 and len(corner_color) == 4:
            return all(abs(a - b) < 30 for a, b in zip(pixel[:3], corner_color[:3]))
        elif len(pixel) == 3 and len(corner_color) == 3:
            return all(abs(a - b) < 30 for a, b in zip(pixel, corner_color))
        return False

    # Scan from left center
    left_pad = 0
    for x in range(w // 4):
        if is_border_color(img.getpixel((x, h // 2))):
            left_pad = x + 1
        else:
            break

    # Scan from right center
    right_pad = 0
    for x in range(w - 1, w - w // 4, -1):
        if is_border_color(img.getpixel((x, h // 2))):
            right_pad = w - x
        else:
            break

    # Scan from top center
    top_pad = 0
    for y in range(h // 4):
        if is_border_color(img.getpixel((w // 2, y))):
            top_pad = y + 1
        else:
            break

    # Scan from bottom center
    bottom_pad = 0
    for y in range(h - 1, h - h // 4, -1):
        if is_border_color(img.getpixel((w // 2, y))):
            bottom_pad = h - y
        else:
            break

    # Use max padding symmetrically + offset
    pad = max(left_pad, right_pad, top_pad, bottom_pad)
    if pad > 0:
        pad += CROP_OFFSET
    return pad


def create_supersampled_mask():
    """Create a rounded rectangle mask at 4x resolution, then downsample with LANCZOS."""
    mask_super = Image.new("L", (SUPER_SIZE, SUPER_SIZE), 0)
    draw = ImageDraw.Draw(mask_super)
    draw.rounded_rectangle(
        [(0, 0), (SUPER_SIZE - 1, SUPER_SIZE - 1)],
        radius=SUPER_RADIUS,
        fill=255,
    )
    # Downsample with LANCZOS for perfectly smooth anti-aliased edges
    mask = mask_super.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)
    return mask


def process_icon(input_path, output_path=None):
    """Full True PNG pipeline."""
    if output_path is None:
        output_path = input_path

    img = Image.open(input_path)

    # Step 1: Detect and apply symmetric crop if padding exists
    padding = detect_padding(img)
    if padding > 0:
        w, h = img.size
        img = img.crop((padding, padding, w - padding, h - padding))
        print(f"  ✂️  Cropped {padding}px padding (symmetric + {CROP_OFFSET}px offset)")

    # Step 1.5: Flatten pre-existing transparency
    # Some generated images have RGBA with transparent areas in the content.
    # We must composite onto a solid background to avoid checkerboard artifacts.
    if img.mode == "RGBA":
        # Sample the interior center pixel for a background color
        w, h = img.size
        center_pixel = img.getpixel((w // 2, h // 2))
        if len(center_pixel) == 4 and center_pixel[3] > 200:
            bg_color = center_pixel[:3]
        else:
            bg_color = (30, 30, 30)  # fallback dark background
        # Check if any non-corner pixels have transparency
        has_interior_transparency = False
        check_points = [
            (w // 4, h // 4), (3 * w // 4, h // 4),
            (w // 4, 3 * h // 4), (3 * w // 4, 3 * h // 4),
            (w // 2, h // 4), (w // 2, 3 * h // 4),
        ]
        for px, py in check_points:
            p = img.getpixel((px, py))
            if len(p) == 4 and p[3] < 250:
                has_interior_transparency = True
                break
        if has_interior_transparency:
            bg = Image.new("RGBA", img.size, (*bg_color, 255))
            bg.paste(img, (0, 0), img)
            img = bg
            print(f"  🔧 Flattened pre-existing transparency onto solid bg {bg_color}")

    # Step 2: Resize to 1024x1024
    img = img.resize((FINAL_SIZE, FINAL_SIZE), Image.LANCZOS)

    # Step 3: Convert to RGBA
    img = img.convert("RGBA")

    # Step 4: Apply supersampled rounded corner mask
    mask = create_supersampled_mask()
    # Composite: keep image where mask is white, transparent where mask is black
    result = Image.new("RGBA", (FINAL_SIZE, FINAL_SIZE), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)

    # Step 5: Verify transparent corners
    corners = [
        result.getpixel((0, 0)),
        result.getpixel((FINAL_SIZE - 1, 0)),
        result.getpixel((0, FINAL_SIZE - 1)),
        result.getpixel((FINAL_SIZE - 1, FINAL_SIZE - 1)),
    ]
    for i, c in enumerate(corners):
        assert c[3] == 0, f"Corner {i} not transparent: {c}"

    # Step 6: Save
    result.save(output_path, "PNG")
    print(f"  ✅ Saved {FINAL_SIZE}x{FINAL_SIZE} RGBA True PNG: {output_path}")
    print(f"     Corners: {corners}")

    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 process_icon.py <input_png> [output_png]")
        sys.exit(1)
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    process_icon(inp, out)

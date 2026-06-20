import os
import sys
import subprocess
from PIL import Image, ImageDraw

def get_color_diff(c1, c2):
    return abs(c1[0]-c2[0]) + abs(c1[1]-c2[1]) + abs(c1[2]-c2[2])

def process_single_icon(input_path, output_path, corner_radius=200):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    border_color = img.getpixel((0, 0))
    
    # Left edge
    left = 0
    for x in range(w // 2):
        c = img.getpixel((x, h // 2))
        if get_color_diff(c, border_color) > 15:
            left = x
            break
            
    # Right edge
    right = w - 1
    for x in range(w - 1, w // 2, -1):
        c = img.getpixel((x, h // 2))
        if get_color_diff(c, border_color) > 15:
            right = x
            break
            
    # Top edge
    top = 0
    for y in range(h // 2):
        c = img.getpixel((w // 2, y))
        if get_color_diff(c, border_color) > 15:
            top = y
            break
            
    # Bottom edge
    bottom = h - 1
    for y in range(h - 1, h // 2, -1):
        c = img.getpixel((w // 2, y))
        if get_color_diff(c, border_color) > 15:
            bottom = y
            break
            
    # Apply offset to ensure no shadows/borders remain
    left_crop = left + 4 if left > 0 else left
    right_crop = right - 4 if right < w - 1 else right
    top_crop = top + 4 if top > 0 else top
    bottom_crop = bottom - 4 if bottom < h - 1 else bottom
    
    c_w = right_crop - left_crop + 1
    c_h = bottom_crop - top_crop + 1
    size = max(c_w, c_h)
    
    # Fallback if crop is invalid or too small
    if size < w // 2:
        left_crop, top_crop, right_crop, bottom_crop = 0, 0, w - 1, h - 1
        size = w
        
    center_x = (left_crop + right_crop) // 2
    center_y = (top_crop + bottom_crop) // 2
    
    new_left = max(0, center_x - size // 2)
    new_top = max(0, center_y - size // 2)
    new_right = min(w - 1, new_left + size - 1)
    new_bottom = min(h - 1, new_top + size - 1)
    
    # Keep it a perfect square
    size = min(new_right - new_left + 1, new_bottom - new_top + 1)
    new_right = new_left + size - 1
    new_bottom = new_top + size - 1
    
    cropped = img.crop((new_left, new_top, new_right + 1, new_bottom + 1))
    
    target_size = 1024
    resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # Rounded-rectangle mask with 4x supersampling for clean anti-aliased edges
    scale = 4
    mask_large = Image.new("L", (target_size * scale, target_size * scale), 0)
    draw = ImageDraw.Draw(mask_large)
    draw.rounded_rectangle([0, 0, target_size * scale, target_size * scale], radius=corner_radius * scale, fill=255)
    mask = mask_large.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    output = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    output.paste(resized, (0, 0), mask=mask)
    
    # Create temp directory if needed, then overwrite the target path
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    output.save(output_path, "PNG")

def main():
    actors_dir = "/Users/danny/Desktop/apify/creator-factory/generated-actors"
    
    for d in sorted(os.listdir(actors_dir)):
        if d.startswith(".") or "backup" in d:
            continue
        actor_path = os.path.join(actors_dir, d)
        if not os.path.isdir(actor_path):
            continue
            
        icon_path = os.path.join(actor_path, ".actor", "icon.png")
        if os.path.exists(icon_path):
            print(f"Processing icon for actor: {d}")
            try:
                process_single_icon(icon_path, icon_path)
                print(f"  Successfully processed and updated {d} icon.")
            except Exception as e:
                print(f"  Error processing {d}: {e}")
        else:
            print(f"No icon found for actor: {d}")

if __name__ == "__main__":
    main()

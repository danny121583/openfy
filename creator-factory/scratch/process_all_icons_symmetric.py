import os
import sys
from PIL import Image, ImageDraw

def find_edge_derivative(line, size):
    start = int(0.03 * size)
    end = int(0.25 * size)
    max_d = -1
    max_idx = -1
    for i in range(start, end):
        p1 = line[i-1]
        p2 = line[i]
        d = abs(p2[0] - p1[0]) + abs(p2[1] - p1[1]) + abs(p2[2] - p1[2])
        if d > max_d:
            max_d = d
            max_idx = i
    return max_idx, max_d

def process_single_icon(input_path, output_path, corner_radius=200):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # We convert to RGB to analyze derivatives (ignoring alpha channel)
    img_rgb = img.convert("RGB")
    
    # Left edge
    left_line = [img_rgb.getpixel((x, h // 2)) for x in range(w // 2)]
    left_idx, left_d = find_edge_derivative(left_line, w)
    left_padding = left_idx if left_d > 40 else 0
    
    # Right edge
    right_line = [img_rgb.getpixel((w - 1 - x, h // 2)) for x in range(w // 2)]
    right_idx, right_d = find_edge_derivative(right_line, w)
    right_padding = right_idx if right_d > 40 else 0
    
    # Symmetric padding is the maximum detected padding from left/right
    p = max(left_padding, right_padding)
    
    if p > 0:
        # Apply 4px offset to cut off shadows/glowing border lines
        p = p + 4
        # Cap padding at 25% of image size to prevent over-cropping
        max_p = int(0.25 * min(w, h))
        if p > max_p:
            p = max_p
        
        new_left = p
        new_right = w - 1 - p
        new_top = p
        new_bottom = h - 1 - p
        print(f"  Detected border padding of {p-4}px. Cropping symmetric box: L={new_left}, T={new_top}, R={new_right}, B={new_bottom}")
    else:
        new_left, new_top, new_right, new_bottom = 0, 0, w - 1, h - 1
        print("  No border padding detected. No crop applied.")
        
    cropped = img.crop((new_left, new_top, new_right + 1, new_bottom + 1))
    
    target_size = 1024
    resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # Rounded-rectangle mask with 4x supersampling for perfectly clean anti-aliased edges
    scale = 4
    mask_large = Image.new("L", (target_size * scale, target_size * scale), 0)
    draw = ImageDraw.Draw(mask_large)
    draw.rounded_rectangle([0, 0, target_size * scale, target_size * scale], radius=corner_radius * scale, fill=255)
    mask = mask_large.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    output = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    output.paste(resized, (0, 0), mask=mask)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    output.save(output_path, "PNG")
    print(f"  Saved to: {output_path}")

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
            except Exception as e:
                print(f"  Error processing {d}: {e}")
        else:
            print(f"No icon found for actor: {d}")

if __name__ == "__main__":
    main()

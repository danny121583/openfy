import sys
import os
from PIL import Image, ImageDraw

def find_edge_derivative(line, size):
    # Search within 9% to 20% of the image size from the border
    start = int(0.09 * size)
    end = int(0.20 * size)
    max_d = -1
    max_idx = -1
    for i in range(start, end):
        p1 = line[i-1]
        p2 = line[i]
        d = abs(p2[0] - p1[0]) + abs(p2[1] - p1[1]) + abs(p2[2] - p1[2])
        if d > max_d:
            max_d = d
            max_idx = i
    return max_idx

def process_icon(input_path, output_path, corner_radius=200):
    print(f"Loading image: {input_path}")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # 1. Find boundaries using derivative peak along center lines
    # Left edge
    left_line = [img.getpixel((x, h // 2)) for x in range(w // 2)]
    left = find_edge_derivative(left_line, w)
    
    # Right edge
    right_line = [img.getpixel((w - 1 - x, h // 2)) for x in range(w // 2)]
    right = w - 1 - find_edge_derivative(right_line, w)
    
    # Top edge
    top_line = [img.getpixel((w // 2, y)) for y in range(h // 2)]
    top = find_edge_derivative(top_line, h)
    
    # Bottom edge
    bottom_line = [img.getpixel((w // 2, h - 1 - y)) for y in range(h // 2)]
    bottom = h - 1 - find_edge_derivative(bottom_line, h)
    
    print(f"Detected Crop Bounding Box: Left={left}, Top={top}, Right={right}, Bottom={bottom}")
    
    # 2. Square and center the crop
    c_w = right - left + 1
    c_h = bottom - top + 1
    size = max(c_w, c_h)
    
    center_x = (left + right) // 2
    center_y = (top + bottom) // 2
    
    new_left = max(0, center_x - size // 2)
    new_top = max(0, center_y - size // 2)
    new_right = min(w - 1, new_left + size - 1)
    new_bottom = min(h - 1, new_top + size - 1)
    
    # Adjust to keep it a perfect square
    size = min(new_right - new_left + 1, new_bottom - new_top + 1)
    new_right = new_left + size - 1
    new_bottom = new_top + size - 1
    
    print(f"Squared Crop Bounding Box: Left={new_left}, Top={new_top}, Right={new_right}, Bottom={new_bottom} (Size={size}x{size})")
    
    # 3. Crop
    cropped = img.crop((new_left, new_top, new_right + 1, new_bottom + 1))
    
    # 4. Resize to 1024x1024
    target_size = 1024
    resized = cropped.resize((target_size, target_size), Image.Resampling.LANCZOS)
    
    # 5. Create a rounded-square mask with true transparent corners
    mask = Image.new("L", (target_size, target_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, target_size, target_size], radius=corner_radius, fill=255)
    
    # Apply mask
    output = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    output.paste(resized, (0, 0), mask=mask)
    
    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    output.save(output_path, "PNG")
    print(f"Successfully processed and saved to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 process_icon.py <input_path> <output_path> [corner_radius]")
        sys.exit(1)
    
    input_p = sys.argv[1]
    output_p = sys.argv[2]
    radius = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    process_icon(input_p, output_p, radius)

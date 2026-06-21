import os
import re

actors_dir = '/Users/danny/Desktop/apify/creator-factory/generated-actors'

def clean_readme(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into lines
    lines = content.split('\n')
    new_lines = []
    skip = False
    
    for line in lines:
        stripped = line.strip()
        # Detect start of headings to skip
        if stripped.startswith('## Store Logo') or stripped.startswith('## Monetization'):
            skip = True
            continue
        # Detect other headings to resume
        elif stripped.startswith('## '):
            skip = False
            
        if not skip:
            new_lines.append(line)
            
    # Join and normalize multiple consecutive blank lines
    cleaned = '\n'.join(new_lines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(cleaned.strip() + '\n')
    print(f"Cleaned: {file_path}")

# Run through all directories
for root, dirs, files in os.walk(actors_dir):
    for file in files:
        if file == 'README.md':
            clean_readme(os.path.join(root, file))

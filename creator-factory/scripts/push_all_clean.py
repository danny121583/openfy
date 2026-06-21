import os
import json
import subprocess

registry_path = '/Users/danny/Desktop/apify/creator-factory/reports/actor-registry.json'
actors_dir = '/Users/danny/Desktop/apify/creator-factory/generated-actors'

with open(registry_path, 'r', encoding='utf-8') as f:
    registry = json.load(f)

active_slugs = [entry['slug'] for entry in registry if entry.get('status') == 'pushed' or entry.get('status') == 'published']

print(f"Found {len(active_slugs)} active actors to push.")

for slug in active_slugs:
    actor_path = os.path.join(actors_dir, slug)
    if not os.path.isdir(actor_path):
        print(f"Skipping missing directory: {actor_path}")
        continue
        
    print(f"\n--- Pushing {slug} ---")
    
    # Copy README.md to .actor/README.md
    readme_src = os.path.join(actor_path, 'README.md')
    readme_dst = os.path.join(actor_path, '.actor', 'README.md')
    if os.path.exists(readme_src):
        with open(readme_src, 'r', encoding='utf-8') as src:
            readme_content = src.read()
        os.makedirs(os.path.dirname(readme_dst), exist_ok=True)
        with open(readme_dst, 'w', encoding='utf-8') as dst:
            dst.write(readme_content)
            
    # Run apify push without waiting for finish to make it super fast
    try:
        res = subprocess.run(
            ['apify', 'push', '--force'],
            cwd=actor_path,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30
        )
        print(res.stdout)
        if res.returncode != 0:
            print(f"Error pushing {slug}: {res.stderr}")
    except subprocess.TimeoutExpired:
        print(f"Timeout expired pushing {slug}")
    except Exception as e:
        print(f"Failed to run push for {slug}: {str(e)}")

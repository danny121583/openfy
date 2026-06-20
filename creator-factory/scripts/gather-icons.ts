import { readdir, mkdir, copyFile, stat, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

async function filesAreIdentical(file1: string, file2: string): Promise<boolean> {
  try {
    const [stat1, stat2] = await Promise.all([stat(file1), stat(file2)]);
    if (stat1.size !== stat2.size) return false;
    const [buf1, buf2] = await Promise.all([readFile(file1), readFile(file2)]);
    return buf1.equals(buf2);
  } catch {
    return false;
  }
}

async function main() {
  const actorsDir = '/Users/danny/Desktop/apify/creator-factory/generated-actors';
  const targetDir = '/Users/danny/Desktop/apify/generated-icons';

  console.log(`Creating target directory: ${targetDir}`);
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(actorsDir, { withFileTypes: true });
  
  // Clean up any existing backup files in target directory first
  if (existsSync(targetDir)) {
    const existingFiles = await readdir(targetDir);
    for (const file of existingFiles) {
      if (file.includes('backup')) {
        const filePath = path.join(targetDir, file);
        console.log(`Removing deprecated backup icon: ${file}`);
        execSync(`rm -f "${filePath}"`);
      }
    }
  }

  let copiedCount = 0;
  let skippedCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const actorSlug = entry.name;
    
    // Skip backup directories
    if (actorSlug.includes('backup')) {
      console.log(`Skipping backup actor directory: ${actorSlug}`);
      continue;
    }

    const iconPath = path.join(actorsDir, actorSlug, '.actor', 'icon.png');

    if (existsSync(iconPath)) {
      const destPath = path.join(targetDir, `${actorSlug}.png`);
      
      // Check if target file already exists and is identical to source
      if (existsSync(destPath)) {
        const identical = await filesAreIdentical(iconPath, destPath);
        if (identical) {
          console.log(`Icon for ${actorSlug} is already identical in target directory. Skipping.`);
          skippedCount++;
          continue;
        }
      }

      console.log(`Copying ${actorSlug} icon to ${destPath}`);
      await copyFile(iconPath, destPath);

      // Verify and convert to PNG if it's JPEG
      try {
        const fileType = execSync(`file "${destPath}"`, { encoding: 'utf8' });
        if (fileType.includes('JPEG') || fileType.includes('JFIF')) {
          console.log(`Converting ${actorSlug}.png from JPEG to real PNG using sips...`);
          execSync(`sips -s format png "${destPath}" --out "${destPath}"`);
        }
      } catch (err) {
        console.warn(`Could not verify/convert file format for ${actorSlug}.png:`, err);
      }
      
      copiedCount++;
    } else {
      console.log(`No icon found for actor: ${actorSlug}`);
    }
  }

  console.log(`\nGathering complete: copied ${copiedCount} new/updated icons, skipped ${skippedCount} identical icons.`);
}

main().catch(console.error);


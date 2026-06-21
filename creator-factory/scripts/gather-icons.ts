import { readdir, mkdir, copyFile, stat, readFile, rm } from 'node:fs/promises';
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

async function getBrandName(actorsDir: string, actorSlug: string): Promise<string> {
  const actorJsonPath = path.join(actorsDir, actorSlug, '.actor', 'actor.json');
  if (existsSync(actorJsonPath)) {
    try {
      const actorJsonContent = await readFile(actorJsonPath, 'utf8');
      const actorJson = JSON.parse(actorJsonContent);
      if (actorJson.title) {
        // Split by em dash, en dash, colon, or hyphen
        const parts = actorJson.title.split(/[—–:-]/);
        if (parts.length > 0) {
          const brand = parts[0].trim();
          if (brand && !brand.includes(' ') && brand.toLowerCase().endsWith('pilot')) {
            return brand;
          } else if (brand && brand.split(' ').length === 1) {
            return brand;
          } else {
            const firstWord = brand.split(/\s+/)[0].trim();
            if (firstWord.toLowerCase().endsWith('pilot')) {
              return firstWord;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Error reading actor.json for ${actorSlug}:`, err);
    }
  }
  return actorSlug;
}

async function main() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const sourceDirs = [
    path.resolve(__dirname, '../generated-actors')
  ];
  const targetDir = path.resolve(__dirname, '../../generated-icons');

  console.log(`Creating target directory: ${targetDir}`);
  await mkdir(targetDir, { recursive: true });

  // Clean up existing PNG files in target directory first to prevent stale names
  if (existsSync(targetDir)) {
    const existingFiles = await readdir(targetDir);
    for (const file of existingFiles) {
      if (file.endsWith('.png')) {
        const filePath = path.join(targetDir, file);
        await rm(filePath, { force: true });
      }
    }
  }

  let copiedCount = 0;
  let skippedCount = 0;

  for (const actorsDir of sourceDirs) {
    if (!existsSync(actorsDir)) continue;
    const entries = await readdir(actorsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const actorSlug = entry.name;

      // Skip backup directories and utility folders
      if (actorSlug.includes('backup') || actorSlug === 'skills' || actorSlug === 'reports') {
        continue;
      }

      const iconPath = path.join(actorsDir, actorSlug, '.actor', 'icon.png');

      if (existsSync(iconPath)) {
        const brandName = await getBrandName(actorsDir, actorSlug);
        const destPath = path.join(targetDir, `${brandName}.png`);

        // Check if target file already exists and is identical to source
        if (existsSync(destPath)) {
          const identical = await filesAreIdentical(iconPath, destPath);
          if (identical) {
            console.log(`Icon for ${brandName} is already identical in target directory. Skipping.`);
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
            console.log(`Converting ${brandName}.png from JPEG to real PNG using sips...`);
            execSync(`sips -s format png "${destPath}" --out "${destPath}"`);
          }
        } catch (err) {
          console.warn(`Could not verify/convert file format for ${brandName}.png:`, err);
        }

        copiedCount++;
      } else {
        console.log(`No icon found for actor: ${actorSlug}`);
      }
    }
  }

  console.log(`\nGathering complete: copied ${copiedCount} new/updated icons, skipped ${skippedCount} identical icons.`);
}

main().catch(console.error);

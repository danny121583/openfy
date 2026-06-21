/**
 * Skill Registry — scans the skills/ directory, parses SKILL.md frontmatter,
 * and provides skill lookup and matching for workflow synthesis.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SkillMeta } from "./project-profile.js";

const SKILLS_DIR = path.resolve(import.meta.dirname ?? ".", "..", "skills");

export async function loadSkillRegistry(skillsDir: string = SKILLS_DIR): Promise<SkillMeta[]> {
  const skills: SkillMeta[] = [];
  let dirs: string[];
  try {
    dirs = await readdir(skillsDir);
  } catch {
    return [];
  }

  for (const dir of dirs) {
    const skillMdPath = path.join(skillsDir, dir, "SKILL.md");
    try {
      const raw = await readFile(skillMdPath, "utf8");
      const meta = parseSkillMd(raw, skillMdPath);
      if (meta) skills.push(meta);
    } catch {
      // No SKILL.md in this directory, skip
    }
  }

  return skills;
}

export function matchSkillsForTask(skills: SkillMeta[], taskDescription: string): SkillMeta[] {
  const lower = taskDescription.toLowerCase();
  const scored = skills.map((skill) => {
    let score = 0;
    // Check name match
    if (lower.includes(skill.name.replace(/-/g, " "))) score += 3;
    if (lower.includes(skill.name)) score += 3;
    // Check description keywords
    const descWords = skill.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && lower.includes(word)) score += 1;
    }
    // Check whenToUse
    for (const when of skill.whenToUse) {
      if (lower.includes(when.toLowerCase())) score += 2;
    }
    return { skill, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.skill);
}

// ---------------------------------------------------------------------------
// YAML frontmatter parser (lightweight, no external dependency)
// ---------------------------------------------------------------------------

function parseSkillMd(raw: string, filePath: string): SkillMeta | null {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const fm = frontmatterMatch[1];
  const name = extractYamlValue(fm, "name");
  const description = extractYamlValue(fm, "description");

  if (!name || !description) return null;

  // Parse the body for When To Use / When Not To Use sections
  const body = raw.slice(frontmatterMatch[0].length);
  const whenToUse = extractSection(body, "When To Use");
  const whenNotToUse = extractSection(body, "When Not To Use");

  return {
    name,
    description,
    path: filePath,
    whenToUse: whenToUse ? parseBulletList(whenToUse) : [],
    whenNotToUse: whenNotToUse ? parseBulletList(whenNotToUse) : [],
  };
}

function extractYamlValue(yaml: string, key: string): string {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = yaml.match(regex);
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function extractSection(body: string, heading: string): string | null {
  const regex = new RegExp(`##\\s*${heading}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, "i");
  const match = body.match(regex);
  return match ? match[1].trim() : null;
}

function parseBulletList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

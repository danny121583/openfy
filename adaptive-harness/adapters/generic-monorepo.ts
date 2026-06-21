/**
 * Generic Monorepo Adapter — detects monorepo structures and maps sub-packages.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ProjectProfile } from "../core/project-profile.js";

export const ADAPTER_NAME = "generic-monorepo";

export function isApplicable(profile: ProjectProfile): boolean {
  return profile.type === "monorepo" || profile.frameworks.some((f) =>
    ["turborepo", "nx", "lerna"].includes(f.toLowerCase())
  );
}

export function enhanceProfile(profile: ProjectProfile): ProjectProfile {
  // Monorepos typically need workspace-aware commands
  const pm = profile.packageManager ?? "npm";

  if (!profile.commands.install) {
    if (pm === "pnpm") profile.commands.install = "pnpm install";
    else if (pm === "yarn") profile.commands.install = "yarn install";
    else profile.commands.install = "npm install";
  }

  return profile;
}

export interface SubPackage {
  name: string;
  path: string;
  hasPackageJson: boolean;
  scripts: string[];
}

export async function detectSubPackages(root: string): Promise<SubPackage[]> {
  const packages: SubPackage[] = [];

  // Try to read workspace config from package.json
  let workspaceGlobs: string[] = [];
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    if (Array.isArray(pkg.workspaces)) {
      workspaceGlobs = pkg.workspaces;
    } else if (pkg.workspaces?.packages) {
      workspaceGlobs = pkg.workspaces.packages;
    }
  } catch { /* no package.json */ }

  // Try pnpm-workspace.yaml
  if (workspaceGlobs.length === 0) {
    try {
      const raw = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
      const match = raw.match(/packages:\s*\n((?:\s*-\s*.+\n?)*)/);
      if (match) {
        workspaceGlobs = match[1]
          .split("\n")
          .map((line) => line.replace(/^\s*-\s*/, "").trim().replace(/['\"]/g, ""))
          .filter(Boolean);
      }
    } catch { /* no pnpm-workspace.yaml */ }
  }

  // Resolve workspace globs
  for (const glob of workspaceGlobs) {
    const baseDir = glob.replace("/*", "").replace("/**", "");
    const fullBaseDir = path.join(root, baseDir);
    try {
      const entries = await readdir(fullBaseDir);
      for (const entry of entries) {
        const fullPath = path.join(fullBaseDir, entry);
        const s = await stat(fullPath);
        if (s.isDirectory()) {
          const subPkg: SubPackage = {
            name: entry,
            path: path.relative(root, fullPath),
            hasPackageJson: false,
            scripts: [],
          };
          try {
            const pkgRaw = await readFile(path.join(fullPath, "package.json"), "utf8");
            const pkg = JSON.parse(pkgRaw);
            subPkg.hasPackageJson = true;
            subPkg.name = pkg.name ?? entry;
            subPkg.scripts = Object.keys(pkg.scripts ?? {});
          } catch { /* no package.json in sub-package */ }
          packages.push(subPkg);
        }
      }
    } catch {
      // Base dir doesn't exist
    }
  }

  return packages;
}

export function getVerificationCommands(profile: ProjectProfile): string[] {
  const cmds: string[] = [];
  if (profile.commands.install) cmds.push(profile.commands.install);
  if (profile.commands.build) cmds.push(profile.commands.build);
  if (profile.commands.test) cmds.push(profile.commands.test);
  if (profile.commands.typecheck) cmds.push(profile.commands.typecheck);
  return cmds;
}

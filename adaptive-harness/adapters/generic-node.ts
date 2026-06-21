/**
 * Generic Node.js Adapter — provides Node-specific detection and command mapping.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectProfile } from "../core/project-profile.js";

export const ADAPTER_NAME = "generic-node";

export function isApplicable(profile: ProjectProfile): boolean {
  return (
    profile.languages.includes("typescript") ||
    profile.languages.includes("javascript") ||
    profile.manifests.some((m) => path.basename(m) === "package.json")
  );
}

export function enhanceProfile(profile: ProjectProfile): ProjectProfile {
  // Ensure Node-specific commands are populated
  const pm = profile.packageManager ?? "npm";
  const prefix = pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : pm === "bun" ? "bun" : "npm";

  if (!profile.commands.install) profile.commands.install = `${prefix} install`;
  if (!profile.commands.start && profile.entrypoints.length > 0) {
    profile.commands.start = `node ${profile.entrypoints[0]}`;
  }

  return profile;
}

export async function detectNodeSpecifics(root: string): Promise<Record<string, unknown>> {
  const specifics: Record<string, unknown> = {};

  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    specifics.name = pkg.name;
    specifics.version = pkg.version;
    specifics.type = pkg.type; // "module" or "commonjs"
    specifics.engines = pkg.engines;
    specifics.scripts = Object.keys(pkg.scripts ?? {});
    specifics.dependencyCount = Object.keys(pkg.dependencies ?? {}).length;
    specifics.devDependencyCount = Object.keys(pkg.devDependencies ?? {}).length;
    specifics.hasWorkspaces = !!pkg.workspaces;
  } catch {
    // No package.json
  }

  return specifics;
}

export function getVerificationCommands(profile: ProjectProfile): string[] {
  const cmds: string[] = [];
  if (profile.commands.install) cmds.push(profile.commands.install);
  if (profile.commands.build) cmds.push(profile.commands.build);
  if (profile.commands.test) cmds.push(profile.commands.test);
  if (profile.commands.lint) cmds.push(profile.commands.lint);
  if (profile.commands.typecheck) cmds.push(profile.commands.typecheck);
  return cmds;
}

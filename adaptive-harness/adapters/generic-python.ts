/**
 * Generic Python Adapter — provides Python-specific detection and command mapping.
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";
import type { ProjectProfile } from "../core/project-profile.js";

export const ADAPTER_NAME = "generic-python";

export function isApplicable(profile: ProjectProfile): boolean {
  return (
    profile.languages.includes("python") ||
    profile.manifests.some((m) => ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"].includes(path.basename(m)))
  );
}

export function enhanceProfile(profile: ProjectProfile): ProjectProfile {
  const pm = profile.packageManager;

  if (!profile.commands.install) {
    if (pm === "poetry") profile.commands.install = "poetry install";
    else if (pm === "uv") profile.commands.install = "uv sync";
    else profile.commands.install = "pip install -r requirements.txt";
  }

  if (!profile.commands.test) {
    profile.commands.test = "pytest";
  }

  if (!profile.commands.lint) {
    profile.commands.lint = "ruff check .";
  }

  if (!profile.commands.typecheck) {
    profile.commands.typecheck = "mypy .";
  }

  return profile;
}

export async function detectPythonSpecifics(root: string): Promise<Record<string, unknown>> {
  const specifics: Record<string, unknown> = {};

  // Check for pyproject.toml
  try {
    const raw = await readFile(path.join(root, "pyproject.toml"), "utf8");
    specifics.hasPyproject = true;
    if (raw.includes("[tool.poetry]")) specifics.usesPoetry = true;
    if (raw.includes("[tool.ruff]")) specifics.usesRuff = true;
    if (raw.includes("[tool.pytest]") || raw.includes("[tool.pytest.ini_options]")) specifics.usesPytest = true;
    if (raw.includes("[tool.mypy]")) specifics.usesMypy = true;
  } catch {
    specifics.hasPyproject = false;
  }

  // Check for virtual env
  for (const venvDir of [".venv", "venv", "env"]) {
    try {
      await access(path.join(root, venvDir));
      specifics.virtualEnv = venvDir;
      break;
    } catch { /* not found */ }
  }

  return specifics;
}

export function getVerificationCommands(profile: ProjectProfile): string[] {
  const cmds: string[] = [];
  if (profile.commands.install) cmds.push(profile.commands.install);
  if (profile.commands.lint) cmds.push(profile.commands.lint);
  if (profile.commands.typecheck) cmds.push(profile.commands.typecheck);
  if (profile.commands.test) cmds.push(profile.commands.test);
  return cmds;
}

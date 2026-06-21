/**
 * Apify Adapter — Apify actor/agent-specific detection, validation, and safety rules.
 * This is NOT part of the core harness — it is a pluggable adapter.
 */

import { readFile, readdir, stat, access } from "node:fs/promises";
import path from "node:path";
import type { ProjectProfile, ApifyProfile } from "../core/project-profile.js";

export const ADAPTER_NAME = "apify";

export function isApplicable(profile: ProjectProfile): boolean {
  return profile.type === "apify" || !!profile.apify;
}

export function enhanceProfile(profile: ProjectProfile): ProjectProfile {
  if (!profile.commands.install) profile.commands.install = "npm install";
  if (!profile.commands.build) profile.commands.build = "npm run build";
  if (!profile.commands.test) profile.commands.test = "npm test";

  return profile;
}

// ---------------------------------------------------------------------------
// Deep Apify analysis
// ---------------------------------------------------------------------------

export interface ApifyActorAnalysis {
  slug: string;
  actorDir: string;
  hasActorJson: boolean;
  hasInputSchema: boolean;
  hasOutputSchema: boolean;
  hasIcon: boolean;
  hasReadme: boolean;
  hasChangelog: boolean;
  hasDockerfile: boolean;
  hasMainEntry: boolean;
  hasPactReport: boolean;
  hasDeployReport: boolean;
  inputSchemaValid: boolean;
  outputSchemaValid: boolean;
  usesApifySdk: boolean;
  usesCrawlee: boolean;
  usesProxy: boolean;
  usesDataset: boolean;
  hasTests: boolean;
  issues: string[];
}

export async function analyzeActorDirectory(actorDir: string): Promise<ApifyActorAnalysis> {
  const slug = path.basename(actorDir);
  const issues: string[] = [];

  const hasActorJson = await fileExists(path.join(actorDir, ".actor", "actor.json"));
  const hasInputSchema = await fileExists(path.join(actorDir, ".actor", "input_schema.json"));
  const hasOutputSchema = await fileExists(path.join(actorDir, ".actor", "output_schema.json"));
  const hasIcon = await fileExists(path.join(actorDir, ".actor", "icon.png"));
  const hasReadme = await fileExists(path.join(actorDir, "README.md"));
  const hasChangelog = await fileExists(path.join(actorDir, "CHANGELOG.md"));
  const hasDockerfile = await fileExists(path.join(actorDir, "Dockerfile"));
  const hasMainEntry = await fileExists(path.join(actorDir, "main.js")) || await fileExists(path.join(actorDir, "src", "main.ts"));
  const hasPactReport = await fileExists(path.join(actorDir, "reports", "pact-test-report.md"));
  const hasDeployReport = await fileExists(path.join(actorDir, "reports", "deploy-report.md"));
  const hasTests = await fileExists(path.join(actorDir, "test"));

  if (!hasActorJson) issues.push("Missing .actor/actor.json");
  if (!hasInputSchema) issues.push("Missing .actor/input_schema.json");
  if (!hasOutputSchema) issues.push("Missing .actor/output_schema.json");
  if (!hasIcon) issues.push("Missing .actor/icon.png");
  if (!hasReadme) issues.push("Missing README.md");
  if (!hasDockerfile) issues.push("Missing Dockerfile");
  if (!hasMainEntry) issues.push("Missing main entry (main.js or src/main.ts)");
  if (!hasTests) issues.push("Missing test directory");

  // Validate schemas
  let inputSchemaValid = false;
  if (hasInputSchema) {
    try {
      const raw = await readFile(path.join(actorDir, ".actor", "input_schema.json"), "utf8");
      const schema = JSON.parse(raw);
      inputSchemaValid = !!schema.title && !!schema.type && !!schema.properties;
      if (!schema.schemaVersion) issues.push("Input schema missing schemaVersion");
      // Check editors
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        const p = prop as Record<string, unknown>;
        if (!p.editor) issues.push(`Input schema property "${key}" missing editor field`);
      }
    } catch (e) {
      issues.push(`Input schema parse error: ${e}`);
    }
  }

  let outputSchemaValid = false;
  if (hasOutputSchema) {
    try {
      const raw = await readFile(path.join(actorDir, ".actor", "output_schema.json"), "utf8");
      const schema = JSON.parse(raw);
      outputSchemaValid = schema.actorOutputSchemaVersion === 1 && !!schema.properties?.results;
      if (!outputSchemaValid) issues.push("Output schema does not match Apify v1 format");
    } catch (e) {
      issues.push(`Output schema parse error: ${e}`);
    }
  }

  // Check for SDK usage in source
  let usesApifySdk = false;
  let usesCrawlee = false;
  let usesProxy = false;
  let usesDataset = false;
  try {
    const pkgRaw = await readFile(path.join(actorDir, "package.json"), "utf8");
    usesApifySdk = pkgRaw.includes('"apify"');
    usesCrawlee = pkgRaw.includes('"crawlee"');
  } catch { /* no package.json */ }

  // Check main.js for patterns
  try {
    const mainPath = await fileExists(path.join(actorDir, "main.js"))
      ? path.join(actorDir, "main.js")
      : path.join(actorDir, "src", "main.ts");
    const main = await readFile(mainPath, "utf8");
    if (main.includes("ProxyConfiguration") || main.includes("useApifyProxy")) usesProxy = true;
    if (main.includes("Actor.pushData") || main.includes("Dataset")) usesDataset = true;
  } catch { /* no main file */ }

  return {
    slug,
    actorDir,
    hasActorJson,
    hasInputSchema,
    hasOutputSchema,
    hasIcon,
    hasReadme,
    hasChangelog,
    hasDockerfile,
    hasMainEntry,
    hasPactReport,
    hasDeployReport,
    inputSchemaValid,
    outputSchemaValid,
    usesApifySdk,
    usesCrawlee,
    usesProxy,
    usesDataset,
    hasTests,
    issues,
  };
}

export async function analyzeAllActors(generatedActorsDir: string): Promise<ApifyActorAnalysis[]> {
  const analyses: ApifyActorAnalysis[] = [];
  try {
    const entries = await readdir(generatedActorsDir);
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = path.join(generatedActorsDir, entry);
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        const analysis = await analyzeActorDirectory(fullPath);
        analyses.push(analysis);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return analyses;
}

// ---------------------------------------------------------------------------
// Safety rules for Apify adapter
// ---------------------------------------------------------------------------

export const APIFY_SAFETY_RULES = {
  neverAutoPublish: true,
  neverAutoChangePricing: true,
  neverAutoChangeSecrets: true,
  neverDeleteStorage: true,
  neverModifyProductionCredentials: true,
  requireApprovalFor: ["apify push", "pricing changes", "store publication", "secret management"],
};

export function getVerificationCommands(profile: ProjectProfile): string[] {
  const cmds: string[] = [];
  if (profile.commands.install) cmds.push(profile.commands.install);
  if (profile.commands.build) cmds.push(profile.commands.build);
  if (profile.commands.test) cmds.push(profile.commands.test);
  cmds.push("APIFY_DISABLE_TELEMETRY=1 npx apify validate-schema");
  return cmds;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

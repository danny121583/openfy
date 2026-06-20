import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { actorRegistryPath, generatedActorsDir } from "./config.js";
import type { ActorIdea, ActorRunState, GapAnalysis, MainRunResult, RegistryEntry, StoreResearch } from "./types.js";
import { redactSecrets } from "./commands.js";

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function writeMarkdown(filePath: string, markdown: string) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, redactSecrets(markdown), "utf8");
}

export async function readRegistry(): Promise<RegistryEntry[]> {
  try {
    return JSON.parse(await readFile(actorRegistryPath, "utf8")) as RegistryEntry[];
  } catch {
    return [];
  }
}

export async function writeRegistry(entries: RegistryEntry[]) {
  await ensureDir(path.dirname(actorRegistryPath));
  await writeFile(actorRegistryPath, JSON.stringify(entries, null, 2), "utf8");
}

export async function existingActorSlugs() {
  try {
    const entries = await readdir(generatedActorsDir, { withFileTypes: true });
    return new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  } catch {
    return new Set<string>();
  }
}

export function researchMarkdown(research: StoreResearch) {
  return `# Apify Store Research
## Researched At
${research.researchedAt}
## Crowded Areas
${research.crowdedAreas.map((area) => `- ${area}`).join("\n")}
## Category Findings
${research.categories.map((item) => `### ${item.category}
- URL: ${item.url}
- Status: ${item.status}
${item.error ? `- Error: ${item.error}\n` : ""}#### Notes
${item.notes.map((note) => `- ${note}`).join("\n")}
#### Actor Mentions
${item.actorMentions.length ? item.actorMentions.map((mention) => `- ${mention}`).join("\n") : "- None captured from fetched HTML."}`).join("\n\n")}
`;
}

export function gapMarkdown(gaps: GapAnalysis) {
  return `# Gap Analysis
## Underserved Opportunities
${gaps.gaps.map((gap) => `- ${gap}`).join("\n")}
## Avoid
${gaps.avoid.map((item) => `- ${item}`).join("\n")}
## Recommended Angles
${gaps.recommendedAngles.map((angle) => `- ${angle}`).join("\n")}
`;
}

export function selectedActorsMarkdown(ideas: ActorIdea[]) {
  return `# Selected Actors
${ideas.map((idea, index) => `## ${index + 1}. ${idea.actorName}
- Slug: ${idea.slug}
- Problem solved: ${idea.problemSolved}
- Target users: ${idea.targetUsers.join(", ")}
- Why not duplicate: ${idea.whyNotDuplicate}
- Template: ${idea.template}
- Difficulty: ${idea.difficulty}
- Expected Apify category: ${idea.expectedCategory}
- Monetization angle: ${idea.monetizationAngle}
### Input Schema Draft
\`\`\`json
${JSON.stringify(idea.inputSchemaDraft, null, 2)}
\`\`\`
### Output Schema Draft
\`\`\`json
${JSON.stringify(idea.outputSchemaDraft, null, 2)}
\`\`\``).join("\n\n")}
`;
}

export function mainReport(result: MainRunResult) {
  const pushed = result.actors.filter((actor) => actor.pushed);
  const passed = result.actors.filter((actor) => ["ready_for_push", "pushed", "ready_for_manual_push"].includes(actor.status));
  const failed = result.actors.filter((actor) => actor.status === "failed");
  const manual = result.actors.filter((actor) => actor.status === "ready_for_manual_push");
  return `# Main Agent Run Report
## Run ID
${result.runId}
## Started At
${result.startedAt}
## Finished At
${result.finishedAt}
## Apify Store Research Summary
Researched ${result.research.categories.length} categories. Fetched ${result.research.categories.filter((item) => item.status === "fetched").length} successfully.
## Gaps Identified
${result.gaps.gaps.map((gap) => `- ${gap}`).join("\n")}
## Actors Selected
| Actor | Slug | Template | Status | Pushed | Apify URL |
|---|---|---|---|---|---|
${result.actors.map((actor) => `| ${actor.idea.actorName} | ${actor.idea.slug} | ${actor.idea.template} | ${actor.status} | ${actor.pushed ? "yes" : "no"} | ${actor.apifyActorUrl || "N/A"} |`).join("\n")}
## Actors Generated
${result.actors.length}
## Actors Passed PACT
${passed.length}
## Actors Failed PACT
${failed.length}
## Actors Pushed
${pushed.length}
## Actors Ready For Manual Push
${manual.length}
## Errors
${result.actors.flatMap((actor) => actor.errors.map((error) => `- ${actor.idea.slug}: ${error}`)).join("\n") || "- None"}
## Recommended Next 5 Actors
- Review Response Opportunity Finder
- Local Landing Page CTA Monitor
- Multi-Location Franchise Conversion Gap Auditor
- Service Area Coverage Gap Scanner
- Local Business Trust Proof Monitor
## Final Verdict
${result.finalVerdict}
`;
}

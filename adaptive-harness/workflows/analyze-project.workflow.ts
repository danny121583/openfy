/**
 * Analyze Project Workflow — runs the full project analysis pipeline.
 */

import { analyzeProject } from "../core/project-analyzer.js";
import { saveProfile } from "../core/memory-store.js";
import { writeReport, generateReportPath } from "../core/report-writer.js";
import { loadSkillRegistry } from "../core/skill-registry.js";
import type { HarnessReport } from "../core/project-profile.js";

export async function runAnalyzeProjectWorkflow(projectRoot: string): Promise<string> {
  console.log(`[harness] Analyzing project at: ${projectRoot}`);
  const profile = await analyzeProject(projectRoot);
  await saveProfile(profile);
  console.log(`[harness] Profile saved. Type: ${profile.type}, Languages: ${profile.languages.join(", ")}`);

  const skills = await loadSkillRegistry();
  console.log(`[harness] ${skills.length} skills loaded.`);

  const report: HarnessReport = {
    task: "Project Analysis",
    date: new Date().toISOString(),
    projectProfile: profile,
    detectedAdapter: profile.adapters[0] ?? "none",
    workflowUsed: "analyze-project",
    agentsUsed: ["planner"],
    skillsUsed: ["repo-analysis"],
    filesInspected: [...profile.manifests, ...profile.entrypoints, ...profile.docs],
    filesChanged: [],
    commandsRun: [],
    verificationResult: "skipped",
    failures: [],
    fixesApplied: [],
    safetyGatesTriggered: [],
    lessonsLearned: [`Project detected as type: ${profile.type}`, `${profile.languages.length} languages detected.`, `${profile.adapters.length} adapters applicable.`],
    recommendations: generateRecommendations(profile),
  };

  const reportPath = generateReportPath("project-analysis");
  await writeReport(report, reportPath);
  console.log(`[harness] Report saved to: ${reportPath}`);
  return reportPath;
}

function generateRecommendations(profile: import("../core/project-profile.js").ProjectProfile): string[] {
  const recs: string[] = [];
  if (profile.docs.length === 0) recs.push("Add a README.md to the project root.");
  if (!profile.commands.test) recs.push("Add a test command to enable automated verification.");
  if (!profile.commands.lint) recs.push("Add a lint command for code quality checking.");
  if (profile.envFiles.length === 0) recs.push("Consider adding a .env.example for documentation.");
  if (profile.ciFiles.length === 0) recs.push("Add CI/CD configuration for automated builds and tests.");
  if (profile.risks.security.length > 0) recs.push(`Review ${profile.risks.security.length} security-sensitive files.`);
  if (profile.type === "apify" && profile.apify) {
    if (!profile.apify.hasOutputSchema) recs.push("Add output schemas to Apify actors.");
    if (!profile.apify.usesCrawlee) recs.push("Consider using Crawlee for more robust crawling.");
  }
  return recs;
}

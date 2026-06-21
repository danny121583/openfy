/**
 * Repo Audit Workflow — full repository audit covering structure, tests, docs, security, and dependencies.
 */

import { analyzeProject } from "../core/project-analyzer.js";
import { loadSkillRegistry } from "../core/skill-registry.js";
import { synthesizeWorkflow } from "../core/workflow-synthesizer.js";
import { loadSafetyPolicy } from "../core/safety-gates.js";
import { writeReport, generateReportPath } from "../core/report-writer.js";
import { appendLesson } from "../core/memory-store.js";
import type { HarnessReport } from "../core/project-profile.js";

export async function runRepoAuditWorkflow(projectRoot: string): Promise<string> {
  console.log(`[harness] Running repo audit for: ${projectRoot}`);
  const profile = await analyzeProject(projectRoot);
  const skills = await loadSkillRegistry();
  const policy = await loadSafetyPolicy();

  const plan = synthesizeWorkflow("Full repository audit", profile, skills, policy);
  console.log(`[harness] Workflow synthesized: ${plan.phases.length} phases.`);

  const allSkillsUsed = [...new Set(plan.phases.flatMap((p) => p.skills))];
  const allAgentsUsed = [...new Set(plan.phases.flatMap((p) => p.agents))];
  const allFilesToInspect = [...new Set(plan.phases.flatMap((p) => p.filesToInspect))];

  const recommendations: string[] = [];
  // Structure checks
  if (profile.manifests.length === 0) recommendations.push("No package manifests found.");
  if (profile.entrypoints.length === 0) recommendations.push("No entrypoints detected.");
  if (profile.ciFiles.length === 0) recommendations.push("No CI/CD configuration found.");
  if (profile.docs.length === 0) recommendations.push("No documentation files found.");
  if (!profile.commands.test) recommendations.push("No test command configured.");
  if (profile.risks.security.length > 3) recommendations.push(`${profile.risks.security.length} security-sensitive files found — review recommended.`);

  const lessons = [`Repo audit completed. Type: ${profile.type}. ${recommendations.length} recommendations.`];
  await appendLesson(projectRoot, profile.adapters[0] ?? "generic", lessons[0]);

  const report: HarnessReport = {
    task: "Repository Audit",
    date: new Date().toISOString(),
    projectProfile: profile,
    detectedAdapter: profile.adapters[0] ?? "none",
    workflowUsed: "repo-audit",
    agentsUsed: allAgentsUsed,
    skillsUsed: allSkillsUsed,
    filesInspected: allFilesToInspect,
    filesChanged: [],
    commandsRun: [],
    verificationResult: "skipped",
    failures: [],
    fixesApplied: [],
    safetyGatesTriggered: [],
    lessonsLearned: lessons,
    recommendations,
  };

  const reportPath = generateReportPath("repo-audit");
  await writeReport(report, reportPath);
  console.log(`[harness] Repo audit report saved to: ${reportPath}`);
  return reportPath;
}

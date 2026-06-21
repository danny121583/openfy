/**
 * Self-Heal Workflow — diagnoses and attempts to fix a known failure.
 */

import { analyzeProject } from "../core/project-analyzer.js";
import { classifyFailureFromError, buildHealingSteps } from "../core/self-healer.js";
import { runVerification } from "../core/verifier.js";
import { appendFailure, appendLesson } from "../core/memory-store.js";
import { writeReport, generateReportPath } from "../core/report-writer.js";
import type { HarnessReport, VerificationResult } from "../core/project-profile.js";

export async function runSelfHealWorkflow(projectRoot: string, errorDescription?: string): Promise<string> {
  console.log(`[harness] Running self-heal workflow for: ${projectRoot}`);
  const profile = await analyzeProject(projectRoot);

  // If an error is provided, classify it
  let classification;
  if (errorDescription) {
    classification = classifyFailureFromError(errorDescription);
    console.log(`[harness] Failure classified as: ${classification.type}`);
    console.log(`[harness] Likely cause: ${classification.likelyCause}`);
  }

  // Run verification to find current failures
  const verificationResults: VerificationResult[] = [];
  const commands = [profile.commands.build, profile.commands.test, profile.commands.lint].filter(Boolean) as string[];

  for (const cmd of commands) {
    const result = await runVerification(cmd, profile.root);
    verificationResults.push(result);
  }

  const failures = verificationResults.filter((r) => !r.passed);
  const failureDescriptions = failures.map((f) => `${f.command}: exit ${f.exitCode}`);

  // Build healing steps
  const healingSteps = classification ? buildHealingSteps(classification) : ["No specific error provided. Running diagnostic verification."];

  // Record failures
  for (const f of failureDescriptions) {
    await appendFailure(projectRoot, profile.adapters[0] ?? "generic", f, { command: f });
  }

  // Record lessons
  const lessons = [
    `Self-heal triggered. ${failures.length} failing commands found.`,
    ...(classification ? [`Classified as: ${classification.type}`, `Proposed fix: ${classification.proposedFix}`] : []),
  ];

  for (const lesson of lessons) {
    await appendLesson(projectRoot, profile.adapters[0] ?? "generic", lesson);
  }

  const report: HarnessReport = {
    task: "Self-Healing",
    date: new Date().toISOString(),
    projectProfile: profile,
    detectedAdapter: profile.adapters[0] ?? "none",
    workflowUsed: "self-heal",
    agentsUsed: ["self-healer", "verifier"],
    skillsUsed: ["self-healing", "test-runner"],
    filesInspected: classification?.relevantFiles ?? [],
    filesChanged: [],
    commandsRun: verificationResults,
    verificationResult: failures.length === 0 ? "pass" : "fail",
    failures: failureDescriptions,
    fixesApplied: [],
    safetyGatesTriggered: [],
    lessonsLearned: lessons,
    recommendations: [
      ...(classification ? [classification.proposedFix] : []),
      ...healingSteps,
    ],
  };

  const reportPath = generateReportPath("self-heal");
  await writeReport(report, reportPath);
  console.log(`[harness] Self-heal report saved to: ${reportPath}`);
  return reportPath;
}

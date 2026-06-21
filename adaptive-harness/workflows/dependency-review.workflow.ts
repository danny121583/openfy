/**
 * Dependency Review Workflow — deep dependency analysis.
 */

import { analyzeProject } from "../core/project-analyzer.js";
import { checkOutdatedPackages, checkSecurityAdvisories } from "../core/update-watcher.js";
import { writeReport, generateReportPath } from "../core/report-writer.js";
import type { HarnessReport } from "../core/project-profile.js";

export async function runDependencyReviewWorkflow(projectRoot: string): Promise<string> {
  console.log(`[harness] Running dependency review for: ${projectRoot}`);
  const profile = await analyzeProject(projectRoot);

  const outdated = await checkOutdatedPackages(profile);
  const advisories = await checkSecurityAdvisories(profile);

  const recommendations: string[] = [];
  const patchUpdates = outdated.filter((p) => p.updateType === "patch");
  const minorUpdates = outdated.filter((p) => p.updateType === "minor");
  const majorUpdates = outdated.filter((p) => p.updateType === "major");

  if (patchUpdates.length > 0) recommendations.push(`${patchUpdates.length} patch updates available (safe to apply).`);
  if (minorUpdates.length > 0) recommendations.push(`${minorUpdates.length} minor updates available (review recommended).`);
  if (majorUpdates.length > 0) recommendations.push(`${majorUpdates.length} major updates available (breaking changes likely).`);
  if (advisories.length > 0) recommendations.push(`${advisories.length} security advisories — action required.`);

  for (const pkg of outdated) {
    recommendations.push(`  ${pkg.recommendation}: ${pkg.package} ${pkg.currentVersion} → ${pkg.latestVersion}`);
  }

  const report: HarnessReport = {
    task: "Dependency Review",
    date: new Date().toISOString(),
    projectProfile: profile,
    detectedAdapter: profile.adapters[0] ?? "none",
    workflowUsed: "dependency-review",
    agentsUsed: ["update-watcher"],
    skillsUsed: ["dependency-updates", "security-review"],
    filesInspected: [...profile.manifests, ...profile.lockfiles],
    filesChanged: [],
    commandsRun: [],
    verificationResult: "skipped",
    failures: [],
    fixesApplied: [],
    safetyGatesTriggered: [],
    lessonsLearned: [`${outdated.length} outdated, ${advisories.length} advisories.`],
    recommendations,
  };

  const reportPath = generateReportPath("dependency-review");
  await writeReport(report, reportPath);
  console.log(`[harness] Dependency review report saved to: ${reportPath}`);
  return reportPath;
}

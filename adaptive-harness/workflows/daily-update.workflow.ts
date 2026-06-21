/**
 * Daily Update Workflow — checks for outdated packages, security advisories,
 * and adapter-specific changes. Produces recommendations.
 */

import { analyzeProject } from "../core/project-analyzer.js";
import { checkOutdatedPackages, checkSecurityAdvisories, checkAdapterSpecificUpdates } from "../core/update-watcher.js";
import { appendUpdate } from "../core/memory-store.js";
import { writeReport, generateReportPath } from "../core/report-writer.js";
import type { HarnessReport } from "../core/project-profile.js";

export async function runDailyUpdateWorkflow(projectRoot: string): Promise<string> {
  console.log(`[harness] Running daily update check for: ${projectRoot}`);
  const profile = await analyzeProject(projectRoot);

  console.log("[harness] Checking outdated packages...");
  const outdated = await checkOutdatedPackages(profile);

  console.log("[harness] Checking security advisories...");
  const advisories = await checkSecurityAdvisories(profile);

  console.log("[harness] Checking adapter-specific updates...");
  const adapterNotes = await checkAdapterSpecificUpdates(profile);

  const recommendations: string[] = [];
  for (const pkg of outdated) {
    recommendations.push(`${pkg.recommendation.toUpperCase()}: ${pkg.package} ${pkg.currentVersion} → ${pkg.latestVersion} (${pkg.updateType})`);
  }
  for (const adv of advisories) {
    recommendations.push(`SECURITY: ${adv.package} — ${adv.advisoryDetails ?? "vulnerability detected"}`);
  }
  recommendations.push(...adapterNotes);

  const lessons = [
    `${outdated.length} outdated packages found.`,
    `${advisories.length} security advisories found.`,
    `${adapterNotes.length} adapter-specific notes.`,
  ];

  await appendUpdate(projectRoot, profile.adapters[0] ?? "generic", `Daily update: ${outdated.length} outdated, ${advisories.length} advisories`, { outdated, advisories, adapterNotes });

  const report: HarnessReport = {
    task: "Daily Update Check",
    date: new Date().toISOString(),
    projectProfile: profile,
    detectedAdapter: profile.adapters[0] ?? "none",
    workflowUsed: "daily-update",
    agentsUsed: ["update-watcher"],
    skillsUsed: ["dependency-updates", "security-review"],
    filesInspected: [...profile.manifests, ...profile.lockfiles],
    filesChanged: [],
    commandsRun: [],
    verificationResult: "skipped",
    failures: [],
    fixesApplied: [],
    safetyGatesTriggered: [],
    lessonsLearned: lessons,
    recommendations,
  };

  const reportPath = generateReportPath("daily-update");
  await writeReport(report, reportPath);
  console.log(`[harness] Daily update report saved to: ${reportPath}`);
  return reportPath;
}

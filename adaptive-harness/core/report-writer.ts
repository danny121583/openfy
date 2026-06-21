/**
 * Report Writer — generates timestamped markdown reports for every harness run.
 * Reports follow a consistent structure for both human and agent consumption.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { HarnessReport, ProjectProfile, VerificationResult, SafetyGateResult } from "./project-profile.js";

const REPORTS_DIR = path.resolve(import.meta.dirname ?? ".", "..", "reports");

export function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function generateReportPath(suffix: string = "agent-report"): string {
  return path.join(REPORTS_DIR, `${formatTimestamp()}-${suffix}.md`);
}

export async function writeReport(report: HarnessReport, reportPath?: string): Promise<string> {
  const filePath = reportPath ?? generateReportPath();
  await mkdir(path.dirname(filePath), { recursive: true });

  const md = renderReport(report);
  await writeFile(filePath, md);
  return filePath;
}

export function renderReport(report: HarnessReport): string {
  return `# Adaptive Harness Report

## Task
${report.task}

## Date
${report.date}

## Project Profile
- **Name**: ${report.projectProfile.name}
- **Root**: ${report.projectProfile.root}
- **Type**: ${report.projectProfile.type}
- **Languages**: ${report.projectProfile.languages.join(", ") || "none detected"}
- **Package Manager**: ${report.projectProfile.packageManager ?? "unknown"}
- **Frameworks**: ${report.projectProfile.frameworks.join(", ") || "none detected"}

## Detected Adapter
${report.detectedAdapter}

## Workflow Used
${report.workflowUsed}

## Agents Used
${report.agentsUsed.map((a) => `- ${a}`).join("\n") || "- none"}

## Skills Used
${report.skillsUsed.map((s) => `- ${s}`).join("\n") || "- none"}

## Files Inspected
${report.filesInspected.map((f) => `- \`${f}\``).join("\n") || "- none"}

## Files Changed
${report.filesChanged.map((f) => `- \`${f}\``).join("\n") || "- none (read-only run)"}

## Commands Run
${renderCommands(report.commandsRun)}

## Verification Result
**${report.verificationResult.toUpperCase()}**

## Failures
${report.failures.map((f) => `- ${f}`).join("\n") || "- none"}

## Fixes Applied
${report.fixesApplied.map((f) => `- ${f}`).join("\n") || "- none"}

## Safety Gates Triggered
${renderSafetyGates(report.safetyGatesTriggered)}

## Lessons Learned
${report.lessonsLearned.map((l) => `- ${l}`).join("\n") || "- none"}

## Recommendations
${report.recommendations.map((r) => `- ${r}`).join("\n") || "- none"}
`;
}

function renderCommands(commands: VerificationResult[]): string {
  if (commands.length === 0) return "- none";
  return commands
    .map(
      (cmd) =>
        `### \`${cmd.command}\`\n- **Exit Code**: ${cmd.exitCode}\n- **Duration**: ${cmd.durationMs}ms\n- **Passed**: ${cmd.passed ? "✅" : "❌"}\n${cmd.stdout ? `- **Stdout** (truncated): ${cmd.stdout.slice(0, 500)}` : ""}${cmd.stderr ? `\n- **Stderr** (truncated): ${cmd.stderr.slice(0, 500)}` : ""}`
    )
    .join("\n\n");
}

function renderSafetyGates(gates: SafetyGateResult[]): string {
  if (gates.length === 0) return "- none";
  return gates
    .map((g) => `- **${g.gate}** → ${g.target}: ${g.allowed ? "✅ allowed" : "❌ blocked"} — ${g.reason}`)
    .join("\n");
}

export async function writeCustomReport(filename: string, content: string): Promise<string> {
  const filePath = path.join(REPORTS_DIR, filename);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return filePath;
}

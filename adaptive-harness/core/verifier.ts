/**
 * Verifier — runs verification commands from the project profile
 * and returns structured results with pass/fail determination.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { VerificationResult } from "./project-profile.js";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 120_000; // 2 minutes

export async function runVerification(
  command: string,
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<VerificationResult> {
  const start = Date.now();
  const parts = command.split(/\s+/);
  const cmd = parts[0]!;
  const args = parts.slice(1);

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0", CI: "true" },
    });

    return {
      command,
      cwd,
      exitCode: 0,
      stdout: stdout.slice(0, 5000),
      stderr: stderr.slice(0, 5000),
      durationMs: Date.now() - start,
      passed: true,
    };
  } catch (error: unknown) {
    const err = error as { code?: number; stdout?: string; stderr?: string; killed?: boolean };
    return {
      command,
      cwd,
      exitCode: err.code ?? 1,
      stdout: (err.stdout ?? "").slice(0, 5000),
      stderr: (err.stderr ?? "").slice(0, 5000),
      durationMs: Date.now() - start,
      passed: false,
    };
  }
}

export async function runAllVerifications(
  commands: string[],
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<{ results: VerificationResult[]; allPassed: boolean }> {
  const results: VerificationResult[] = [];
  for (const command of commands) {
    const result = await runVerification(command, cwd, timeoutMs);
    results.push(result);
  }
  return {
    results,
    allPassed: results.every((r) => r.passed),
  };
}

export function summarizeVerification(results: VerificationResult[]): string {
  if (results.length === 0) return "No verification commands executed.";
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const lines = [`${passed} passed, ${failed} failed out of ${results.length} commands.`];
  for (const r of results) {
    lines.push(`  ${r.passed ? "✅" : "❌"} \`${r.command}\` (exit ${r.exitCode}, ${r.durationMs}ms)`);
  }
  return lines.join("\n");
}

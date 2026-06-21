#!/usr/bin/env tsx
/**
 * CLI entry point: npm run harness:daily-update
 */

import path from "node:path";
import { runDailyUpdateWorkflow } from "../workflows/daily-update.workflow.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="));
const projectRoot = rootArg ? rootArg.split("=")[1]! : path.resolve(import.meta.dirname ?? ".", "..");

console.log("════════════════════════════════════════════════════════");
console.log("  Adaptive Harness — Daily Update Check");
console.log("════════════════════════════════════════════════════════");
console.log(`  Target: ${projectRoot}`);
console.log("");

try {
  const reportPath = await runDailyUpdateWorkflow(projectRoot);
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  ✅ Daily update complete. Report: ${reportPath}`);
  console.log("════════════════════════════════════════════════════════");
} catch (error) {
  console.error("Daily update failed:", error);
  process.exit(1);
}

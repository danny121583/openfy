#!/usr/bin/env tsx
/**
 * CLI entry point: npm run harness:self-heal
 */

import path from "node:path";
import { runSelfHealWorkflow } from "../workflows/self-heal.workflow.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="));
const errorArg = args.find((a) => a.startsWith("--error="));
const projectRoot = rootArg ? rootArg.split("=")[1]! : path.resolve(import.meta.dirname ?? ".", "..");
const errorDescription = errorArg ? errorArg.split("=").slice(1).join("=") : undefined;

console.log("════════════════════════════════════════════════════════");
console.log("  Adaptive Harness — Self-Healing");
console.log("════════════════════════════════════════════════════════");
console.log(`  Target: ${projectRoot}`);
if (errorDescription) console.log(`  Error: ${errorDescription}`);
console.log("");

try {
  const reportPath = await runSelfHealWorkflow(projectRoot, errorDescription);
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  ✅ Self-heal complete. Report: ${reportPath}`);
  console.log("════════════════════════════════════════════════════════");
} catch (error) {
  console.error("Self-heal failed:", error);
  process.exit(1);
}

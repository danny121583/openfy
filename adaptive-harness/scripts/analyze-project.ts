#!/usr/bin/env tsx
/**
 * CLI entry point: npm run harness:analyze
 * Analyzes the project and generates a profile + report.
 */

import path from "node:path";
import { runAnalyzeProjectWorkflow } from "../workflows/analyze-project.workflow.js";

const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="));
const projectRoot = rootArg ? rootArg.split("=")[1]! : path.resolve(import.meta.dirname ?? ".", "..");

console.log("════════════════════════════════════════════════════════");
console.log("  Adaptive Harness — Project Analyzer");
console.log("════════════════════════════════════════════════════════");
console.log(`  Target: ${projectRoot}`);
console.log("");

try {
  const reportPath = await runAnalyzeProjectWorkflow(projectRoot);
  console.log("");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  ✅ Analysis complete. Report: ${reportPath}`);
  console.log("════════════════════════════════════════════════════════");
} catch (error) {
  console.error("Analysis failed:", error);
  process.exit(1);
}

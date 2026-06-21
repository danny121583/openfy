#!/usr/bin/env tsx
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);
const args = process.argv.slice(2);
const project = args.find(a => a.startsWith("--project="))?.split("=")[1] || process.cwd();

console.log(`Verifier Agent running test execution in: ${project}`);

async function run() {
  try {
    const { stdout, stderr } = await execPromise("npm test", { cwd: project });
    console.log("Test Results Output:");
    console.log(stdout || stderr);
    console.log("✅ All tests passed.");
  } catch (err: any) {
    console.error("Test execution failed:");
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Verifier test run failed:", err);
  process.exit(1);
});

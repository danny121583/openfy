#!/usr/bin/env tsx
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);
const args = process.argv.slice(2);
const command = args.find(a => a.startsWith("--command="))?.split("=")[1];
const project = args.find(a => a.startsWith("--project="))?.split("=")[1] || process.cwd();

if (!command) {
  console.error("Usage: tsx execute.ts --command=<cmd> [--project=<path>]");
  process.exit(1);
}

console.log(`Executor Agent executing command: "${command}" in: ${project}`);

async function run() {
  // Simple safety filter
  const cmdLower = command!.toLowerCase();
  if (cmdLower.includes("rm -rf /") || cmdLower.includes("rm -rf *")) {
    console.error("Executor blocked dangerous command execution.");
    process.exit(1);
  }

  try {
    const { stdout, stderr } = await execPromise(command!, { cwd: project });
    console.log("Execution Output:");
    console.log(stdout || stderr);
    console.log("✅ Command executed successfully.");
  } catch (err: any) {
    console.error("Command execution failed:");
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Executor execution failed:", err);
  process.exit(1);
});

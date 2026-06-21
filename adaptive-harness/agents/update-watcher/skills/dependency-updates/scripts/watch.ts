#!/usr/bin/env tsx
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execPromise = promisify(exec);
const args = process.argv.slice(2);
const project = args.find(a => a.startsWith("--project="))?.split("=")[1] || process.cwd();

console.log(`Update Watcher Agent scanning dependencies in: ${project}`);

async function run() {
  let outdatedText = "All packages are up to date.";
  try {
    const { stdout } = await execPromise("npm outdated", { cwd: project });
    if (stdout.trim()) {
      outdatedText = stdout;
    }
  } catch (err: any) {
    if (err.stdout) {
      outdatedText = err.stdout;
    }
  }

  console.log("Dependency Scan Results:");
  console.log(outdatedText);

  const reportDir = path.resolve(project, "reports");
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, "dependency-watch-report.md"), `# Dependency Watch Report\n\n\`\`\`\n${outdatedText}\n\`\`\`\n`, "utf8");
}

run().catch(err => {
  console.error("Dependency watch scan failed:", err);
  process.exit(1);
});

#!/usr/bin/env tsx
import fs from "node:fs/promises";

const args = process.argv.slice(2);
const file = args.find(a => a.startsWith("--file="))?.split("=")[1];

if (!file) {
  console.error("Usage: tsx review.ts --file=<filePath>");
  process.exit(1);
}

console.log(`Critic Agent reviewing file: ${file}`);

async function run() {
  const content = await fs.readFile(file, "utf8").catch(() => "");
  const findings: string[] = [];

  if (content.toLowerCase().includes("eval(")) {
    findings.push("- [!] WARNING: dangerous use of 'eval' detected.");
  }
  if (content.toLowerCase().includes("password") || content.toLowerCase().includes("secret_key")) {
    findings.push("- [!] WARNING: potential hardcoded credential naming detected.");
  }

  console.log("Review Findings:");
  if (findings.length > 0) {
    console.log(findings.join("\n"));
  } else {
    console.log("✅ File conforms to basic quality baseline.");
  }
}

run().catch(err => {
  console.error("Critic review failed:", err);
  process.exit(1);
});

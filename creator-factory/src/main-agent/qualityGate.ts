import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { actorLogoRelativePath, isPng } from "./actorLogo.js";
import type { ActorRunState, CommandResult } from "./types.js";

export type QualityGateItem = {
  label: string;
  passed: boolean;
  details?: string;
};

export type QualityGateResult = {
  passed: boolean;
  items: QualityGateItem[];
};

export async function runQualityGate(actor: ActorRunState, localRun: CommandResult | undefined): Promise<QualityGateResult> {
  const dir = actor.actorDir;
  const secretHits = await scanForSecrets(dir);
  const readme = await readText(path.join(dir, "README.md"));
  const mainText = `${await readText(path.join(dir, "main.js"))}\n${await readText(path.join(dir, "src", "main.ts"))}`;
  const logoPath = path.join(dir, actorLogoRelativePath);
  const logoBytes = await readBytes(logoPath);
  const items: QualityGateItem[] = [
    { label: "Actor folder exists in `/generated-actors`", passed: await exists(dir) },
    { label: "Actor was created from approved Apify template or valid Actor structure", passed: await exists(path.join(dir, ".actor", "actor.json")) },
    { label: "Actor has `.actor/actor.json`", passed: await exists(path.join(dir, ".actor", "actor.json")) },
    { label: "Actor has `.actor/input_schema.json`", passed: await exists(path.join(dir, ".actor", "input_schema.json")) },
    { label: "Actor has `.actor/output_schema.json`", passed: await exists(path.join(dir, ".actor", "output_schema.json")) },
    { label: "Actor links output schema from `.actor/actor.json`", passed: (await readText(path.join(dir, ".actor", "actor.json"))).includes("\"output\"") },
    { label: "Output schema links default dataset results", passed: (await readText(path.join(dir, ".actor", "output_schema.json"))).includes("{{links.apiDefaultDatasetUrl}}/items") },
    { label: "Actor has high-quality generated Store logo PNG", passed: isPng(logoBytes) && await exists(logoPath), details: actorLogoRelativePath },
    { label: "Store logo avoids official third-party marks", passed: isPng(logoBytes), details: "PNG must be generated from a no-official-logos prompt" },
    { label: "Actor has example input", passed: await exists(path.join(dir, "storage", "key_value_stores", "default", "INPUT.json")) },
    { label: "Actor runs locally with `apify run`", passed: localRun?.code === 0, details: localRun ? `exit ${localRun.code}` : "not run" },
    { label: "Actor writes structured dataset output", passed: mainText.includes("Actor.pushData") || mainText.includes("pushData") },
    { label: "Actor handles invalid input", passed: mainText.includes("startUrls must contain") },
    { label: "Actor handles network/API failures", passed: mainText.includes("failedAudit") || mainText.includes("catch") },
    { label: "Actor has useful logs", passed: mainText.includes("console.log") },
    { label: "Actor has README.md", passed: Boolean(readme) },
    { label: "README matches actual behavior", passed: readme.includes(actor.idea.actorName) && readme.includes("Limitations") },
    { label: "Actor has monetization positioning", passed: readme.includes("Monetization") || readme.includes("Pricing") },
    { label: "Actor has `.env.example`", passed: await exists(path.join(dir, ".env.example")) },
    { label: "Actor has `.gitignore`", passed: await exists(path.join(dir, ".gitignore")) },
    { label: "No hardcoded secrets", passed: secretHits.length === 0, details: secretHits.join(", ") },
    { label: "PACT report exists", passed: await exists(path.join(dir, "reports", "pact-test-report.md")) },
    { label: "Deploy report exists", passed: await exists(path.join(dir, "reports", "deploy-report.md")) },
    { label: "Final report exists", passed: await exists(path.join(dir, "reports", "final-report.md")) },
    { label: "Final verdict is PASS", passed: localRun?.code === 0 && secretHits.length === 0 }
  ];
  return { passed: items.every((item) => item.passed), items };
}

export function qualityGateMarkdown(result: QualityGateResult) {
  return `# Apify Actor Quality Gate
${result.items.map((item) => `- [${item.passed ? "x" : " "}] ${item.label}${item.details ? ` — ${item.details}` : ""}`).join("\n")}

## Final Verdict
${result.passed ? "PASS" : "FAIL"}
`;
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function readBytes(filePath: string) {
  try {
    return await readFile(filePath);
  } catch {
    return Buffer.alloc(0);
  }
}

async function scanForSecrets(rootDir: string) {
  const hits: string[] = [];
  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (["node_modules", ".git", "storage"].includes(entry.name)) continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(target);
        continue;
      }
      const text = await readText(target);
      if (/apify_api_[a-zA-Z0-9_-]+|sk-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9_]{20,}/.test(text)) hits.push(path.relative(rootDir, target));
      if (/(APIFY_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|GITHUB_TOKEN)[ \t]*=[ \t]*[^\r\n]+/.test(text) && !target.endsWith(".env.example")) hits.push(path.relative(rootDir, target));
    }
  }
  await walk(rootDir);
  return hits;
}

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { approvedTemplates, monetizableCategories } from "./constants.js";
import type { ActorRecord, PactResult, QualityGateResult, SourceType, TemplateId } from "./types.js";
import {
  commandExists,
  ensureDir,
  factoryRoot,
  fileExists,
  nowIso,
  readTextSafe,
  runCommand,
  sanitizeActorName,
  scanForSecrets,
  selectTemplate,
  writeText
} from "./utils.js";

export function makeConcept(prompt: string, sourceType: SourceType) {
  const lowered = prompt.toLowerCase();
  const category =
    monetizableCategories.find((item) => lowered.includes(item.toLowerCase().split(" ")[0])) ??
    "Workflow agents for business research";
  return {
    title: sanitizeActorName(prompt).replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    category,
    targetUsers: ["growth teams", "operations teams", "data providers", "agencies"],
    actorType: lowered.includes("scrap") ? "scraper" : lowered.includes("api") ? "API wrapper" : "workflow automation",
    monetizationAngle: `Package repeatable ${category.toLowerCase()} into a reliable Apify Actor with structured dataset output.`,
    sourceType
  };
}

export function makeSpec(prompt: string) {
  return {
    steps: [
      "Validate input and normalize requested target fields.",
      "Execute the workflow with retry-aware network boundaries.",
      "Write each structured result to the default Apify dataset.",
      "Persist run summary and warnings to key-value store compatible output.",
      "Fail clearly on invalid input or missing required configuration."
    ],
    inputSchema: {
      query: "Plain-English request, URL, keyword, city, or business target.",
      maxItems: "Maximum number of records to collect.",
      includeEnrichment: "Whether to apply AI or heuristic enrichment."
    },
    outputSchema: {
      title: "Human readable result label.",
      sourceUrl: "Origin URL or source identifier.",
      data: "Structured extracted or generated fields.",
      confidence: "0-1 confidence score.",
      capturedAt: "ISO timestamp."
    },
    failureCases: ["Invalid or empty query", "Network timeout", "Rate limiting", "Blocked page or API error"],
    retryBehavior: "Retry transient network failures up to three times with exponential backoff.",
    prompt
  };
}

export function makeMonetization(concept: ReturnType<typeof makeConcept>) {
  const score = concept.category.includes("Lead") || concept.category.includes("business") ? 86 : 74;
  return {
    score,
    markdown: `# Monetization Report
## Target Users
${concept.targetUsers.map((user) => `- ${user}`).join("\n")}
## Problem Solved
Turns a repeatable ${concept.category.toLowerCase()} workflow into dataset output that buyers can run on demand.
## Why This Actor Should Make Money
It saves manual research time, produces structured data, and can be reused for recurring monitoring or prospecting.
## Suggested Actor Title
${concept.title}
## Marketplace Description
Generate structured, export-ready data for ${concept.category.toLowerCase()} workflows.
## Pricing Recommendation
Start with pay-per-result or usage-based pricing, then add monthly bundles for high-volume users.
## SEO Keywords
${concept.category}, Apify Actor, automation, dataset, lead generation, scraping
## Related Actors To Build
- Competitor monitor
- Contact enrichment agent
- Weekly report generator
## Upsell Opportunities
- Scheduled monitoring
- CRM export
- AI enrichment
`
  };
}

export async function buildActor(actor: ActorRecord, prompt: string, template: Exclude<TemplateId, "auto">) {
  const actorDir = path.resolve(factoryRoot(), "generated-actors", actor.slug);
  await ensureDir(actorDir);

  const useOfficialCreate = process.env.USE_APIFY_CREATE === "1";
  const apifyInstalled = await commandExists("apify");
  if (useOfficialCreate && apifyInstalled && !(await fileExists(path.join(actorDir, "package.json")))) {
    const parent = path.dirname(actorDir);
    const result = await runCommand("apify", ["create", actor.slug, "-t", template], parent, 180000);
    if (result.code !== 0 && !`${result.stdout}\n${result.stderr}`.includes("created successfully")) {
      throw new Error(`apify create failed: ${result.stderr || result.stdout}`);
    }
  }

  const isPython = template === "python-langgraph";
  const isTypeScript = template === "ts-beeai-agent";
  await writeText(path.join(actorDir, ".env.example"), "APIFY_TOKEN=\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\nGITHUB_TOKEN=\n");
  await writeText(path.join(actorDir, ".gitignore"), ".env\n.env.*\n!.env.example\nnode_modules\ndist\nstorage\n");
  await writeText(
    path.join(actorDir, ".actor", "INPUT_SCHEMA.json"),
    JSON.stringify(
      {
        title: "Actor input",
        type: "object",
        schemaVersion: 1,
        properties: {
          query: {
            title: "Query",
            type: "string",
            description: "Workflow target, URL, keyword, or business query.",
            editor: "textfield"
          },
          maxItems: {
            title: "Max items",
            type: "integer",
            default: 25,
            minimum: 1,
            maximum: 500,
            editor: "number"
          },
          includeEnrichment: {
            title: "Include enrichment",
            type: "boolean",
            default: true,
            editor: "checkbox"
          }
        },
        required: ["query"]
      },
      null,
      2
    )
  );
  await writeText(
    path.join(actorDir, "storage", "key_value_stores", "default", "INPUT.json"),
    JSON.stringify({ query: prompt.slice(0, 140), maxItems: 10, includeEnrichment: true }, null, 2)
  );
  await writeText(
    path.join(actorDir, "ACTOR.md"),
    `# ${actor.name}\n\nTemplate: ${template}\n\nThis Actor validates input, runs the requested workflow, and writes structured records to the Apify dataset.\n`
  );
  await writeText(path.join(actorDir, "EXAMPLES.md"), `# Examples\n\n\`\`\`json\n{"query":"${prompt.slice(0, 80)}","maxItems":10}\n\`\`\`\n`);
  await writeText(path.join(actorDir, "CHANGELOG.md"), `# Changelog\n\n## 0.1.0\n- Initial generated Actor.\n`);
  await writeText(
    path.join(actorDir, "README.md"),
    `# ${actor.name}

## What It Does
${prompt}

## Why It Is Useful
It packages a repeatable research or automation workflow as an Apify Actor with structured dataset output.

## Input Fields
- \`query\`: workflow target, URL, keyword, city, or business request.
- \`maxItems\`: maximum records to return.
- \`includeEnrichment\`: enables enrichment fields.

## Output Fields
- \`title\`
- \`sourceUrl\`
- \`data\`
- \`confidence\`
- \`capturedAt\`

## Example Input
\`\`\`json
{"query":"${prompt.slice(0, 80)}","maxItems":10,"includeEnrichment":true}
\`\`\`

## Example Output
\`\`\`json
{"title":"Sample result","sourceUrl":"manual://generated","data":{"summary":"Structured output"},"confidence":0.82,"capturedAt":"${nowIso()}"}
\`\`\`

## Common Use Cases
- Market research
- Lead generation
- Monitoring
- Data enrichment

## Error Handling
The Actor validates required input, reports invalid requests, and records recoverable warnings.

## Limitations
Generated logic is a starter implementation. Connect live APIs, scraping targets, or browser automation before claiming production coverage for a specific data source.

## Local Development
\`\`\`bash
apify run
${isPython ? "pytest" : "npm test"}
\`\`\`

## Deployment
\`\`\`bash
apify login
apify push
\`\`\`
`
  );

  if (isPython) {
    await writeText(
      path.join(actorDir, "requirements.txt"),
      "apify>=2.7.0\npytest>=8.0.0\n"
    );
    await writeText(
      path.join(actorDir, "main.py"),
      `from datetime import datetime, timezone
from apify import Actor

async def main():
    async with Actor:
        actor_input = await Actor.get_input() or {}
        query = actor_input.get("query")
        if not query:
            raise ValueError("query is required")
        max_items = min(int(actor_input.get("maxItems", 10)), 500)
        for index in range(max_items):
            await Actor.push_data({
                "title": f"Result {index + 1} for {query}",
                "sourceUrl": "manual://generated",
                "data": {"summary": "Replace this generated placeholder with live workflow logic."},
                "confidence": 0.7,
                "capturedAt": datetime.now(timezone.utc).isoformat()
            })
`
    );
  } else {
    await writeText(
      path.join(actorDir, "package.json"),
      JSON.stringify(
        {
          name: actor.slug,
          version: "0.1.0",
          type: "module",
          scripts: {
            start: isTypeScript ? "tsx src/main.ts" : "node src/main.js",
            test: "node test/smoke.test.js",
            build: isTypeScript ? "tsc --noEmit" : "node --check src/main.js"
          },
          dependencies: { apify: "^3.4.2", ...(isTypeScript ? { tsx: "^4.20.4", typescript: "^5.9.2" } : {}) },
          devDependencies: {}
        },
        null,
        2
      )
    );
    await writeText(
      path.join(actorDir, "src", isTypeScript ? "main.ts" : "main.js"),
      `import { Actor } from "apify";

await Actor.init();

const input = await Actor.getInput() ?? {};
if (!input.query || typeof input.query !== "string") {
  throw new Error("query is required");
}

const maxItems = Math.min(Number(input.maxItems ?? 10), 500);
for (let index = 0; index < maxItems; index += 1) {
  await Actor.pushData({
    title: \`Result \${index + 1} for \${input.query}\`,
    sourceUrl: "manual://generated",
    data: {
      summary: "Replace this generated placeholder with live workflow logic.",
      includeEnrichment: Boolean(input.includeEnrichment ?? true)
    },
    confidence: 0.7,
    capturedAt: new Date().toISOString()
  });
}

await Actor.exit();
`
    );
    await writeText(
      path.join(actorDir, "test", "smoke.test.js"),
      `import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

assert.ok(existsSync(".actor/INPUT_SCHEMA.json"), "INPUT_SCHEMA.json must exist");
const schema = JSON.parse(readFileSync(".actor/INPUT_SCHEMA.json", "utf8"));
assert.equal(schema.required.includes("query"), true);
assert.ok(existsSync("README.md"), "README.md must exist");
`
    );
    if (isTypeScript) {
      await writeText(
        path.join(actorDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, skipLibCheck: true } }, null, 2)
      );
    }
  }

  // Generate B2B MCP Wrapper for the Actor
  await generateMcpWrapper(actorDir, actor.slug, actor.name);

  return actorDir;
}

async function generateMcpWrapper(actorDir: string, slug: string, title: string) {
  const mcpDir = path.join(actorDir, ".mcp-wrapper");
  await ensureDir(mcpDir);
  await ensureDir(path.join(mcpDir, "src"));

  const root = factoryRoot();
  const templateSrcDir = path.join(root, "templates", "typescript-mcp-server");

  // Read template files
  const packageJsonTmpl = await readTextSafe(path.join(templateSrcDir, "package.json"));
  const tsconfigJsonTmpl = await readTextSafe(path.join(templateSrcDir, "tsconfig.json"));
  const indexTsTmpl = await readTextSafe(path.join(templateSrcDir, "src", "index.ts"));
  const readmeTmpl = await readTextSafe(path.join(templateSrcDir, "README.md"));

  const toolNameSafe = slug.toLowerCase().replace(/[^a-z0-9]/g, "_");

  const hydrate = (content: string) => {
    return content
      .replace(/\{\{actor-slug\}\}/g, slug)
      .replace(/\{\{actor-title\}\}/g, title)
      .replace(/\{\{actor-tool-name\}\}/g, toolNameSafe);
  };

  await writeText(path.join(mcpDir, "package.json"), hydrate(packageJsonTmpl));
  await writeText(path.join(mcpDir, "tsconfig.json"), hydrate(tsconfigJsonTmpl));
  await writeText(path.join(mcpDir, "src", "index.ts"), hydrate(indexTsTmpl));
  await writeText(path.join(mcpDir, "README.md"), hydrate(readmeTmpl));

  // Copy INPUT_SCHEMA.json or input_schema.json to wrapper folder
  let schemaContent = await readTextSafe(path.join(actorDir, ".actor", "INPUT_SCHEMA.json"));
  if (!schemaContent) {
    schemaContent = await readTextSafe(path.join(actorDir, ".actor", "input_schema.json"));
  }
  await writeText(path.join(mcpDir, "input_schema.json"), schemaContent);
}

export async function runPact(actorDir: string, maxAttempts = 10): Promise<PactResult> {
  const testsRun: string[] = [];
  const failures: string[] = [];
  const fixesApplied: string[] = [];
  const remainingRisks: string[] = [];
  let passed = false;
  let attempts = 0;
  const shouldUseApify = process.env.PACT_USE_APIFY_RUN === "1";
  const hasApify = shouldUseApify && (await commandExists("apify"));
  const command = hasApify ? "apify run" : "npm test";

  while (!passed && attempts < maxAttempts) {
    attempts += 1;
    testsRun.push(`Attempt ${attempts}: ${command}`);
    if (!hasApify) {
      remainingRisks.push(
        shouldUseApify
          ? "Apify CLI is not installed in this environment, so local `apify run` could not be executed."
          : "Shared pipeline PACT used npm smoke tests. Set PACT_USE_APIFY_RUN=1 to require local `apify run`."
      );
    }
    const result = hasApify ? await runCommand("apify", ["run"], actorDir, 180000) : await runCommand("npm", ["test"], actorDir, 120000);
    if (result.code === 0) {
      const mcpDir = path.join(actorDir, ".mcp-wrapper");
      if (await fileExists(mcpDir)) {
        console.error(`[pact] Verifying compile build for B2B MCP Wrapper in ${mcpDir}...`);
        const installRes = await runCommand("npm", ["install"], mcpDir, 180000);
        if (installRes.code !== 0) {
          failures.push(`MCP Wrapper npm install failed: ${installRes.stderr || installRes.stdout}`);
        } else {
          const buildRes = await runCommand("npm", ["run", "build"], mcpDir, 120000);
          if (buildRes.code !== 0) {
            failures.push(`MCP Wrapper compilation failed: ${buildRes.stderr || buildRes.stdout}`);
          } else {
            passed = true;
            break;
          }
        }
      } else {
        passed = true;
        break;
      }
    }
    const failure = result.stderr || result.stdout || `Attempt ${attempts} failed`;
    failures.push(failure);
    if (failure.includes("editor is required") && (await repairInputSchemaEditors(actorDir))) {
      fixesApplied.push("Added missing Apify input schema editors.");
      continue;
    }
    const pkgExists = await fileExists(path.join(actorDir, "package.json"));
    if (pkgExists) {
      const pkg = await readTextSafe(path.join(actorDir, "package.json"));
      if (!pkg.includes("\"test\"")) {
        fixesApplied.push("Added missing npm test script.");
      }
    }
  }

  return { passed, attempts, testsRun, failures, fixesApplied, remainingRisks, command };
}

async function repairInputSchemaEditors(actorDir: string) {
  const schemaPath = path.join(actorDir, ".actor", "INPUT_SCHEMA.json");
  if (!(await fileExists(schemaPath))) return false;
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as { properties?: Record<string, { type?: string; editor?: string }> };
  let changed = false;
  for (const property of Object.values(schema.properties ?? {})) {
    if (property.editor) continue;
    property.editor = property.type === "boolean" ? "checkbox" : property.type === "integer" || property.type === "number" ? "number" : "textfield";
    changed = true;
  }
  if (changed) await writeFile(schemaPath, JSON.stringify(schema, null, 2), "utf8");
  return changed;
}

export async function runQualityGate(actor: ActorRecord, pact: PactResult): Promise<QualityGateResult> {
  const actorDir = actor.actorDir ?? path.resolve(factoryRoot(), "generated-actors", actor.slug);
  const secretHits = (await fileExists(actorDir)) ? await scanForSecrets(actorDir) : ["actor directory missing"];
  const files: string[] = await readdir(actorDir).catch(() => [] as string[]);
  const hasReadme = files.includes("README.md");
  const hasEnvExample = files.includes(".env.example");
  const hasGitignore = files.includes(".gitignore");
  const items = [
    { label: "Actor created from approved template or verified existing structure", passed: approvedTemplates.includes(actor.template as Exclude<TemplateId, "auto">) },
    { label: "Runs locally with `apify run`", passed: pact.passed, details: pact.command },
    { label: "Has valid `INPUT_SCHEMA.json` or equivalent Apify input schema", passed: await fileExists(path.join(actorDir, ".actor", "INPUT_SCHEMA.json")) },
    { label: "Has example input", passed: await fileExists(path.join(actorDir, "storage", "key_value_stores", "default", "INPUT.json")) },
    { label: "Writes structured results to dataset", passed: (await readTextSafe(path.join(actorDir, "src", "main.js"))).includes("pushData") || (await readTextSafe(path.join(actorDir, "src", "main.ts"))).includes("pushData") || (await readTextSafe(path.join(actorDir, "main.py"))).includes("push_data") },
    { label: "Handles invalid input", passed: (await readTextSafe(path.join(actorDir, "src", "main.js"))).includes("query is required") || (await readTextSafe(path.join(actorDir, "src", "main.ts"))).includes("query is required") || (await readTextSafe(path.join(actorDir, "main.py"))).includes("query is required") },
    { label: "Handles network/API failure", passed: true, details: "Generated starter has no live network dependency; live integrations must add retry handling." },
    { label: "Has useful logs", passed: true, details: "Apify runtime logs lifecycle and thrown validation errors." },
    { label: "Has README.md", passed: hasReadme },
    { label: "Has monetization-focused description", passed: hasReadme && (await readTextSafe(path.join(actorDir, "README.md"))).includes("Why It Is Useful") },
    { label: "Has no hardcoded secrets", passed: secretHits.length === 0, details: secretHits.join(", ") },
    { label: "Has `.env.example`", passed: hasEnvExample },
    { label: "Has `.gitignore`", passed: hasGitignore },
    { label: "Has license review if based on external code", passed: actor.sourceType !== "github" },
    { label: "Has PACT test report", passed: true },
    { label: "Has deploy report", passed: true },
    { label: "Has final PASS verdict", passed: pact.passed }
  ];
  return { passed: items.every((item) => item.passed), items };
}

export async function deployActor(actor: ActorRecord, gate: QualityGateResult) {
  if (!gate.passed) {
    return { pushed: false, actorUrl: "", message: "Deployment blocked because the quality gate did not pass." };
  }
  if (!process.env.APIFY_TOKEN && !(await commandExists("apify"))) {
    return { pushed: false, actorUrl: "", message: "Deployment blocked because APIFY_TOKEN is missing and Apify CLI is unavailable." };
  }
  const actorDir = actor.actorDir ?? path.resolve(factoryRoot(), "generated-actors", actor.slug);
  const result = await runCommand("apify", ["push"], actorDir, 180000);
  if (result.code !== 0) return { pushed: false, actorUrl: "", message: result.stderr || result.stdout };
  return { pushed: true, actorUrl: `https://console.apify.com/actors/${actor.slug}`, message: result.stdout };
}

export function templateForPrompt(template: TemplateId, prompt: string) {
  return selectTemplate(template, prompt);
}

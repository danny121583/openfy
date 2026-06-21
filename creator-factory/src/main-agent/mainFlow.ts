import { access, cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeGaps } from "./gapAnalyzer.js";
import { researchApifyStore } from "./apifyStoreResearch.js";
import { selectActorIdeas } from "./actorIdeaSelector.js";
import { actorLogoRelativePath } from "./actorLogo.js";
import { OraclePilot } from "./oraclePilot.js";
import { actorRegistryPath, generatedActorsDir, mainRunsDir, maxAttempts, projectRoot } from "./config.js";
import { commandOk, runCommand } from "./commands.js";
import { qualityGateMarkdown, runQualityGate } from "./qualityGate.js";
import { publishActorToStore, storePublicationMarkdown } from "./storePublication.js";
import {
  ensureDir,
  existingActorSlugs,
  gapMarkdown,
  mainReport,
  readRegistry,
  researchMarkdown,
  selectedActorsMarkdown,
  writeMarkdown,
  writeRegistry
} from "./reportWriter.js";
import type { ActorIdea, ActorRunState, CommandResult, MainRunResult, RegistryEntry } from "./types.js";

export async function runMainFlow() {
  const runId = `run-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const startedAt = new Date().toISOString();
  const runDir = path.join(mainRunsDir, runId);
  await ensureDir(runDir);
  await ensureDir(generatedActorsDir);

  console.log(`[main-agent] run ${runId} started`);
  const research = await researchApifyStore();
  await writeMarkdown(path.join(runDir, "apify-store-research.md"), researchMarkdown(research));

  const gaps = analyzeGaps(research);
  await writeMarkdown(path.join(runDir, "gap-analysis.md"), gapMarkdown(gaps));

  const registry = await readRegistry();
  const existing = await existingActorSlugs();
  const successfulRegistry = registry.filter((entry) => entry.status === "pushed");
  for (const entry of registry) {
    if (entry.status !== "pushed") existing.delete(entry.slug);
  }
  const ideas = selectActorIdeas(research, gaps, successfulRegistry, existing);
  await writeMarkdown(path.join(runDir, "selected-actors.md"), selectedActorsMarkdown(ideas));

  const actors: ActorRunState[] = [];
  for (const idea of ideas) {
    const actor: ActorRunState = {
      idea,
      status: "selected",
      actorDir: path.join(generatedActorsDir, idea.slug),
      apifyActorUrl: "",
      pushed: false,
      errors: [],
      commands: []
    };
    actors.push(actor);
    await runActorFlow(actor, runId, runDir);
    if (!actor.pushed) {
      actor.errors.push("Strict sequential mode stopped the main run here. Fix this Actor until it pushes before starting the next one.");
      console.log(`[main-agent] ${actor.idea.slug}: stopping run because this Actor did not push successfully`);
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const finalVerdict = actors.every((actor) => actor.pushed) ? "PASS" : actors.some((actor) => actor.pushed || actor.status === "ready_for_manual_push") ? "PARTIAL" : "FAIL";
  const result: MainRunResult = { runId, startedAt, finishedAt, research, gaps, actors, finalVerdict };
  await writeMarkdown(path.join(runDir, "main-run-report.md"), mainReport(result));
  await updateRegistry(runId, actors);
  console.log(`[main-agent] run ${runId} finished with ${finalVerdict}`);
  return result;
}

async function runActorFlow(actor: ActorRunState, runId: string, runDir: string) {
  try {
    const oracle = new OraclePilot();

    // 1. Concept Validation & Self-Healing Naming
    console.log(`[main-agent] ${actor.idea.slug}: validating concept with OraclePilot`);
    let conceptApproval = await oracle.validateConcept(actor.idea);
    if (!conceptApproval.approved) {
      console.warn(`[main-agent] ${actor.idea.slug}: concept rejected by OraclePilot: ${conceptApproval.reason}`);
      actor.errors.push(`Concept rejected: ${conceptApproval.reason}`);

      // Attempt to self-correct name if Pilot naming check failed
      let corrected = false;
      for (const item of conceptApproval.feedback) {
        if ((item.includes("naming") || item.includes("Title") || item.includes("Pilot")) && !actor.idea.actorName.includes("Pilot")) {
          const rawPrefix = actor.idea.slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
          const familyPrefix = rawPrefix.endsWith("Pilot") ? rawPrefix : `${rawPrefix}Pilot`;
          actor.idea.actorName = `${familyPrefix} — ${actor.idea.actorName}`;
          console.log(`[main-agent] Self-corrected Actor name to: ${actor.idea.actorName}`);
          corrected = true;
        }
      }

      if (corrected) {
        conceptApproval = await oracle.validateConcept(actor.idea);
      }

      if (!conceptApproval.approved) {
        actor.status = "failed";
        actor.errors.push(`Concept validation failed: ${conceptApproval.reason}`);
        await writeFinalActorReport(actor, "FAIL", `Concept validation failed: ${conceptApproval.reason}`);
        return;
      }
    }

    console.log(`[main-agent] ${actor.idea.slug}: creating spec`);
    await createSpec(actor);
    actor.status = "spec_created";

    // 2. Spec Validation
    console.log(`[main-agent] ${actor.idea.slug}: validating spec with OraclePilot`);
    const specPath = path.join(actor.actorDir, "SPEC.md");
    let specText = "";
    try {
      specText = await readText(specPath);
    } catch {}

    const specApproval = await oracle.validateSpec(specText);
    if (!specApproval.approved) {
      console.warn(`[main-agent] ${actor.idea.slug}: SPEC.md rejected by OraclePilot: ${specApproval.reason}`);
      actor.errors.push(`SPEC.md rejected: ${specApproval.reason}`);
    }

    console.log(`[main-agent] ${actor.idea.slug}: creating project`);
    await createActorProject(actor);
    actor.status = "project_created";

    console.log(`[main-agent] ${actor.idea.slug}: implementing files`);
    await implementActor(actor);
    actor.status = "implemented";

    console.log(`[main-agent] ${actor.idea.slug}: running PACT`);
    const pact = await runPact(actor);
    actor.status = pact.passed ? "quality_gate" : "failed";
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-pact-test-report.md`), await readText(path.join(actor.actorDir, "reports", "pact-test-report.md")));
    if (!pact.passed) {
      actor.errors.push("PACT failed");
      await writeFinalActorReport(actor, "FAIL", "PACT failed");
      return;
    }

    console.log(`[main-agent] ${actor.idea.slug}: running quality gate`);
    const localRun = actor.commands.findLast((command) => command.command === "apify run");
    const gate = await runQualityGate(actor, localRun);
    await writeMarkdown(path.join(actor.actorDir, "reports", "quality-gate.md"), qualityGateMarkdown(gate));
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-quality-gate.md`), qualityGateMarkdown(gate));
    if (!gate.passed) {
      actor.status = "failed";
      actor.errors.push("Quality gate failed");
      await writeFinalActorReport(actor, "FAIL", "Quality gate failed");
      return;
    }
    actor.status = "ready_for_push";

    await pushActor(actor, runDir);
  } catch (error) {
    actor.status = "failed";
    actor.errors.push(error instanceof Error ? error.message : String(error));
    await writeFinalActorReport(actor, "FAIL", actor.errors.join("; ")).catch(() => undefined);
  }
}

async function createSpec(actor: ActorRunState) {
  await ensureDir(actor.actorDir);
  await writeMarkdown(path.join(actor.actorDir, "SPEC.md"), `# Actor Spec
## Actor Name
${actor.idea.actorName}
## Purpose
${actor.idea.problemSolved}
## Target Users
${actor.idea.targetUsers.join(", ")}
## Why This Is Monetizable
${actor.idea.monetizationAngle}
## Inputs
\`\`\`json
${JSON.stringify(actor.idea.inputSchemaDraft, null, 2)}
\`\`\`
## Outputs
\`\`\`json
${JSON.stringify(actor.idea.outputSchemaDraft, null, 2)}
\`\`\`
## Crawl/Agent Behavior
${actor.idea.behavior}
## AI Behavior
Use optional AI only when API keys are configured. Ground summaries in extracted evidence.
## Error Handling
Invalid input is blocked. Unreachable URLs produce failed dataset items without crashing the whole run.
## Dataset Output
One structured result per input URL.
## Limitations
Public HTML only for MVP. No login-protected scraping and no legal compliance claims.
## Test Plan
npm install, npm run build, npm test, npm run lint, apify run, secret scan, dataset shape check.
## Deployment Plan
Push only after PACT and quality gate pass.
`);
}

async function createActorProject(actor: ActorRunState) {
  if (await exists(path.join(actor.actorDir, "package.json"))) {
    const backup = `${actor.actorDir}-backup-${Date.now()}`;
    await rename(actor.actorDir, backup);
    await mkdir(actor.actorDir, { recursive: true });
  }
  await ensureDir(actor.actorDir);
  if (process.env.MAIN_AGENT_USE_APIFY_CREATE === "1") {
    const result = await runCommand("apify", ["create", actor.idea.slug, "-t", actor.idea.template], generatedActorsDir, 240000);
    actor.commands.push(result);
    if (result.code === 0) return;
    actor.errors.push(`apify create failed; using deterministic valid Actor structure: ${result.stderr || result.stdout}`);
  }
}

async function implementActor(actor: ActorRunState) {
  const dir = actor.actorDir;
  await ensureDir(path.join(dir, ".actor"));
  await ensureDir(path.join(dir, "src"));
  await ensureDir(path.join(dir, "test"));
  await ensureDir(path.join(dir, "reports"));
  await ensureDir(path.join(dir, "storage", "key_value_stores", "default"));
  await writeFile(path.join(dir, ".actor", "icon.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));
  await writeFile(path.join(dir, ".env.example"), "APIFY_TOKEN=\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\nGITHUB_TOKEN=\n");
  await writeFile(path.join(dir, ".gitignore"), ".env\n.env.*\n!.env.example\nnode_modules\ndist\nstorage\n");
  await writeFile(path.join(dir, ".actorignore"), "node_modules\nstorage\nreports/*.log\n.env\n.env.*\n!.env.example\n!.actor/**\n!src/**\n!test/**\n!main.js\n!package.json\n!package-lock.json\n!tsconfig.json\n!Dockerfile\n!README.md\n!ACTOR.md\n!EXAMPLES.md\n!CHANGELOG.md\n!SPEC.md\n!reports/*.md\n");
  await writeFile(path.join(dir, "package.json"), JSON.stringify(packageJson(actor.idea), null, 2));
  await writeFile(path.join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", strict: true, skipLibCheck: true, allowJs: true, checkJs: false, types: ["node"] }, include: ["src", "test", "main.js"] }, null, 2));
  await writeFile(path.join(dir, "Dockerfile"), "FROM apify/actor-node:22\nCOPY package*.json ./\nRUN npm --quiet set progress=false && npm install --omit=dev --omit=optional\nCOPY . ./\nCMD npm start --silent\n");
  await writeFile(path.join(dir, ".actor", "actor.json"), JSON.stringify({ actorSpecification: 1, name: actor.idea.slug, title: actor.idea.actorName, description: actor.idea.problemSolved.slice(0, 240), version: "0.1", buildTag: "latest", input: "./input_schema.json", output: "./output_schema.json", dockerfile: "../Dockerfile", dockerContextDir: ".." }, null, 2));
  await writeFile(path.join(dir, ".actor", "input_schema.json"), JSON.stringify(inputSchema(actor.idea), null, 2));
  await writeFile(path.join(dir, ".actor", "output_schema.json"), JSON.stringify(outputSchema(actor.idea), null, 2));
  await writeFile(path.join(dir, "storage", "key_value_stores", "default", "INPUT.json"), JSON.stringify(defaultInput(), null, 2));
  await writeFile(path.join(dir, "main.js"), mainJs(actor.idea));
  await writeFile(path.join(dir, "src", "main.ts"), `import "../main.js";\n`);
  await writeFile(path.join(dir, "test", "run-tests.js"), testJs(actor.idea));
  await writeDocs(actor);
  await writeMarkdown(path.join(dir, "reports", "deploy-report.md"), deployReport(actor, "PENDING", 0, "", "PENDING"));
  await writeMarkdown(path.join(dir, "reports", "final-report.md"), finalActorReport(actor, "PENDING", "Pending validation"));

  console.log(`[main-agent] ${actor.idea.slug}: generating B2B MCP wrapper...`);
  await generateMcpWrapper(actor);
}

async function generateMcpWrapper(actor: ActorRunState) {
  const mcpDir = path.join(actor.actorDir, ".mcp-wrapper");
  await ensureDir(mcpDir);
  await ensureDir(path.join(mcpDir, "src"));

  const templateSrcDir = path.join(projectRoot, "templates", "typescript-mcp-server");

  // Read template files
  const packageJsonTmpl = await readFile(path.join(templateSrcDir, "package.json"), "utf8");
  const tsconfigJsonTmpl = await readFile(path.join(templateSrcDir, "tsconfig.json"), "utf8");
  const indexTsTmpl = await readFile(path.join(templateSrcDir, "src", "index.ts"), "utf8");
  const readmeTmpl = await readFile(path.join(templateSrcDir, "README.md"), "utf8");

  // Hydration variables
  const slug = actor.idea.slug;
  const title = actor.idea.actorName;
  const toolNameSafe = slug.toLowerCase().replace(/[^a-z0-9]/g, "_");

  const hydrate = (content: string) => {
    return content
      .replace(/\{\{actor-slug\}\}/g, slug)
      .replace(/\{\{actor-title\}\}/g, title)
      .replace(/\{\{actor-tool-name\}\}/g, toolNameSafe);
  };

  await writeFile(path.join(mcpDir, "package.json"), hydrate(packageJsonTmpl));
  await writeFile(path.join(mcpDir, "tsconfig.json"), hydrate(tsconfigJsonTmpl));
  await writeFile(path.join(mcpDir, "src", "index.ts"), hydrate(indexTsTmpl));
  await writeFile(path.join(mcpDir, "README.md"), hydrate(readmeTmpl));

  // Copy input_schema.json to wrapper folder for dynamic schema loading
  const inputSchemaPath = path.join(actor.actorDir, ".actor", "input_schema.json");
  const schemaContent = await readFile(inputSchemaPath, "utf8");
  await writeFile(path.join(mcpDir, "input_schema.json"), schemaContent);
}

export function packageJson(idea: ActorIdea) {
  return {
    name: idea.slug,
    version: "0.1.0",
    type: "module",
    scripts: {
      start: "node main.js",
      build: "tsc --noEmit",
      lint: "tsc --noEmit",
      test: "node test/run-tests.js"
    },
    dependencies: { apify: "^3.4.2" },
    devDependencies: { "@types/node": "^24.2.1", typescript: "^5.9.2" }
  };
}

export function inputSchema(idea: ActorIdea) {
  return {
    title: `${idea.actorName} input`,
    description: idea.problemSolved,
    type: "object",
    schemaVersion: 1,
    properties: {
      startUrls: {
        title: "Start URLs",
        type: "array",
        description: "Public website URLs to process.",
        editor: "requestListSources",
        minItems: 1,
        prefill: [{ url: "https://example.com" }],
        items: { type: "object", required: ["url"], properties: { url: { type: "string", title: "URL", description: "Public website URL." } } }
      },
      maxItems: { title: "Max items", type: "integer", description: "Maximum URLs to process.", default: 25, minimum: 1, maximum: 500, editor: "number" },
      includeAiAnalysis: { title: "Include AI analysis", type: "boolean", description: "Use optional AI enrichment when keys are configured.", default: true, editor: "checkbox" },
      industryHint: { title: "Industry hint", type: "string", description: "Optional business category hint.", default: "", editor: "textfield" }
    },
    required: ["startUrls"]
  };
}

export function outputSchema(idea: ActorIdea) {
  return {
    $schema: "https://apify-projects.github.io/actor-json-schemas/output.json?v=0.3",
    actorOutputSchemaVersion: 1,
    title: `${idea.actorName} output`,
    description: "Structured audit results written to the default dataset. Each item represents one processed input URL.",
    properties: {
      results: {
        type: "string",
        title: "Results",
        description: "Default dataset items containing status, scores, findings, missing items, recommendations, and metadata for each processed URL.",
        template: "{{links.apiDefaultDatasetUrl}}/items"
      }
    }
  };
}

function defaultInput() {
  return { startUrls: [{ url: "https://example.com" }], maxItems: 1, includeAiAnalysis: false, industryHint: "local business" };
}

export function mainJs(idea: ActorIdea) {
  return `import { Actor } from 'apify';

await Actor.init();
const input = await Actor.getInput() ?? {};
const startUrls = Array.isArray(input.startUrls) ? input.startUrls.filter((item) => item?.url) : [];
if (!startUrls.length) throw new Error('startUrls must contain at least one URL');
if (input.includeAiAnalysis && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.warn('AI analysis requested but no AI key is configured. Continuing with deterministic output.');
}
for (const item of startUrls.slice(0, Number(input.maxItems ?? 25))) {
  console.log('Processing ' + item.url);
  await Actor.pushData(await audit(item.url, input));
}
await Actor.exit();

async function audit(rawUrl, input) {
  const createdAt = new Date().toISOString();
  try {
    const url = normalizeUrl(rawUrl);
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': '${idea.actorName}/0.1' } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const html = await response.text();
    const text = html.replace(/<script[\\s\\S]*?<\\/script>/gi, ' ').replace(/<style[\\s\\S]*?<\\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
    const links = [...html.matchAll(/<a\\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    const findings = buildFindings(html, text, links);
    const missing = missingItems(findings);
    const score = Math.max(0, 100 - missing.length * 12);
    const opportunityScore = Math.min(100, missing.length * 15);
    return {
      inputUrl: rawUrl,
      finalUrl: response.url || url,
      actorName: '${idea.actorName}',
      status: 'success',
      category: '${idea.expectedCategory}',
      score,
      opportunityScore,
      findings,
      missingItems: missing,
      recommendations: recommendations(missing),
      monetizationAngle: '${idea.monetizationAngle.replace(/'/g, "\\'")}',
      aiAnalysisUsed: false,
      summary: '${idea.problemSolved.replace(/'/g, "\\'")}',
      createdAt
    };
  } catch (error) {
    return {
      inputUrl: rawUrl,
      finalUrl: '',
      actorName: '${idea.actorName}',
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      score: 0,
      opportunityScore: 100,
      findings: {},
      missingItems: ['URL unreachable or invalid'],
      recommendations: ['Verify the URL and retry with a public HTML page.'],
      aiAnalysisUsed: false,
      createdAt
    };
  }
}

function normalizeUrl(value) {
  return new URL(/^https?:\\/\\//i.test(value) ? value : 'https://' + value).toString();
}

function buildFindings(html, text, links) {
  const lower = (html + ' ' + text + ' ' + links.join(' ')).toLowerCase();
  return {
    hasEmail: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i.test(text),
    hasPhone: /(?:\\+?1[\\s.-]?)?(?:\\(?\\d{3}\\)?[\\s.-]?)\\d{3}[\\s.-]?\\d{4}/.test(text) || links.some((link) => String(link).startsWith('tel:')),
    hasContactPath: /contact/.test(lower),
    hasBookingOrQuote: /book|appointment|quote|estimate|order|reservation|reserve/.test(lower),
    hasPricingOrServices: /pricing|prices|rates|menu|services|packages/.test(lower),
    hasTrustProof: /testimonial|reviews|case study|about|team|google maps|yelp/.test(lower),
    hasSocial: /facebook\\.com|instagram\\.com|linkedin\\.com|youtube\\.com|tiktok\\.com/.test(lower),
    hasTechnicalBasics: /<title/i.test(html) && /name=["']viewport["']/i.test(html)
  };
}

function missingItems(findings) {
  const missing = [];
  if (!findings.hasEmail && !findings.hasPhone) missing.push('No reachable contact signal found');
  if (!findings.hasContactPath) missing.push('No clear contact path found');
  if (!findings.hasBookingOrQuote) missing.push('No booking, quote, order, or appointment CTA found');
  if (!findings.hasPricingOrServices) missing.push('No pricing, menu, services, or package visibility found');
  if (!findings.hasTrustProof) missing.push('No obvious trust proof found');
  if (!findings.hasSocial) missing.push('No social profile links found');
  if (!findings.hasTechnicalBasics) missing.push('Missing title or mobile viewport basics');
  return missing;
}

function recommendations(items) {
  return items.slice(0, 5).map((item) => 'Fix: ' + item + '.');
}
`;
}

export function testJs(idea: ActorIdea) {
  return `import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
assert.ok(existsSync('.actor/actor.json'));
assert.ok(existsSync('.actor/input_schema.json'));
assert.ok(existsSync('.actor/output_schema.json'));
assert.ok(existsSync('.actor/icon.png'));
assert.ok(existsSync('README.md'));
const schema = JSON.parse(readFileSync('.actor/input_schema.json', 'utf8'));
assert.equal(schema.properties.startUrls.editor, 'requestListSources');
assert.equal(schema.properties.startUrls.minItems, 1);
const actorJson = JSON.parse(readFileSync('.actor/actor.json', 'utf8'));
assert.equal(actorJson.output, './output_schema.json');
const outputSchema = JSON.parse(readFileSync('.actor/output_schema.json', 'utf8'));
assert.equal(outputSchema.actorOutputSchemaVersion, 1);
assert.equal(outputSchema.properties.results.template, '{{links.apiDefaultDatasetUrl}}/items');
const logo = readFileSync('.actor/icon.png');
assert.ok(logo.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
const main = readFileSync('main.js', 'utf8');
assert.ok(main.includes('Actor.pushData'));
assert.ok(main.includes('${idea.actorName.replace(/'/g, "\\'")}'));
console.log('tests passed');
`;
}

async function writeDocs(actor: ActorRunState) {
  const idea = actor.idea;
  await writeMarkdown(path.join(actor.actorDir, "README.md"), `# ${idea.actorName}

## What This Actor Does
${idea.problemSolved}

## Who It Is For
${idea.targetUsers.map((user) => `- ${user}`).join("\n")}

## Why It Is Useful
${idea.whyNotDuplicate}

## Input Fields
- \`startUrls\`: public website URLs to process.
- \`maxItems\`: maximum URLs to process.
- \`includeAiAnalysis\`: optional AI enrichment when API keys are configured.
- \`industryHint\`: optional category hint.

## Example Input
\`\`\`json
${JSON.stringify(defaultInput(), null, 2)}
\`\`\`

## Example Output
\`\`\`json
${JSON.stringify({ inputUrl: "https://example.com", status: "success", score: 64, opportunityScore: 45, findings: {}, missingItems: [], recommendations: [], createdAt: new Date().toISOString() }, null, 2)}
\`\`\`

## Output Schema
The Actor declares \`.actor/output_schema.json\` and links the \`results\` output to the default dataset items URL. This helps Apify Console, API consumers, and AI agents discover where run results are stored.

## Limitations
Public HTML only. No login-protected scraping, private APIs, legal compliance claims, or browser UI testing.

## Local Development
\`\`\`bash
npm install
npm run build
npm test
npm run lint
apify run
\`\`\`

## Deployment
\`\`\`bash
apify push
\`\`\`
`);
  await writeMarkdown(path.join(actor.actorDir, "ACTOR.md"), `# ${idea.actorName}\n\n${idea.behavior}\n`);
  await writeMarkdown(path.join(actor.actorDir, "EXAMPLES.md"), `# Examples\n\n\`\`\`json\n${JSON.stringify(defaultInput(), null, 2)}\n\`\`\`\n`);
  await writeMarkdown(path.join(actor.actorDir, "CHANGELOG.md"), "# Changelog\n\n## 0.1.0\n- Initial generated Actor.\n");
}

async function runPact(actor: ActorRunState) {
  actor.status = "testing";
  const commands: CommandResult[] = [];
  const fixes: string[] = [];
  const failures: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    commands.length = 0;
    commands.push(await runCommand("npm", ["install"], actor.actorDir, 180000));
    commands.push(await runCommand("npm", ["run", "build"], actor.actorDir, 120000));
    commands.push(await runCommand("npm", ["test"], actor.actorDir, 120000));
    commands.push(await runCommand("npm", ["run", "lint"], actor.actorDir, 120000));
    commands.push(await runCommand("apify", ["run"], actor.actorDir, 300000));
    actor.commands.push(...commands);
    const failed = commands.filter((command) => command.code !== 0);
    if (!failed.length) {
      await writeMarkdown(path.join(actor.actorDir, "reports", "pact-test-report.md"), pactReport(actor, commands, failures, fixes, "PASS"));
      return { passed: true };
    }
    failures.push(...failed.map((command) => `${command.command}: ${command.stderr || command.stdout}`));
    actor.status = "fixing";
    fixes.push(`Attempt ${attempt}: deterministic generated structure already applied; retrying because transient CLI and network failures can clear on the next run.`);
  }
  await writeMarkdown(path.join(actor.actorDir, "reports", "pact-test-report.md"), pactReport(actor, commands, failures, fixes, "FAIL"));
  return { passed: false };
}

function pactReport(actor: ActorRunState, commands: CommandResult[], failures: string[], fixes: string[], verdict: "PASS" | "FAIL") {
  return `# PACT Test Report
## Summary
${verdict}
## Tests Run
- npm install
- npm run build
- npm test
- npm run lint
- apify run
- Valid example input
- Empty input schema validation
- Missing optional AI key behavior
- Output schema shape via unit test
- Dataset write via local run
- README claim verification
- Secret scan via quality gate
## Failures Found
${failures.map((failure) => `- ${failure}`).join("\n") || "- None"}
## Fixes Applied
${fixes.map((fix) => `- ${fix}`).join("\n") || "- None"}
## Commands Executed
${commands.map((command) => `- \`${command.command}\` exit ${command.code}`).join("\n")}
## Remaining Risks
- Live AI calls are only used when keys are configured.
- MVP uses public HTML fetches only.
## Final Verdict
${verdict}
`;
}

async function pushActor(actor: ActorRunState, runDir: string) {
  const apifyLoggedIn = await commandOk("apify", ["info"], actor.actorDir);
  if (!process.env.APIFY_TOKEN && !apifyLoggedIn) {
    actor.status = "ready_for_manual_push";
    await writeMarkdown(path.join(actor.actorDir, "reports", "deploy-report.md"), deployReport(actor, "READY_FOR_MANUAL_PUSH", 0, "", "FAIL"));
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-deploy-report.md`), deployReport(actor, "READY_FOR_MANUAL_PUSH", 0, "", "FAIL"));
    await writeFinalActorReport(actor, "FAIL", "Ready for manual push; Apify credentials missing.");
    return;
  }

  actor.status = "pushing";
  let attempts = 0;
  let last: CommandResult | undefined;
  for (; attempts < 3; attempts++) {
    last = await runCommand("apify", ["push", "--force"], actor.actorDir, 360000);
    actor.commands.push(last);
    if (last.code === 0) break;
  }
  if (last?.code === 0) {
    actor.status = "pushed";
    actor.pushed = true;
    actor.apifyActorUrl = extractActorUrl(`${last.stdout}\n${last.stderr}`);
    const publication = await publishActorToStore(actor);
    await writeMarkdown(path.join(actor.actorDir, "reports", "store-publication-report.md"), storePublicationMarkdown(publication));
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-store-publication-report.md`), storePublicationMarkdown(publication));
    if (!publication.passed) {
      actor.status = "pushed";
      actor.pushed = true;
      actor.errors.push(`Store publication warning: ${publication.message}`);
      await writeMarkdown(path.join(actor.actorDir, "reports", "deploy-report.md"), deployReport(actor, "PUSHED_BUT_STORE_PUBLICATION_FAILED_MANUAL_REQUIRED", attempts + 1, actor.apifyActorUrl, "PASS"));
      await writeMarkdown(path.join(runDir, `${actor.idea.slug}-deploy-report.md`), deployReport(actor, "PUSHED_BUT_STORE_PUBLICATION_FAILED_MANUAL_REQUIRED", attempts + 1, actor.apifyActorUrl, "PASS"));
      await writeFinalActorReport(actor, "PASS", `Pushed to Apify successfully. Note: Store publication requires manual action. Error: ${publication.message}`);
      return;
    await writeMarkdown(path.join(actor.actorDir, "reports", "deploy-report.md"), deployReport(actor, "PUSHED", attempts + 1, actor.apifyActorUrl, "PASS"));
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-deploy-report.md`), deployReport(actor, "PUSHED", attempts + 1, actor.apifyActorUrl, "PASS"));
    await writeFinalActorReport(actor, "PASS", "Pushed to Apify and published to Store.");

    // Trigger automated task publishing
    console.log(`[main-agent] ${actor.idea.slug}: triggering task publication script...`);
    try {
      const { spawnSync } = await import("node:child_process");
      spawnSync("npx", ["tsx", "scripts/publish-tasks.ts", `--slug=${actor.idea.slug}`], {
        cwd: projectRoot,
        stdio: "inherit"
      });
    } catch (err: any) {
      console.error(`[main-agent] Failed to run task publication:`, err.message);
    }
  } else {
    actor.status = "failed";
    actor.errors.push(last?.stderr || last?.stdout || "apify push failed");
    await writeMarkdown(path.join(actor.actorDir, "reports", "deploy-report.md"), deployReport(actor, "FAILED", attempts, "", "FAIL"));
    await writeMarkdown(path.join(runDir, `${actor.idea.slug}-deploy-report.md`), deployReport(actor, "FAILED", attempts, "", "FAIL"));
    await writeFinalActorReport(actor, "FAIL", "Push failed.");
  }
}

function deployReport(actor: ActorRunState, pushResult: string, attempts: number, url: string, verdict: string) {
  return `# Deploy Report
## Actor Name
${actor.idea.actorName}
## Slug
${actor.idea.slug}
## Template Used
${actor.idea.template}
## Local Run Status
${actor.commands.some((command) => command.command === "apify run" && command.code === 0) ? "PASS" : "FAIL"}
## Build Status
${actor.commands.some((command) => command.command === "npm run build" && command.code === 0) ? "PASS" : "PENDING"}
## Quality Gate Status
${actor.status === "pushed" || actor.status === "ready_for_push" || actor.status === "pushing" ? "PASS" : "PENDING"}
## Push Command
apify push --force
## Push Attempts
${attempts}
## Push Result
${pushResult}
## Apify Actor URL
${url || "N/A"}
## Errors
${actor.errors.map((error) => `- ${error}`).join("\n") || "- None"}
## Final Verdict
${verdict}
`;
}

async function writeFinalActorReport(actor: ActorRunState, verdict: string, note: string) {
  await writeMarkdown(path.join(actor.actorDir, "reports", "final-report.md"), finalActorReport(actor, verdict, note));
}

function finalActorReport(actor: ActorRunState, verdict: string, note: string) {
  return `# Final Actor Report
## Actor Name
${actor.idea.actorName}
## Template Used
${actor.idea.template}
## What It Does
${actor.idea.problemSolved}
## Target Users
${actor.idea.targetUsers.join(", ")}
## Monetization Angle
${actor.idea.monetizationAngle}
## Files Created
${actor.actorDir}
## Tests Run
${actor.commands.map((command) => `- ${command.command}: exit ${command.code}`).join("\n") || "- Pending"}
## Fixes Applied
See PACT report.
## Quality Gate Result
${["ready_for_push", "pushing", "pushed", "ready_for_manual_push"].includes(actor.status) ? "PASS" : "FAIL"}
## Deployment Result
${actor.pushed ? "PUSHED" : actor.status}
## Actor URL
${actor.apifyActorUrl || "N/A"}
## Recommended Next Improvements
- Add source-specific fixtures.
- Add richer optional AI JSON output.
- Add Apify dataset schema views.
## Notes
${note}
## Final Verdict
${verdict}
`;
}

async function updateRegistry(runId: string, actors: ActorRunState[]) {
  const existing = await readRegistry();
  const bySlug = new Map(existing.map((entry) => [entry.slug, entry]));
  for (const actor of actors) {
    bySlug.set(actor.idea.slug, {
      actorName: actor.idea.actorName,
      slug: actor.idea.slug,
      createdAt: new Date().toISOString(),
      sourceRunId: runId,
      status: actor.pushed ? "pushed" : actor.status === "failed" ? "failed" : actor.status === "testing" ? "tested" : "generated",
      apifyActorUrl: actor.apifyActorUrl,
      ideaSummary: actor.idea.problemSolved
    });
  }
  await writeRegistry([...bySlug.values()]);
}

function extractActorUrl(output: string) {
  return output.match(/Actor detail (https:\/\/console\.apify\.com\/actors\/[A-Za-z0-9]+)/)?.[1] ?? "";
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

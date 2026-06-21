/**
 * Project Analyzer — inspects a target directory and produces raw analysis data.
 * This is the entry point for all harness operations. It detects project type,
 * stack, commands, risk areas, and adapter-specific signals.
 */

import { readdir, readFile, stat, access } from "node:fs/promises";
import path from "node:path";
import type { ProjectProfile, ApifyProfile, AdapterDetection } from "./project-profile.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function analyzeProject(root: string): Promise<ProjectProfile> {
  const absRoot = path.resolve(root);
  const tree = await collectTree(absRoot, 3);
  const flatFiles = flatten(tree);

  const name = detectName(absRoot, flatFiles);
  const languages = detectLanguages(flatFiles);
  const packageManager = detectPackageManager(flatFiles);
  const frameworks = await detectFrameworks(absRoot, flatFiles);
  const commands = await detectCommands(absRoot, flatFiles, packageManager);
  const manifests = detectManifests(flatFiles);
  const lockfiles = detectLockfiles(flatFiles);
  const ciFiles = detectCiFiles(flatFiles);
  const envFiles = detectEnvFiles(flatFiles);
  const docs = detectDocs(flatFiles);
  const entrypoints = detectEntrypoints(flatFiles);
  const risks = await detectRisks(absRoot, flatFiles);
  const adapterDetections = await detectAdapters(absRoot, flatFiles);
  const apifyProfile = await detectApify(absRoot, flatFiles);

  const projectType = resolveProjectType(languages, flatFiles, apifyProfile, adapterDetections);

  return {
    name,
    root: absRoot,
    detectedAt: new Date().toISOString(),
    type: projectType,
    languages,
    packageManager,
    frameworks,
    commands,
    manifests,
    lockfiles,
    ciFiles,
    envFiles,
    docs,
    entrypoints,
    adapters: adapterDetections.map((a) => a.adapter),
    risks,
    apify: apifyProfile ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// File tree collection
// ---------------------------------------------------------------------------

interface TreeEntry {
  name: string;
  relativePath: string;
  isDir: boolean;
  children?: TreeEntry[];
}

async function collectTree(root: string, maxDepth: number, currentDepth = 0, prefix = ""): Promise<TreeEntry[]> {
  if (currentDepth > maxDepth) return [];
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv", ".next", ".turbo"]);
  const entries: TreeEntry[] = [];
  let items: string[];
  try {
    items = await readdir(root);
  } catch {
    return [];
  }
  for (const item of items) {
    if (item.startsWith(".") && ![".", ".actor", ".github", ".gitlab-ci.yml", ".env", ".env.example", ".env.local", ".env.production"].includes(item) && !item.endsWith(".yml") && !item.endsWith(".yaml")) {
      // Allow specific dotfiles/dotdirs but skip most hidden items at deeper levels
      if (currentDepth > 0 && !item.startsWith(".actor") && !item.startsWith(".github") && !item.startsWith(".env")) continue;
    }
    const fullPath = path.join(root, item);
    const relPath = prefix ? `${prefix}/${item}` : item;
    try {
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        if (skipDirs.has(item)) {
          entries.push({ name: item, relativePath: relPath, isDir: true, children: [] });
        } else {
          const children = await collectTree(fullPath, maxDepth, currentDepth + 1, relPath);
          entries.push({ name: item, relativePath: relPath, isDir: true, children });
        }
      } else {
        entries.push({ name: item, relativePath: relPath, isDir: false });
      }
    } catch {
      // Skip inaccessible entries
    }
  }
  return entries;
}

function flatten(tree: TreeEntry[]): string[] {
  const result: string[] = [];
  for (const entry of tree) {
    result.push(entry.relativePath);
    if (entry.children) result.push(...flatten(entry.children));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function detectName(root: string, files: string[]): string {
  const pkgJson = files.find((f) => f === "package.json");
  if (pkgJson) {
    try {
      // Will be read synchronously in the caller context
      return path.basename(root);
    } catch {
      // fallback
    }
  }
  return path.basename(root);
}

function detectLanguages(files: string[]): string[] {
  const langs = new Set<string>();
  for (const f of files) {
    if (f.endsWith(".ts") || f.endsWith(".tsx")) langs.add("typescript");
    if (f.endsWith(".js") || f.endsWith(".jsx") || f.endsWith(".mjs") || f.endsWith(".cjs")) langs.add("javascript");
    if (f.endsWith(".py")) langs.add("python");
    if (f.endsWith(".go")) langs.add("go");
    if (f.endsWith(".rs")) langs.add("rust");
    if (f.endsWith(".java") || f.endsWith(".kt")) langs.add("java");
    if (f.endsWith(".rb")) langs.add("ruby");
    if (f.endsWith(".php")) langs.add("php");
    if (f.endsWith(".swift")) langs.add("swift");
    if (f.endsWith(".cs")) langs.add("csharp");
  }
  return [...langs];
}

function detectPackageManager(files: string[]): ProjectProfile["packageManager"] {
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("pnpm-lock.yaml") || files.includes("pnpm-workspace.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("package-lock.json") || files.includes("package.json")) return "npm";
  if (files.includes("poetry.lock") || files.includes("pyproject.toml")) return "poetry";
  if (files.includes("uv.lock")) return "uv";
  if (files.includes("requirements.txt") || files.includes("Pipfile")) return "pip";
  return "unknown";
}

async function detectFrameworks(root: string, files: string[]): Promise<string[]> {
  const frameworks: string[] = [];
  const pkgPath = path.join(root, "package.json");
  try {
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.next) frameworks.push("next.js");
    if (allDeps.vite) frameworks.push("vite");
    if (allDeps.react) frameworks.push("react");
    if (allDeps.vue) frameworks.push("vue");
    if (allDeps.angular || allDeps["@angular/core"]) frameworks.push("angular");
    if (allDeps.express) frameworks.push("express");
    if (allDeps.fastify) frameworks.push("fastify");
    if (allDeps.crawlee) frameworks.push("crawlee");
    if (allDeps.apify) frameworks.push("apify-sdk");
    if (allDeps.playwright) frameworks.push("playwright");
    if (allDeps.puppeteer) frameworks.push("puppeteer");
  } catch {
    // No package.json or unparseable
  }
  if (files.some((f) => f.endsWith("requirements.txt") || f === "pyproject.toml")) {
    try {
      const reqPath = path.join(root, "requirements.txt");
      const req = await readFile(reqPath, "utf8");
      if (req.includes("django")) frameworks.push("django");
      if (req.includes("flask")) frameworks.push("flask");
      if (req.includes("fastapi")) frameworks.push("fastapi");
      if (req.includes("scrapy")) frameworks.push("scrapy");
    } catch {
      // No requirements.txt
    }
  }
  return frameworks;
}

async function detectCommands(root: string, files: string[], pm: ProjectProfile["packageManager"]): Promise<ProjectProfile["commands"]> {
  const commands: ProjectProfile["commands"] = {};
  const pkgPath = path.join(root, "package.json");
  try {
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    const scripts = pkg.scripts ?? {};
    const prefix = pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : pm === "bun" ? "bun" : "npm";
    if (scripts.install || pkg.dependencies) commands.install = `${prefix} install`;
    if (scripts.build) commands.build = `${prefix} run build`;
    if (scripts.test) commands.test = `${prefix} run test`;
    if (scripts.lint) commands.lint = `${prefix} run lint`;
    if (scripts.typecheck) commands.typecheck = `${prefix} run typecheck`;
    if (scripts.dev) commands.dev = `${prefix} run dev`;
    if (scripts.start) commands.start = `${prefix} run start`;
    if (!commands.install) commands.install = `${prefix} install`;
  } catch {
    // No package.json
  }
  if (pm === "pip" || pm === "poetry" || pm === "uv") {
    commands.install = pm === "poetry" ? "poetry install" : pm === "uv" ? "uv sync" : "pip install -r requirements.txt";
    if (files.includes("Makefile")) {
      commands.build = "make build";
      commands.test = "make test";
    }
    if (files.some((f) => f.includes("pytest"))) commands.test = "pytest";
  }
  return commands;
}

function detectManifests(files: string[]): string[] {
  const manifests = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "build.gradle", "pom.xml", "Gemfile", "composer.json"];
  return files.filter((f) => manifests.includes(path.basename(f)));
}

function detectLockfiles(files: string[]): string[] {
  const lockFiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock", "Pipfile.lock", "poetry.lock", "uv.lock", "Cargo.lock", "go.sum", "Gemfile.lock", "composer.lock"];
  return files.filter((f) => lockFiles.includes(path.basename(f)));
}

function detectCiFiles(files: string[]): string[] {
  return files.filter((f) => {
    const base = path.basename(f);
    const dir = path.dirname(f);
    return (
      dir.includes(".github/workflows") ||
      base === ".gitlab-ci.yml" ||
      base === "Jenkinsfile" ||
      base === ".travis.yml" ||
      base === "circle.yml" ||
      base === ".circleci" ||
      base === "bitbucket-pipelines.yml" ||
      base === "Dockerfile" ||
      base === "docker-compose.yml" ||
      base === "docker-compose.yaml"
    );
  });
}

function detectEnvFiles(files: string[]): string[] {
  return files.filter((f) => {
    const base = path.basename(f);
    return base.startsWith(".env");
  });
}

function detectDocs(files: string[]): string[] {
  return files.filter((f) => {
    const base = path.basename(f).toLowerCase();
    return (
      base === "readme.md" ||
      base === "changelog.md" ||
      base === "contributing.md" ||
      base === "license" ||
      base === "license.md" ||
      base === "docs" ||
      base === "spec.md" ||
      base === "actor.md" ||
      base === "examples.md" ||
      base === "agents.md" ||
      base === "gemini.md" ||
      base === "claude.md"
    );
  });
}

function detectEntrypoints(files: string[]): string[] {
  const entryNames = ["main.ts", "main.js", "index.ts", "index.js", "app.ts", "app.js", "server.ts", "server.js", "main.py", "app.py", "manage.py"];
  return files.filter((f) => entryNames.includes(path.basename(f)));
}

async function detectRisks(root: string, files: string[]): Promise<ProjectProfile["risks"]> {
  const risks: ProjectProfile["risks"] = {
    auth: [],
    payments: [],
    security: [],
    env: [],
    deployment: [],
    database: [],
  };

  for (const f of files) {
    const lower = f.toLowerCase();
    if (lower.includes("auth") || lower.includes("login") || lower.includes("oauth") || lower.includes("jwt") || lower.includes("session")) {
      risks.auth.push(f);
    }
    if (lower.includes("payment") || lower.includes("stripe") || lower.includes("billing") || lower.includes("invoice") || lower.includes("pricing")) {
      risks.payments.push(f);
    }
    if (lower.includes("secret") || lower.includes("credential") || lower.includes("token") || lower.includes("apikey") || lower.includes("api_key") || lower.includes("password")) {
      risks.security.push(f);
    }
    if (path.basename(lower).startsWith(".env")) {
      risks.env.push(f);
    }
    if (lower.includes("deploy") || lower.includes("dockerfile") || lower.includes("docker-compose") || lower.includes("k8s") || lower.includes("kubernetes") || lower.includes("terraform") || lower.includes("pulumi")) {
      risks.deployment.push(f);
    }
    if (lower.includes("migration") || lower.includes("database") || lower.includes("schema") || lower.includes("prisma") || lower.includes("drizzle") || lower.includes("knex") || lower.includes("typeorm") || lower.includes("sequelize")) {
      risks.database.push(f);
    }
  }
  return risks;
}

// ---------------------------------------------------------------------------
// Adapter detection
// ---------------------------------------------------------------------------

async function detectAdapters(root: string, files: string[]): Promise<AdapterDetection[]> {
  const detections: AdapterDetection[] = [];

  // Check for Apify
  const apifySignals: string[] = [];
  if (files.some((f) => f.includes(".actor/") || f === ".actor")) apifySignals.push(".actor/ directory");
  if (files.some((f) => path.basename(f) === "actor.json")) apifySignals.push("actor.json");
  if (files.some((f) => path.basename(f) === "apify.json")) apifySignals.push("apify.json");
  if (files.some((f) => f.includes("apify_storage"))) apifySignals.push("apify_storage/");
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    if (raw.includes('"apify"')) apifySignals.push("apify in package.json");
    if (raw.includes('"crawlee"')) apifySignals.push("crawlee in package.json");
    if (raw.includes('"apify-cli"')) apifySignals.push("apify-cli in package.json");
  } catch { /* no package.json */ }
  if (apifySignals.length > 0) {
    detections.push({ adapter: "apify", confidence: Math.min(1, apifySignals.length * 0.25), signals: apifySignals });
  }

  // Check for monorepo
  const monorepoSignals: string[] = [];
  if (files.includes("pnpm-workspace.yaml")) monorepoSignals.push("pnpm-workspace.yaml");
  if (files.includes("lerna.json")) monorepoSignals.push("lerna.json");
  if (files.includes("nx.json")) monorepoSignals.push("nx.json");
  if (files.includes("turbo.json")) monorepoSignals.push("turbo.json");
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    const pkg = JSON.parse(raw);
    if (pkg.workspaces) monorepoSignals.push("workspaces in package.json");
  } catch { /* no package.json */ }
  if (monorepoSignals.length > 0) {
    detections.push({ adapter: "monorepo", confidence: Math.min(1, monorepoSignals.length * 0.3), signals: monorepoSignals });
  }

  // Check for generic Node
  if (files.includes("package.json")) {
    detections.push({ adapter: "generic-node", confidence: 0.5, signals: ["package.json"] });
  }

  // Check for generic Python
  if (files.includes("requirements.txt") || files.includes("pyproject.toml") || files.includes("setup.py")) {
    const pySignals = files.filter((f) => ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"].includes(f));
    detections.push({ adapter: "generic-python", confidence: Math.min(1, pySignals.length * 0.3), signals: pySignals });
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Apify-specific detection
// ---------------------------------------------------------------------------

async function detectApify(root: string, files: string[]): Promise<ApifyProfile | null> {
  const hasActorDir = files.some((f) => f.startsWith(".actor/") || f === ".actor");
  const actorJsonFiles = files.filter((f) => path.basename(f) === "actor.json");
  const hasActorJson = actorJsonFiles.length > 0;
  const inputSchemaFiles = files.filter((f) =>
    path.basename(f) === "input_schema.json" ||
    path.basename(f) === "INPUT_SCHEMA.json"
  );
  const hasInputSchema = inputSchemaFiles.length > 0;
  const hasApifyStorage = files.some((f) => f.includes("apify_storage") || f.includes("storage/key_value_stores"));

  // Check package.json for SDK/Crawlee usage
  let usesApifySdk = false;
  let usesCrawlee = false;
  try {
    const raw = await readFile(path.join(root, "package.json"), "utf8");
    usesApifySdk = raw.includes('"apify"');
    usesCrawlee = raw.includes('"crawlee"');
  } catch { /* no package.json */ }

  // Scan for deeper usage patterns in source files
  let usesProxy = false;
  let usesDataset = false;
  let usesKeyValueStore = false;
  let usesRequestQueue = false;
  let hasMonetizationMetadata = false;
  let hasOutputSchema = false;

  for (const f of files) {
    if (f.endsWith(".ts") || f.endsWith(".js")) {
      try {
        const content = await readFile(path.join(root, f), "utf8");
        if (content.includes("ProxyConfiguration") || content.includes("useApifyProxy")) usesProxy = true;
        if (content.includes("Actor.pushData") || content.includes("Dataset.open")) usesDataset = true;
        if (content.includes("Actor.getValue") || content.includes("Actor.setValue") || content.includes("KeyValueStore")) usesKeyValueStore = true;
        if (content.includes("RequestQueue") || content.includes("RequestList")) usesRequestQueue = true;
      } catch {
        // Skip unreadable files
      }
    }
    if (path.basename(f) === "output_schema.json") hasOutputSchema = true;
  }

  // Check for monetization/pricing metadata in actor.json files
  for (const ajf of actorJsonFiles) {
    try {
      const raw = await readFile(path.join(root, ajf), "utf8");
      if (raw.includes("pricingInfos") || raw.includes("monetization") || raw.includes("pricing")) {
        hasMonetizationMetadata = true;
      }
    } catch { /* skip */ }
  }

  // Detect actor directories (generated-actors pattern)
  const actorDirs: string[] = [];
  for (const f of files) {
    if (f.includes(".actor/actor.json")) {
      actorDirs.push(path.dirname(path.dirname(f)));
    }
  }

  // Detect entrypoint
  let actorEntrypoint: string | undefined;
  const mainFiles = ["main.ts", "main.js", "src/main.ts", "src/main.js"];
  for (const mf of mainFiles) {
    if (files.includes(mf)) {
      actorEntrypoint = mf;
      break;
    }
  }

  // Only return if we have at least some Apify signals
  if (!hasActorDir && !hasActorJson && !usesApifySdk) return null;

  return {
    hasActorJson,
    hasInputSchema,
    usesApifySdk,
    usesCrawlee,
    actorEntrypoint,
    inputSchemaPath: inputSchemaFiles[0],
    storagePath: hasApifyStorage ? "storage" : undefined,
    actorDirs: [...new Set(actorDirs)],
    hasMonetizationMetadata,
    hasOutputSchema,
    usesProxy,
    usesDataset,
    usesKeyValueStore,
    usesRequestQueue,
  };
}

// ---------------------------------------------------------------------------
// Project type resolution
// ---------------------------------------------------------------------------

function resolveProjectType(
  languages: string[],
  files: string[],
  apify: ApifyProfile | null,
  adapters: AdapterDetection[]
): ProjectProfile["type"] {
  // Apify takes precedence if strong signals
  if (apify && (apify.hasActorJson || apify.usesApifySdk)) return "apify";

  // Monorepo check
  const monorepoAdapter = adapters.find((a) => a.adapter === "monorepo");
  if (monorepoAdapter && monorepoAdapter.confidence >= 0.6) return "monorepo";

  // Language-based
  if (languages.includes("typescript") || languages.includes("javascript")) return "node";
  if (languages.includes("python")) return "python";

  return "unknown";
}

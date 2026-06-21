import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TemplateId } from "./types.js";

export function factoryRoot() {
  if (process.env.CREATOR_FACTORY_ROOT) return path.resolve(process.env.CREATOR_FACTORY_ROOT);
  let current = process.cwd();
  while (true) {
    const packagePath = path.join(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
        if (pkg.name === "apify-creator-factory") return current;
      } catch {
        // Keep walking.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

export function loadEnv() {
  const envPath = path.join(factoryRoot(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      if (val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}


export function nowIso() {
  return new Date().toISOString();
}

export function sanitizeActorName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return slug || "generated-actor";
}

export function selectTemplate(template: TemplateId, prompt: string): Exclude<TemplateId, "auto"> {
  if (template !== "auto") return template;
  const lowered = prompt.toLowerCase();
  if (lowered.includes("python")) return "python-langgraph";
  if (lowered.includes("typescript") || lowered.includes("beeai")) return "ts-beeai-agent";
  return "project-langgraph-agent-javascript";
}

export function redactSecrets(value: string) {
  return value
    .replace(/(apify_api_[a-zA-Z0-9_-]+)/g, "[REDACTED_APIFY_TOKEN]")
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/g, "[REDACTED_OPENAI_KEY]")
    .replace(/(gh[pousr]_[a-zA-Z0-9_]{20,})/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/(ANTHROPIC_API_KEY\s*=\s*).+/g, "$1[REDACTED]")
    .replace(/(OPENAI_API_KEY\s*=\s*).+/g, "$1[REDACTED]")
    .replace(/(APIFY_TOKEN\s*=\s*).+/g, "$1[REDACTED]")
    .replace(/(GITHUB_TOKEN\s*=\s*).+/g, "$1[REDACTED]");
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeText(filePath: string, text: string) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, redactSecrets(text), "utf8");
}

export async function readTextSafe(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function commandExists(command: string) {
  const result = await runCommand("which", [command], process.cwd(), 5000);
  return result.code === 0;
}

export async function runCommand(command: string, args: string[], cwd: string, timeoutMs = 120000) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env, shell: false });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: redactSecrets(stdout), stderr: redactSecrets(stderr) });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ code: 127, stdout, stderr: redactSecrets(error.message) });
    });
  });
}

export async function scanForSecrets(dir: string) {
  const hits: string[] = [];
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", ".git", "dist"].includes(entry.name)) continue;
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(target);
        continue;
      }
      const info = await stat(target);
      if (info.size > 1024 * 1024) continue;
      const text = await readTextSafe(target);
      if (/(apify_api_[a-zA-Z0-9_-]+|sk-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9_]{20,})/.test(text)) {
        hits.push(path.relative(dir, target));
      }
    }
  }
  await walk(dir);
  return hits;
}

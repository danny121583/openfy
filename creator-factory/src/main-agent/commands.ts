import { spawn } from "node:child_process";
import type { CommandResult } from "./types.js";

export function redactSecrets(value: string) {
  return value
    .replace(/apify_api_[a-zA-Z0-9_-]+/g, "[REDACTED_APIFY_TOKEN]")
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_OPENAI_KEY]")
    .replace(/gh[pousr]_[a-zA-Z0-9_]{20,}/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/(APIFY_TOKEN[ \t]*=[ \t]*)[^\r\n]+/g, "$1[REDACTED]")
    .replace(/(OPENAI_API_KEY[ \t]*=[ \t]*)[^\r\n]+/g, "$1[REDACTED]")
    .replace(/(ANTHROPIC_API_KEY[ \t]*=[ \t]*)[^\r\n]+/g, "$1[REDACTED]");
}

export async function runCommand(command: string, args: string[], cwd: string, timeoutMs = 180000): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
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
      resolve({ command: [command, ...args].join(" "), cwd, code, stdout: redactSecrets(stdout), stderr: redactSecrets(stderr) });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ command: [command, ...args].join(" "), cwd, code: 127, stdout, stderr: redactSecrets(error.message) });
    });
  });
}

export async function commandOk(command: string, args: string[], cwd: string) {
  const result = await runCommand(command, args, cwd, 30000);
  return result.code === 0;
}

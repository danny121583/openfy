/**
 * Safety Gates — loads safety policy and enforces restrictions on file edits,
 * dependency updates, and sensitive operations.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SafetyGateResult } from "./project-profile.js";

const DEFAULT_POLICY_PATH = path.resolve(import.meta.dirname ?? ".", "..", "config", "safety-policy.json");

export interface SafetyPolicy {
  defaultMode: string;
  allowAutoFix: boolean;
  allowAutoDependencyPatch: boolean;
  allowAutoMajorUpdates: boolean;
  requireApprovalFor: string[];
  neverAutoChange: string[];
}

let cachedPolicy: SafetyPolicy | null = null;

export async function loadSafetyPolicy(policyPath: string = DEFAULT_POLICY_PATH): Promise<SafetyPolicy> {
  if (cachedPolicy) return cachedPolicy;
  try {
    const raw = await readFile(policyPath, "utf8");
    cachedPolicy = JSON.parse(raw) as SafetyPolicy;
    return cachedPolicy;
  } catch {
    // Return conservative defaults if policy file is missing
    cachedPolicy = {
      defaultMode: "recommendation-only",
      allowAutoFix: false,
      allowAutoDependencyPatch: false,
      allowAutoMajorUpdates: false,
      requireApprovalFor: ["auth", "payments", "database", "migrations", "security", "deployment", "env", "secrets", "pricing", "publishing", "destructive-file-ops"],
      neverAutoChange: [".env", ".env.local", ".env.production", "secrets", "credentials"],
    };
    return cachedPolicy;
  }
}

export function resetPolicyCache(): void {
  cachedPolicy = null;
}

export async function checkFileEdit(filePath: string): Promise<SafetyGateResult> {
  const policy = await loadSafetyPolicy();
  const basename = path.basename(filePath).toLowerCase();
  const fullLower = filePath.toLowerCase();

  // Check never-auto-change list
  for (const pattern of policy.neverAutoChange) {
    const patternLower = pattern.toLowerCase();
    if (basename === patternLower || basename.startsWith(patternLower) || fullLower.includes(patternLower)) {
      return {
        gate: "file-edit",
        target: filePath,
        allowed: false,
        reason: `File matches never-auto-change pattern: "${pattern}"`,
        requiresApproval: true,
      };
    }
  }

  // Check require-approval categories
  for (const category of policy.requireApprovalFor) {
    if (fullLower.includes(category.toLowerCase())) {
      return {
        gate: "file-edit",
        target: filePath,
        allowed: false,
        reason: `File matches require-approval category: "${category}"`,
        requiresApproval: true,
      };
    }
  }

  return {
    gate: "file-edit",
    target: filePath,
    allowed: true,
    reason: "No safety restrictions apply.",
    requiresApproval: false,
  };
}

export async function checkOperation(category: string): Promise<SafetyGateResult> {
  const policy = await loadSafetyPolicy();
  const catLower = category.toLowerCase();

  if (policy.requireApprovalFor.some((c) => c.toLowerCase() === catLower)) {
    return {
      gate: "operation",
      target: category,
      allowed: false,
      reason: `Operation "${category}" requires explicit approval per safety policy.`,
      requiresApproval: true,
    };
  }

  return {
    gate: "operation",
    target: category,
    allowed: true,
    reason: "Operation allowed by safety policy.",
    requiresApproval: false,
  };
}

export async function checkDependencyUpdate(
  name: string,
  fromVersion: string,
  toVersion: string
): Promise<SafetyGateResult> {
  const policy = await loadSafetyPolicy();
  const updateType = classifyVersionChange(fromVersion, toVersion);

  if (updateType === "major" && !policy.allowAutoMajorUpdates) {
    return {
      gate: "dependency-update",
      target: `${name}: ${fromVersion} → ${toVersion}`,
      allowed: false,
      reason: "Major version update requires explicit approval.",
      requiresApproval: true,
    };
  }

  if ((updateType === "minor" || updateType === "patch") && !policy.allowAutoDependencyPatch) {
    return {
      gate: "dependency-update",
      target: `${name}: ${fromVersion} → ${toVersion}`,
      allowed: false,
      reason: "Auto dependency patching is disabled in safety policy.",
      requiresApproval: true,
    };
  }

  return {
    gate: "dependency-update",
    target: `${name}: ${fromVersion} → ${toVersion}`,
    allowed: true,
    reason: `${updateType} update allowed by safety policy.`,
    requiresApproval: false,
  };
}

function classifyVersionChange(from: string, to: string): "major" | "minor" | "patch" {
  const fromParts = from.replace(/^[^\d]*/, "").split(".").map(Number);
  const toParts = to.replace(/^[^\d]*/, "").split(".").map(Number);

  if ((toParts[0] ?? 0) > (fromParts[0] ?? 0)) return "major";
  if ((toParts[1] ?? 0) > (fromParts[1] ?? 0)) return "minor";
  return "patch";
}

/**
 * Update Watcher — checks for outdated packages, security advisories,
 * and adapter-specific platform changes.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProjectProfile, UpdateRecommendation } from "./project-profile.js";

const execFileAsync = promisify(execFile);

export async function checkOutdatedPackages(profile: ProjectProfile): Promise<UpdateRecommendation[]> {
  const recommendations: UpdateRecommendation[] = [];

  if (profile.packageManager === "npm" || profile.packageManager === "yarn" || profile.packageManager === "pnpm" || profile.packageManager === "bun") {
    const npmRecommendations = await checkNpmOutdated(profile.root);
    recommendations.push(...npmRecommendations);
  }

  if (profile.packageManager === "pip" || profile.packageManager === "poetry" || profile.packageManager === "uv") {
    const pyRecommendations = await checkPythonOutdated(profile.root, profile.packageManager);
    recommendations.push(...pyRecommendations);
  }

  return recommendations;
}

export async function checkSecurityAdvisories(profile: ProjectProfile): Promise<UpdateRecommendation[]> {
  const advisories: UpdateRecommendation[] = [];

  if (["npm", "yarn", "pnpm", "bun"].includes(profile.packageManager ?? "")) {
    const npmAdvisories = await checkNpmAudit(profile.root);
    advisories.push(...npmAdvisories);
  }

  return advisories;
}

export async function checkAdapterSpecificUpdates(profile: ProjectProfile): Promise<string[]> {
  const notes: string[] = [];

  if (profile.type === "apify" && profile.apify) {
    // Check Apify SDK version
    notes.push("Check Apify SDK release notes for breaking changes.");
    if (profile.apify.usesCrawlee) {
      notes.push("Check Crawlee release notes for new features and breaking changes.");
    }
    notes.push("Check Apify platform changelog for schema or API changes.");
  }

  return notes;
}

// ---------------------------------------------------------------------------
// npm outdated
// ---------------------------------------------------------------------------

async function checkNpmOutdated(cwd: string): Promise<UpdateRecommendation[]> {
  try {
    const { stdout } = await execFileAsync("npm", ["outdated", "--json"], {
      cwd,
      timeout: 60_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const data = JSON.parse(stdout || "{}") as Record<string, { current: string; wanted: string; latest: string }>;
    return Object.entries(data).map(([name, info]) => {
      const updateType = classifyUpdate(info.current, info.latest);
      return {
        package: name,
        currentVersion: info.current,
        latestVersion: info.latest,
        updateType,
        hasSecurityAdvisory: false,
        isBreaking: updateType === "major",
        recommendation: updateType === "patch" ? "apply" as const : updateType === "minor" ? "review" as const : "skip" as const,
      };
    });
  } catch (error: unknown) {
    // npm outdated exits with code 1 when packages are outdated (normal behavior)
    const err = error as { stdout?: string };
    if (err.stdout) {
      try {
        const data = JSON.parse(err.stdout) as Record<string, { current: string; wanted: string; latest: string }>;
        return Object.entries(data).map(([name, info]) => {
          const updateType = classifyUpdate(info.current, info.latest);
          return {
            package: name,
            currentVersion: info.current,
            latestVersion: info.latest,
            updateType,
            hasSecurityAdvisory: false,
            isBreaking: updateType === "major",
            recommendation: updateType === "patch" ? "apply" as const : updateType === "minor" ? "review" as const : "skip" as const,
          };
        });
      } catch {
        return [];
      }
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// npm audit
// ---------------------------------------------------------------------------

async function checkNpmAudit(cwd: string): Promise<UpdateRecommendation[]> {
  try {
    const { stdout } = await execFileAsync("npm", ["audit", "--json"], {
      cwd,
      timeout: 60_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const data = JSON.parse(stdout || "{}") as { vulnerabilities?: Record<string, { severity: string; fixAvailable?: boolean | { name: string; version: string } }> };
    if (!data.vulnerabilities) return [];

    return Object.entries(data.vulnerabilities).map(([name, info]) => ({
      package: name,
      currentVersion: "unknown",
      latestVersion: typeof info.fixAvailable === "object" ? info.fixAvailable.version : "unknown",
      updateType: "patch" as const,
      hasSecurityAdvisory: true,
      advisoryDetails: `Severity: ${info.severity}`,
      isBreaking: false,
      recommendation: "apply" as const,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Python outdated
// ---------------------------------------------------------------------------

async function checkPythonOutdated(cwd: string, pm: string): Promise<UpdateRecommendation[]> {
  try {
    const cmd = pm === "pip" ? "pip" : pm === "poetry" ? "poetry" : "uv";
    const args = pm === "pip"
      ? ["list", "--outdated", "--format=json"]
      : pm === "poetry"
        ? ["show", "--outdated", "--format=json"]
        : ["pip", "list", "--outdated", "--format=json"];

    const { stdout } = await execFileAsync(cmd, args, {
      cwd,
      timeout: 60_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    const data = JSON.parse(stdout || "[]") as Array<{ name: string; version: string; latest_version: string }>;
    return data.map((pkg) => ({
      package: pkg.name,
      currentVersion: pkg.version,
      latestVersion: pkg.latest_version,
      updateType: classifyUpdate(pkg.version, pkg.latest_version),
      hasSecurityAdvisory: false,
      isBreaking: classifyUpdate(pkg.version, pkg.latest_version) === "major",
      recommendation: "review" as const,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyUpdate(from: string, to: string): "patch" | "minor" | "major" {
  const fromParts = from.replace(/^[^\d]*/, "").split(".").map(Number);
  const toParts = to.replace(/^[^\d]*/, "").split(".").map(Number);
  if ((toParts[0] ?? 0) > (fromParts[0] ?? 0)) return "major";
  if ((toParts[1] ?? 0) > (fromParts[1] ?? 0)) return "minor";
  return "patch";
}

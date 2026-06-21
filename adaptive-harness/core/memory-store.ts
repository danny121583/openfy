/**
 * Memory Store — JSONL append-only storage for lessons, failures, successes, and updates.
 * Each entry is timestamped and has a unique ID for traceability.
 */

import { appendFile, readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { MemoryEntry } from "./project-profile.js";

const MEMORY_DIR = path.resolve(import.meta.dirname ?? ".", "..", "memory");

const FILES = {
  lessons: path.join(MEMORY_DIR, "lessons.jsonl"),
  failures: path.join(MEMORY_DIR, "failures.jsonl"),
  successes: path.join(MEMORY_DIR, "successful-workflows.jsonl"),
  updates: path.join(MEMORY_DIR, "update-history.jsonl"),
  profiles: path.join(MEMORY_DIR, "project-profiles.jsonl"),
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function appendLesson(
  projectRoot: string,
  adapter: string,
  summary: string,
  details: Record<string, unknown> = {}
): Promise<MemoryEntry> {
  return appendEntry(FILES.lessons, "lesson", projectRoot, adapter, summary, details);
}

export async function appendFailure(
  projectRoot: string,
  adapter: string,
  summary: string,
  details: Record<string, unknown> = {}
): Promise<MemoryEntry> {
  return appendEntry(FILES.failures, "failure", projectRoot, adapter, summary, details);
}

export async function appendSuccess(
  projectRoot: string,
  adapter: string,
  summary: string,
  details: Record<string, unknown> = {}
): Promise<MemoryEntry> {
  return appendEntry(FILES.successes, "success", projectRoot, adapter, summary, details);
}

export async function appendUpdate(
  projectRoot: string,
  adapter: string,
  summary: string,
  details: Record<string, unknown> = {}
): Promise<MemoryEntry> {
  return appendEntry(FILES.updates, "update", projectRoot, adapter, summary, details);
}

export async function saveProfile(profile: unknown): Promise<void> {
  await ensureDir(MEMORY_DIR);
  const line = JSON.stringify(profile) + "\n";
  await appendFile(FILES.profiles, line);
}

export async function queryEntries(
  type: MemoryEntry["type"],
  filter?: { projectRoot?: string; adapter?: string; limit?: number }
): Promise<MemoryEntry[]> {
  const file = type === "lesson" ? FILES.lessons
    : type === "failure" ? FILES.failures
    : type === "success" ? FILES.successes
    : FILES.updates;

  const entries = await readJsonl<MemoryEntry>(file);
  let filtered = entries;

  if (filter?.projectRoot) {
    filtered = filtered.filter((e) => e.projectRoot === filter.projectRoot);
  }
  if (filter?.adapter) {
    filtered = filtered.filter((e) => e.adapter === filter.adapter);
  }
  if (filter?.limit) {
    filtered = filtered.slice(-filter.limit);
  }

  return filtered;
}

export async function queryLessons(filter?: { projectRoot?: string; adapter?: string; limit?: number }): Promise<MemoryEntry[]> {
  return queryEntries("lesson", filter);
}

export async function queryFailures(filter?: { projectRoot?: string; adapter?: string; limit?: number }): Promise<MemoryEntry[]> {
  return queryEntries("failure", filter);
}

export async function loadLatestProfile(projectRoot: string): Promise<unknown | null> {
  const entries = await readJsonl<Record<string, unknown>>(FILES.profiles);
  const matching = entries.filter((e) => e.root === projectRoot);
  return matching.length > 0 ? matching[matching.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

async function appendEntry(
  file: string,
  type: MemoryEntry["type"],
  projectRoot: string,
  adapter: string,
  summary: string,
  details: Record<string, unknown>
): Promise<MemoryEntry> {
  await ensureDir(MEMORY_DIR);
  const entry: MemoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    projectRoot,
    adapter,
    summary,
    details,
  };
  const line = JSON.stringify(entry) + "\n";
  await appendFile(file, line);
  return entry;
}

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

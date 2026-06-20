import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type { ActorLog, ActorRecord, ActorReport, ActorStatus, FileDatabaseShape } from "./types.js";
import { ensureDir, factoryRoot, nowIso, redactSecrets } from "./utils.js";

const emptyDb = (): FileDatabaseShape => ({
  actors: [],
  actor_sources: [],
  actor_reports: [],
  actor_runs: [],
  actor_tests: [],
  actor_deployments: [],
  actor_logs: [],
  actor_monetization: []
});

export class FileDatabase {
  constructor(private readonly filePath = path.resolve(factoryRoot(), "data", "creator-factory.json")) {}

  async read(): Promise<FileDatabaseShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return { ...emptyDb(), ...JSON.parse(raw) };
    } catch {
      return emptyDb();
    }
  }

  async write(db: FileDatabaseShape) {
    await ensureDir(path.dirname(this.filePath));
    await writeFile(this.filePath, JSON.stringify(db, null, 2), "utf8");
  }

  async listActors() {
    const db = await this.read();
    return db.actors.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getActor(id: string) {
    const db = await this.read();
    return db.actors.find((actor) => actor.id === id);
  }

  async upsertActor(actor: ActorRecord) {
    const db = await this.read();
    const index = db.actors.findIndex((item) => item.id === actor.id);
    if (index >= 0) db.actors[index] = actor;
    else db.actors.push(actor);
    await this.write(db);
    return actor;
  }

  async updateActor(id: string, patch: Partial<ActorRecord>) {
    const actor = await this.getActor(id);
    if (!actor) throw new Error(`Actor not found: ${id}`);
    return this.upsertActor({ ...actor, ...patch, updatedAt: nowIso() });
  }

  async setStatus(actorId: string, status: ActorStatus) {
    await this.updateActor(actorId, { status });
    await this.log(actorId, "info", `Status changed to ${status}`);
  }

  async addReport(report: Omit<ActorReport, "id" | "createdAt">) {
    const db = await this.read();
    const record: ActorReport = {
      ...report,
      id: nanoid(),
      markdown: redactSecrets(report.markdown),
      createdAt: nowIso()
    };
    db.actor_reports.push(record);
    await this.write(db);
    return record;
  }

  async listReports(actorId: string) {
    const db = await this.read();
    return db.actor_reports.filter((report) => report.actorId === actorId);
  }

  async log(actorId: string, level: ActorLog["level"], message: string) {
    const db = await this.read();
    db.actor_logs.push({ id: nanoid(), actorId, level, message: redactSecrets(message), createdAt: nowIso() });
    await this.write(db);
  }
}

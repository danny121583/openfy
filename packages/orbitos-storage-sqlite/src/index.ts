import initSqlJs from 'sql.js';
import * as fs from 'fs';
import type { OrbitBaseObject, OrbitActivityNode, CapabilityRule, OrbitStorageProvider } from '@orbitos/core-types';

export interface SQLiteProvider extends OrbitStorageProvider {}

export function createSQLiteProvider(options: { databasePath: string }): OrbitStorageProvider {
  let db: any = null;
  let SQL: any = null;
  let inTransaction = false;

  function getDb(): any {
    if (!db) {
      throw new Error('Database not initialized. Please call initialize() first.');
    }
    return db;
  }

  function persist(): void {
    if (!db || options.databasePath === ':memory:' || inTransaction) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(options.databasePath, buffer);
  }

  return {
    async initialize(): Promise<void> {
      SQL = await initSqlJs();
      if (options.databasePath !== ':memory:' && fs.existsSync(options.databasePath)) {
        const fileBuffer = fs.readFileSync(options.databasePath);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }

      // Execute table creations
      db.run(`
        CREATE TABLE IF NOT EXISTS objects (
          id TEXT PRIMARY KEY,
          schema_type TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          data_json TEXT NOT NULL,
          sync_sequence INTEGER NOT NULL DEFAULT 0,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_log (
          activity_id TEXT PRIMARY KEY,
          session_id TEXT,
          device_id TEXT,
          actor_type TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          action_type TEXT NOT NULL,
          target_object_id TEXT,
          payload_json TEXT NOT NULL,
          idempotency_key TEXT NOT NULL UNIQUE,
          signature TEXT,
          timestamp INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS capabilities (
          rule_id TEXT PRIMARY KEY,
          rule_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      persist();
    },

    async transaction<T>(fn: () => T | Promise<T>): Promise<T> {
      const database = getDb();
      inTransaction = true;
      try {
        database.run('BEGIN TRANSACTION;');
        const result = await fn();
        database.run('COMMIT;');
        inTransaction = false;
        persist();
        return result;
      } catch (err) {
        console.error("Original Transaction Error:", err);
        try {
          database.run('ROLLBACK;');
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
        inTransaction = false;
        throw err;
      }
    },

    async getObject(id: string): Promise<OrbitBaseObject | null> {
      const database = getDb();
      const stmt = database.prepare('SELECT data_json, is_deleted FROM objects WHERE id = :id');
      const res = stmt.getAsObject({ ':id': id });
      stmt.free();

      if (!res || !res.data_json || res.is_deleted === 1) {
        return null;
      }
      return JSON.parse(res.data_json as string) as OrbitBaseObject;
    },

    async putObject(object: OrbitBaseObject): Promise<void> {
      const database = getDb();
      const now = Date.now();
      const dataJson = JSON.stringify(object);
      
      database.run(`
        INSERT OR REPLACE INTO objects (
          id, schema_type, owner_id, data_json, sync_sequence, is_deleted, created_at, updated_at
        ) VALUES (:id, :schema_type, :owner_id, :data_json, :sync_sequence, :is_deleted, :created_at, :updated_at)
      `, {
        ':id': object.id,
        ':schema_type': object.schemaType,
        ':owner_id': object.ownerId,
        ':data_json': dataJson,
        ':sync_sequence': object.syncSequence || 0,
        ':is_deleted': object.isDeleted ? 1 : 0,
        ':created_at': object.createdAt || now,
        ':updated_at': object.updatedAt || now
      });

      persist();
    },

    async deleteObject(id: string): Promise<void> {
      const database = getDb();
      const now = Date.now();
      
      const obj = await this.getObject(id);
      if (!obj) return;

      obj.isDeleted = true;
      obj.updatedAt = now;

      database.run(`
        UPDATE objects SET is_deleted = 1, updated_at = :updated_at, data_json = :data_json WHERE id = :id
      `, {
        ':updated_at': now,
        ':data_json': JSON.stringify(obj),
        ':id': id
      });

      persist();
    },

    async listObjects(options?: { includeDeleted?: boolean }): Promise<OrbitBaseObject[]> {
      const database = getDb();
      const query = options?.includeDeleted
        ? 'SELECT data_json FROM objects'
        : 'SELECT data_json FROM objects WHERE is_deleted = 0';
      const stmt = database.prepare(query);
      const results: OrbitBaseObject[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(JSON.parse(row.data_json as string) as OrbitBaseObject);
      }
      stmt.free();
      return results;
    },

    async appendActivity(activity: OrbitActivityNode): Promise<void> {
      const database = getDb();
      
      const stmtCheck = database.prepare('SELECT payload_json FROM activity_log WHERE idempotency_key = :key');
      const existing = stmtCheck.getAsObject({ ':key': activity.idempotencyKey });
      stmtCheck.free();

      if (existing && existing.payload_json) {
        return;
      }

      database.run(`
        INSERT INTO activity_log (
          activity_id, session_id, device_id, actor_type, actor_id, action_type, target_object_id, payload_json, idempotency_key, signature, timestamp
        ) VALUES (:activity_id, :session_id, :device_id, :actor_type, :actor_id, :action_type, :target_object_id, :payload_json, :idempotency_key, :signature, :timestamp)
      `, {
        ':activity_id': activity.activityId,
        ':session_id': activity.sessionId || null,
        ':device_id': activity.deviceId || null,
        ':actor_type': activity.actor.type,
        ':actor_id': activity.actor.id,
        ':action_type': activity.actionType,
        ':target_object_id': activity.targetObjectId || null,
        ':payload_json': JSON.stringify(activity),
        ':idempotency_key': activity.idempotencyKey,
        ':signature': activity.signature || null,
        ':timestamp': activity.timestamp
      });

      persist();
    },

    async listActivities(): Promise<OrbitActivityNode[]> {
      const database = getDb();
      const stmt = database.prepare('SELECT payload_json FROM activity_log ORDER BY timestamp ASC');
      const results: OrbitActivityNode[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(JSON.parse(row.payload_json as string) as OrbitActivityNode);
      }
      stmt.free();
      return results;
    },

    async saveCapability(rule: CapabilityRule): Promise<void> {
      const database = getDb();
      database.run(`
        INSERT OR REPLACE INTO capabilities (rule_id, rule_json, created_at)
        VALUES (:rule_id, :rule_json, :created_at)
      `, {
        ':rule_id': rule.ruleId,
        ':rule_json': JSON.stringify(rule),
        ':created_at': Date.now()
      });

      persist();
    },

    async deleteCapability(ruleId: string): Promise<void> {
      const database = getDb();
      database.run('DELETE FROM capabilities WHERE rule_id = :id', { ':id': ruleId });
      persist();
    },

    async listCapabilities(): Promise<CapabilityRule[]> {
      const database = getDb();
      const stmt = database.prepare('SELECT rule_json FROM capabilities');
      const results: CapabilityRule[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(JSON.parse(row.rule_json as string) as CapabilityRule);
      }
      stmt.free();
      return results;
    },

    async getMetadata(key: string): Promise<string | null> {
      const database = getDb();
      const stmt = database.prepare('SELECT value FROM metadata WHERE key = :key');
      const res = stmt.getAsObject({ ':key': key });
      stmt.free();
      if (!res || res.value === undefined || res.value === null) {
        return null;
      }
      return res.value as string;
    },

    async setMetadata(key: string, value: string): Promise<void> {
      const database = getDb();
      database.run(`
        INSERT OR REPLACE INTO metadata (key, value)
        VALUES (:key, :value)
      `, {
        ':key': key,
        ':value': value
      });
      persist();
    },

    async close(): Promise<void> {
      if (db) {
        persist();
        db.close();
        db = null;
      }
    }
  };
}

import type { OrbitSessionObject, OrbitBaseObject, OrbitActivityNode } from '@orbitos/core-types';
import { createHash } from 'crypto';

export interface ContinuitySnapshot {
  sessionId: string;
  deviceId: string;
  appId: string;
  route: string;
  activeObjectId: string | null;
  appState: any;
  agentContext: any;
  timestamp: number;
  corrupted?: boolean;
  integrityFailed?: boolean;
  alreadyResumed?: boolean;
  resumedByDeviceId?: string;
  resumedAt?: number;
}

export interface RuntimeInterface {
  objects: {
    create<T extends OrbitBaseObject>(object: T): Promise<T>;
    get<T extends OrbitBaseObject>(id: string): Promise<T | null>;
    update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T>;
    list(options?: { includeDeleted?: boolean }): Promise<OrbitBaseObject[]>;
  };
  activities: {
    append(activity: OrbitActivityNode): Promise<void>;
  };
}

export interface ContinuityEngine {
  saveSessionSnapshot(
    sessionId: string,
    params: {
      deviceId: string;
      appId: string;
      route: string;
      activeObjectId: string | null;
      appState: any;
      agentContext: any;
    }
  ): Promise<OrbitSessionObject>;

  restoreSessionSnapshot(sessionId: string, restoringDeviceId: string): Promise<ContinuitySnapshot | null>;

  serializeAppState(appId: string, state: any): string;
  serializeObjectContext(object: OrbitBaseObject): string;
  serializeAgentContext(agentId: string, context: any): string;

  registerResumeCandidate(sessionId: string, targetDeviceId: string, options?: { ttl?: number }): Promise<void>;
  listResumeCandidates(targetDeviceId: string): Promise<OrbitSessionObject[]>;
}

function deepCloneAndFreeze<T>(obj: T): T {
  const clone = JSON.parse(JSON.stringify(obj));
  const freeze = (o: any) => {
    Object.freeze(o);
    Object.keys(o).forEach((prop) => {
      if (o[prop] !== null && (typeof o[prop] === "object") && !Object.isFrozen(o[prop])) {
        freeze(o[prop]);
      }
    });
    return o;
  };
  return freeze(clone);
}

function computeHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

class DefaultContinuityEngine implements ContinuityEngine {
  private runtime: RuntimeInterface;

  constructor(runtime: RuntimeInterface) {
    this.runtime = runtime;
  }

  async saveSessionSnapshot(
    sessionId: string,
    params: {
      deviceId: string;
      appId: string;
      route: string;
      activeObjectId: string | null;
      appState: any;
      agentContext: any;
    }
  ): Promise<OrbitSessionObject> {
    const now = Date.now();

    // 1. Validation checks
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Validation failed: sessionId cannot be empty');
    }
    if (!params.deviceId || params.deviceId.trim() === '') {
      throw new Error('Validation failed: deviceId cannot be empty');
    }
    if (!params.appId || params.appId.trim() === '') {
      throw new Error('Validation failed: appId cannot be empty');
    }
    if (!params.route || params.route.trim() === '') {
      throw new Error('Validation failed: route cannot be empty');
    }
    if (params.appState === undefined || params.appState === null || typeof params.appState !== 'object') {
      throw new Error('Validation failed: appState must be a valid object');
    }
    if (params.agentContext === undefined || params.agentContext === null || typeof params.agentContext !== 'object') {
      throw new Error('Validation failed: agentContext must be a valid object');
    }

    // Check if the session is soft-deleted
    const allObjects = await this.runtime.objects.list({ includeDeleted: true });
    const isSoftDeleted = allObjects.some(obj => obj.id === sessionId && obj.isDeleted);
    if (isSoftDeleted) {
      throw new Error('Validation failed: cannot save snapshot to a soft-deleted session');
    }

    const serializedState = JSON.stringify({
      appState: params.appState,
      agentContext: params.agentContext,
    });

    const hash = computeHash(serializedState);

    const existing = await this.runtime.objects.get<OrbitSessionObject>(sessionId);

    let updatedSession: OrbitSessionObject;

    if (existing) {
      if (existing.isDeleted) {
        throw new Error('Validation failed: cannot save snapshot to a soft-deleted session');
      }

      const updated: OrbitSessionObject = {
        ...existing,
        activeDeviceId: params.deviceId,
        activeAppId: params.appId,
        currentRoute: params.route,
        activeObjectId: params.activeObjectId,
        serializedStateJson: serializedState,
        updatedAt: now,
        metadata: {
          ...existing.metadata,
          snapshotVersion: 1,
          snapshotHash: hash,
          resumedByDeviceId: undefined, // Clear resumption on new snapshot
          resumedAt: undefined,
        },
      };
      updatedSession = await this.runtime.objects.update<OrbitSessionObject>(existing.id, updated);
    } else {
      const newSession: OrbitSessionObject = {
        id: sessionId,
        schemaType: 'session',
        ownerId: 'system',
        createdAt: now,
        updatedAt: now,
        syncSequence: 0,
        isDeleted: false,
        metadata: {
          snapshotVersion: 1,
          snapshotHash: hash,
        },
        knowledge: {
          summary: `Session snapshot for ${params.appId}`,
          tags: ['session', 'continuity'],
          embeddingsId: null,
          notes: '',
          relationships: [],
          versionHistory: [],
          auditTrail: [],
        },
        sessionId,
        activeDeviceId: params.deviceId,
        activeAppId: params.appId,
        currentRoute: params.route,
        activeObjectId: params.activeObjectId,
        serializedStateJson: serializedState,
        agentContextId: null,
      };
      updatedSession = await this.runtime.objects.create<OrbitSessionObject>(newSession);
    }

    // Log Activity Event
    const activityId = generateId('act');
    const activity: OrbitActivityNode = {
      activityId,
      sessionId: updatedSession.id,
      deviceId: params.deviceId,
      actor: { type: 'system', id: 'continuity-engine' },
      actionType: 'SESSION_SNAPSHOT_SAVED',
      targetObjectId: updatedSession.id,
      changesPayloadJson: JSON.stringify({ sessionId, appId: params.appId }),
      idempotencyKey: `idem_${activityId}`,
      signature: '',
      timestamp: now,
    };
    await this.runtime.activities.append(activity);

    return updatedSession;
  }

  async restoreSessionSnapshot(sessionId: string, restoringDeviceId: string): Promise<ContinuitySnapshot | null> {
    if (!restoringDeviceId || restoringDeviceId.trim() === '') {
      throw new Error('Validation failed: restoringDeviceId is required');
    }

    const session = await this.runtime.objects.get<OrbitSessionObject>(sessionId);
    if (!session || session.isDeleted) {
      return null;
    }

    const now = Date.now();

    // 1. Multi-Restore Protection
    if (session.metadata.resumedByDeviceId !== undefined && session.metadata.resumedByDeviceId !== null) {
      if (session.metadata.resumedByDeviceId !== restoringDeviceId) {
        // Return already-resumed state representation
        const resumedSnapshot: ContinuitySnapshot = {
          sessionId: session.sessionId,
          deviceId: session.activeDeviceId,
          appId: session.activeAppId,
          route: session.currentRoute,
          activeObjectId: session.activeObjectId,
          appState: {},
          agentContext: {},
          timestamp: session.updatedAt,
          alreadyResumed: true,
          resumedByDeviceId: session.metadata.resumedByDeviceId,
          resumedAt: session.metadata.resumedAt,
        };
        return deepCloneAndFreeze(resumedSnapshot);
      }
    } else {
      // First restore wins, update session record
      const updated: Partial<OrbitSessionObject> = {
        metadata: {
          ...session.metadata,
          resumedByDeviceId: restoringDeviceId,
          resumedAt: now,
        },
        updatedAt: now,
      };
      await this.runtime.objects.update<OrbitSessionObject>(session.id, updated);
      
      // Update our local instance reference to include the updated metadata fields
      session.metadata.resumedByDeviceId = restoringDeviceId;
      session.metadata.resumedAt = now;
      session.updatedAt = now;

      // Log Restore Activity
      const activityId = generateId('act');
      const activity: OrbitActivityNode = {
        activityId,
        sessionId: session.id,
        deviceId: restoringDeviceId,
        actor: { type: 'device', id: restoringDeviceId },
        actionType: 'SESSION_RESTORED',
        targetObjectId: session.id,
        changesPayloadJson: JSON.stringify({ sessionId, restoringDeviceId }),
        idempotencyKey: `idem_${activityId}`,
        signature: '',
        timestamp: now,
      };
      await this.runtime.activities.append(activity);
    }

    let appState = null;
    let agentContext = null;
    let corrupted = false;
    let integrityFailed = false;

    // 2. Corrupt Payload Recovery
    try {
      const parsed = JSON.parse(session.serializedStateJson);
      appState = parsed.appState;
      agentContext = parsed.agentContext;
    } catch (e) {
      appState = {};
      agentContext = {};
      corrupted = true;
    }

    // 3. Snapshot Integrity Hash
    if (!corrupted) {
      const computedHash = computeHash(session.serializedStateJson);
      if (session.metadata.snapshotHash !== computedHash) {
        integrityFailed = true;
      }
    }

    const snapshot: ContinuitySnapshot = {
      sessionId: session.sessionId,
      deviceId: session.activeDeviceId,
      appId: session.activeAppId,
      route: session.currentRoute,
      activeObjectId: session.activeObjectId,
      appState,
      agentContext,
      timestamp: session.updatedAt,
      corrupted,
      integrityFailed,
      resumedByDeviceId: session.metadata.resumedByDeviceId,
      resumedAt: session.metadata.resumedAt,
    };

    return deepCloneAndFreeze(snapshot);
  }

  serializeAppState(appId: string, state: any): string {
    return JSON.stringify({ appId, state, timestamp: Date.now() });
  }

  serializeObjectContext(object: OrbitBaseObject): string {
    return JSON.stringify({
      id: object.id,
      schemaType: object.schemaType,
      updatedAt: object.updatedAt,
    });
  }

  serializeAgentContext(agentId: string, context: any): string {
    return JSON.stringify({ agentId, context, timestamp: Date.now() });
  }

  async registerResumeCandidate(sessionId: string, targetDeviceId: string, options?: { ttl?: number }): Promise<void> {
    const session = await this.runtime.objects.get<OrbitSessionObject>(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const now = Date.now();
    const ttl = options?.ttl !== undefined ? options.ttl : 24 * 60 * 60 * 1000; // 24 hours default
    const expiresAt = now + ttl;

    const updated: Partial<OrbitSessionObject> = {
      metadata: {
        ...session.metadata,
        resumeTargetDeviceId: targetDeviceId,
        isResumeCandidate: true,
        expiresAt,
        resumedByDeviceId: undefined, // Clear resumption on new handoff
        resumedAt: undefined,
      },
      updatedAt: now,
    };

    await this.runtime.objects.update<OrbitSessionObject>(session.id, updated);

    // Log Activity Event
    const activityId = generateId('act');
    const activity: OrbitActivityNode = {
      activityId,
      sessionId: session.id,
      deviceId: session.activeDeviceId,
      actor: { type: 'system', id: 'continuity-engine' },
      actionType: 'SESSION_HANDOFF_REGISTERED',
      targetObjectId: session.id,
      changesPayloadJson: JSON.stringify({ sessionId, targetDeviceId, expiresAt }),
      idempotencyKey: `idem_${activityId}`,
      signature: '',
      timestamp: now,
    };
    await this.runtime.activities.append(activity);
  }

  async listResumeCandidates(targetDeviceId: string): Promise<OrbitSessionObject[]> {
    const allObjects = await this.runtime.objects.list();
    const sessions = allObjects.filter(
      (obj) => obj.schemaType === 'session' && !obj.isDeleted
    ) as OrbitSessionObject[];

    const now = Date.now();

    return sessions.filter((session) => {
      const meta = session.metadata;
      if (!meta) return false;
      
      const isCandidate = meta.isResumeCandidate === true;
      const isForDevice = meta.resumeTargetDeviceId === targetDeviceId;
      
      // Filter out expired candidates
      const isNotExpired = meta.expiresAt === undefined || meta.expiresAt === null || meta.expiresAt > now;

      return isCandidate && isForDevice && isNotExpired;
    });
  }
}

export function createContinuityEngine(options: { runtime: RuntimeInterface }): ContinuityEngine {
  return new DefaultContinuityEngine(options.runtime);
}

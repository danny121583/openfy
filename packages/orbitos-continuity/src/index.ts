import type { OrbitSessionObject, OrbitBaseObject } from '@orbitos/core-types';

export interface ContinuitySnapshot {
  sessionId: string;
  deviceId: string;
  appId: string;
  route: string;
  activeObjectId: string | null;
  appState: any;
  agentContext: any;
  timestamp: number;
}

export interface RuntimeInterface {
  objects: {
    create<T extends OrbitBaseObject>(object: T): Promise<T>;
    get<T extends OrbitBaseObject>(id: string): Promise<T | null>;
    update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T>;
    list(options?: { includeDeleted?: boolean }): Promise<OrbitBaseObject[]>;
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

  restoreSessionSnapshot(sessionId: string): Promise<ContinuitySnapshot | null>;

  serializeAppState(appId: string, state: any): string;
  serializeObjectContext(object: OrbitBaseObject): string;
  serializeAgentContext(agentId: string, context: any): string;

  registerResumeCandidate(sessionId: string, targetDeviceId: string): Promise<void>;
  listResumeCandidates(targetDeviceId: string): Promise<OrbitSessionObject[]>;
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
    const serializedState = JSON.stringify({
      appState: params.appState,
      agentContext: params.agentContext,
    });

    const existing = await this.runtime.objects.get<OrbitSessionObject>(sessionId);

    if (existing) {
      const updated: Partial<OrbitSessionObject> = {
        activeDeviceId: params.deviceId,
        activeAppId: params.appId,
        currentRoute: params.route,
        activeObjectId: params.activeObjectId,
        serializedStateJson: serializedState,
        updatedAt: now,
      };
      return await this.runtime.objects.update<OrbitSessionObject>(existing.id, updated);
    } else {
      const newSession: OrbitSessionObject = {
        id: sessionId,
        schemaType: 'session',
        ownerId: 'system',
        createdAt: now,
        updatedAt: now,
        syncSequence: 0,
        isDeleted: false,
        metadata: {},
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
      return await this.runtime.objects.create<OrbitSessionObject>(newSession);
    }
  }

  async restoreSessionSnapshot(sessionId: string): Promise<ContinuitySnapshot | null> {
    const session = await this.runtime.objects.get<OrbitSessionObject>(sessionId);
    if (!session || session.isDeleted) {
      return null;
    }

    let appState = null;
    let agentContext = null;

    try {
      const parsed = JSON.parse(session.serializedStateJson);
      appState = parsed.appState;
      agentContext = parsed.agentContext;
    } catch (e) {
      // Return unparsed or null state if parsing fails
    }

    return {
      sessionId: session.sessionId,
      deviceId: session.activeDeviceId,
      appId: session.activeAppId,
      route: session.currentRoute,
      activeObjectId: session.activeObjectId,
      appState,
      agentContext,
      timestamp: session.updatedAt,
    };
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

  async registerResumeCandidate(sessionId: string, targetDeviceId: string): Promise<void> {
    const session = await this.runtime.objects.get<OrbitSessionObject>(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const updated: Partial<OrbitSessionObject> = {
      metadata: {
        ...session.metadata,
        resumeTargetDeviceId: targetDeviceId,
        isResumeCandidate: true,
      },
      updatedAt: Date.now(),
    };

    await this.runtime.objects.update<OrbitSessionObject>(session.id, updated);
  }

  async listResumeCandidates(targetDeviceId: string): Promise<OrbitSessionObject[]> {
    const allObjects = await this.runtime.objects.list();
    const sessions = allObjects.filter(
      (obj) => obj.schemaType === 'session' && !obj.isDeleted
    ) as OrbitSessionObject[];

    return sessions.filter(
      (session) =>
        session.metadata &&
        session.metadata.isResumeCandidate === true &&
        session.metadata.resumeTargetDeviceId === targetDeviceId
    );
  }
}

export function createContinuityEngine(options: { runtime: RuntimeInterface }): ContinuityEngine {
  return new DefaultContinuityEngine(options.runtime);
}

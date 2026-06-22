import type { OrbitActivityNode } from '@orbitos/core-types';

export interface ActivityLog {
  append(activity: OrbitActivityNode): Promise<OrbitActivityNode>;
  list(): Promise<readonly OrbitActivityNode[]>;
  findByObject(objectId: string): Promise<OrbitActivityNode[]>;
  findByActor(actorId: string): Promise<OrbitActivityNode[]>;
  findBySession(sessionId: string): Promise<OrbitActivityNode[]>;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  Object.keys(obj as any).forEach((key) => {
    const prop = (obj as any)[key];
    if (typeof prop === 'object' && prop !== null && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });
  return obj;
}

export function createActivityLog(): ActivityLog {
  const logs: OrbitActivityNode[] = [];
  const idempotencyKeys = new Set<string>();

  return {
    async append(activity: OrbitActivityNode): Promise<OrbitActivityNode> {
      if (!activity.activityId) {
        throw new Error('Activity must have a valid activityId.');
      }
      if (!activity.idempotencyKey) {
        throw new Error('Activity must have a valid idempotencyKey.');
      }

      // Handle duplicate idempotency key deterministically
      if (idempotencyKeys.has(activity.idempotencyKey)) {
        const existing = logs.find(l => l.idempotencyKey === activity.idempotencyKey);
        if (existing) return existing;
        throw new Error(`Conflict error: duplicate idempotency key ${activity.idempotencyKey}`);
      }

      // Deep clone input to isolate from caller
      const cloned = deepClone(activity);
      
      // Deep freeze to prevent mutation of the returned and stored log entry
      const frozenNode = deepFreeze(cloned);

      logs.push(frozenNode);
      idempotencyKeys.add(activity.idempotencyKey);
      return frozenNode;
    },

    async list(): Promise<readonly OrbitActivityNode[]> {
      return Object.freeze(logs.map(log => deepFreeze(deepClone(log))));
    },

    async findByObject(objectId: string): Promise<OrbitActivityNode[]> {
      return logs.filter(log => log.targetObjectId === objectId).map(log => deepFreeze(deepClone(log)));
    },

    async findByActor(actorId: string): Promise<OrbitActivityNode[]> {
      return logs.filter(log => log.actor.id === actorId).map(log => deepFreeze(deepClone(log)));
    },

    async findBySession(sessionId: string): Promise<OrbitActivityNode[]> {
      return logs.filter(log => log.sessionId === sessionId).map(log => deepFreeze(deepClone(log)));
    }
  };
}

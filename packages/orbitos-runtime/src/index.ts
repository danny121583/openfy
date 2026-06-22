import { createCapabilityEngine } from '@orbitos/capabilities';
import type {
  OrbitBaseObject,
  OrbitObjectType,
  OrbitActivityNode,
  CapabilityRule,
  ApprovalLevel,
  OrbitStorageProvider,
  OrbitSyncEvent
} from '@orbitos/core-types';

export interface OrbitRuntime {
  sequence: {
    next(): Promise<number>;
    current(): Promise<number>;
  };
  objects: {
    create<T extends OrbitBaseObject>(object: T): Promise<T>;
    get<T extends OrbitBaseObject>(id: string): Promise<T | null>;
    update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    list(): Promise<OrbitBaseObject[]>;
  };
  activities: {
    list(): Promise<OrbitActivityNode[]>;
  };
  capabilities: {
    grant(rule: CapabilityRule): Promise<CapabilityRule>;
    revoke(ruleId: string): Promise<boolean>;
    check(params: {
      accessor: { type: 'app' | 'agent' | 'user_role'; id: string };
      scope: string;
      targetObjectType: OrbitObjectType;
      targetObjectId?: string;
      action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
    }): Promise<{
      allowed: boolean;
      approvalLevel: ApprovalLevel;
      reason?: string;
      matchedRuleId?: string;
    }>;
  };
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function createOrbitRuntime(options: { storageProvider: OrbitStorageProvider }): OrbitRuntime {
  const provider = options.storageProvider;

  const sequenceService = {
    async next(): Promise<number> {
      return await provider.transaction(async () => {
        const currentSeqStr = await provider.getMetadata('sys_local_sequence') || '0';
        const nextSeq = parseInt(currentSeqStr, 10) + 1;
        await provider.setMetadata('sys_local_sequence', nextSeq.toString());
        return nextSeq;
      });
    },
    async current(): Promise<number> {
      const currentSeqStr = await provider.getMetadata('sys_local_sequence') || '0';
      return parseInt(currentSeqStr, 10);
    }
  };

  return {
    sequence: sequenceService,

    objects: {
      async create<T extends OrbitBaseObject>(object: T): Promise<T> {
        const existing = await provider.getObject(object.id);
        if (existing) {
          throw new Error(`Duplicate object ID error: ${object.id} already exists.`);
        }

        const now = Date.now();
        const clone: OrbitBaseObject = JSON.parse(JSON.stringify(object));
        
        clone.createdAt = clone.createdAt || now;
        clone.updatedAt = clone.updatedAt || now;
        clone.isDeleted = false;
        
        clone.knowledge = {
          summary: clone.knowledge?.summary || '',
          tags: clone.knowledge?.tags || [],
          embeddingsId: clone.knowledge?.embeddingsId || null,
          notes: clone.knowledge?.notes || '',
          relationships: clone.knowledge?.relationships || [],
          versionHistory: clone.knowledge?.versionHistory || [],
          auditTrail: clone.knowledge?.auditTrail || []
        };

        await provider.transaction(async () => {
          const nextSeq = await sequenceService.next();
          clone.syncSequence = nextSeq;

          await provider.putObject(clone);

          const activityId = generateId('act');
          const activity: OrbitActivityNode = {
            activityId,
            sessionId: '',
            deviceId: '',
            actor: { type: 'system', id: 'runtime' },
            actionType: 'OBJECT_CREATE',
            targetObjectId: clone.id,
            changesPayloadJson: JSON.stringify(clone),
            idempotencyKey: `idem_${activityId}`,
            signature: '',
            timestamp: now
          };
          await provider.appendActivity(activity);

          const eventId = generateId('evt');
          await provider.enqueueSyncEvent({
            eventId,
            sequenceId: nextSeq,
            actionType: 'OBJECT_CREATE',
            targetObjectId: clone.id,
            payloadJson: JSON.stringify(clone),
            status: 'pending',
            retryCount: 0,
            createdAt: now,
            updatedAt: now
          });
        });

        return JSON.parse(JSON.stringify(clone)) as T;
      },

      async get<T extends OrbitBaseObject>(id: string): Promise<T | null> {
        const obj = await provider.getObject(id);
        if (!obj) return null;
        return JSON.parse(JSON.stringify(obj)) as T;
      },

      async update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T> {
        const existing = await provider.getObject(id);
        if (!existing) {
          throw new Error(`Object ID ${id} not found.`);
        }

        const now = Date.now();
        const patchClone = JSON.parse(JSON.stringify(patch));

        const updated: OrbitBaseObject = {
          ...existing,
          ...patchClone,
          updatedAt: now,
          id: existing.id,
          schemaType: existing.schemaType,
          knowledge: {
            ...existing.knowledge,
            ...(patchClone.knowledge || {}),
            relationships: patchClone.knowledge?.relationships || existing.knowledge.relationships
          }
        };

        await provider.transaction(async () => {
          const nextSeq = await sequenceService.next();
          updated.syncSequence = nextSeq;

          await provider.putObject(updated);

          const activityId = generateId('act');
          const activity: OrbitActivityNode = {
            activityId,
            sessionId: '',
            deviceId: '',
            actor: { type: 'system', id: 'runtime' },
            actionType: 'OBJECT_UPDATE',
            targetObjectId: id,
            changesPayloadJson: JSON.stringify(patchClone),
            idempotencyKey: `idem_${activityId}`,
            signature: '',
            timestamp: now
          };
          await provider.appendActivity(activity);

          const eventId = generateId('evt');
          await provider.enqueueSyncEvent({
            eventId,
            sequenceId: nextSeq,
            actionType: 'OBJECT_UPDATE',
            targetObjectId: id,
            payloadJson: JSON.stringify(updated),
            status: 'pending',
            retryCount: 0,
            createdAt: now,
            updatedAt: now
          });
        });

        return JSON.parse(JSON.stringify(updated)) as T;
      },

      async delete(id: string): Promise<boolean> {
        const existing = await provider.getObject(id);
        if (!existing) return false;

        let success = false;
        await provider.transaction(async () => {
          const nextSeq = await sequenceService.next();
          const now = Date.now();
          existing.isDeleted = true;
          existing.deletedAt = now;
          if (!existing.metadata) {
            existing.metadata = {};
          }
          existing.metadata.deleted_at = now;
          existing.syncSequence = nextSeq;
          existing.updatedAt = now;

          await provider.putObject(existing);
          success = true;

          const activityId = generateId('act');
          const activity: OrbitActivityNode = {
            activityId,
            sessionId: '',
            deviceId: '',
            actor: { type: 'system', id: 'runtime' },
            actionType: 'OBJECT_DELETE',
            targetObjectId: id,
            changesPayloadJson: '{}',
            idempotencyKey: `idem_${activityId}`,
            signature: '',
            timestamp: now
          };
          await provider.appendActivity(activity);

          const eventId = generateId('evt');
          await provider.enqueueSyncEvent({
            eventId,
            sequenceId: nextSeq,
            actionType: 'OBJECT_DELETE',
            targetObjectId: id,
            payloadJson: JSON.stringify(existing),
            status: 'pending',
            retryCount: 0,
            createdAt: now,
            updatedAt: now
          });
        });

        return success;
      },

      async list(): Promise<OrbitBaseObject[]> {
        const list = await provider.listObjects();
        return JSON.parse(JSON.stringify(list));
      }
    },

    activities: {
      async list(): Promise<OrbitActivityNode[]> {
        const list = await provider.listActivities();
        return JSON.parse(JSON.stringify(list));
      }
    },

    capabilities: {
      async grant(rule: CapabilityRule): Promise<CapabilityRule> {
        await provider.saveCapability(rule);
        return rule;
      },

      async revoke(ruleId: string): Promise<boolean> {
        const rules = await provider.listCapabilities();
        const exists = rules.some(r => r.ruleId === ruleId);
        if (!exists) return false;
        await provider.deleteCapability(ruleId);
        return true;
      },

      async check(params: {
        accessor: { type: 'app' | 'agent' | 'user_role'; id: string };
        scope: string;
        targetObjectType: OrbitObjectType;
        targetObjectId?: string;
        action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
      }) {
        const rulesList = await provider.listCapabilities();
        const engine = createCapabilityEngine();
        
        for (const rule of rulesList) {
          await engine.grant(rule);
        }

        return engine.check(params);
      }
    }
  };
}

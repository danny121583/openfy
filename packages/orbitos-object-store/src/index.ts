import type { OrbitBaseObject, OrbitObjectType, OrbitRelationship } from '@orbitos/core-types';

export interface ObjectStore {
  create<T extends OrbitBaseObject>(object: T): Promise<T>;
  get<T extends OrbitBaseObject>(id: string): Promise<T | null>;
  update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  list(): Promise<OrbitBaseObject[]>;
  query(filters: { schemaType?: OrbitObjectType }): Promise<OrbitBaseObject[]>;
  getRelationships(id: string): Promise<OrbitRelationship[]>;
  addRelationship(sourceId: string, targetId: string, relationType: string): Promise<boolean>;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function createObjectStore(): ObjectStore {
  const store = new Map<string, OrbitBaseObject>();

  return {
    async create<T extends OrbitBaseObject>(object: T): Promise<T> {
      if (store.has(object.id)) {
        throw new Error(`Duplicate object ID error: ${object.id} already exists.`);
      }

      const cloned = deepClone(object);
      const now = Date.now();
      
      cloned.createdAt = cloned.createdAt || now;
      cloned.updatedAt = cloned.updatedAt || now;
      cloned.isDeleted = false;
      cloned.syncSequence = cloned.syncSequence || 0;
      
      cloned.knowledge = {
        summary: cloned.knowledge?.summary || '',
        tags: cloned.knowledge?.tags || [],
        embeddingsId: cloned.knowledge?.embeddingsId || null,
        notes: cloned.knowledge?.notes || '',
        relationships: cloned.knowledge?.relationships || [],
        versionHistory: cloned.knowledge?.versionHistory || [],
        auditTrail: cloned.knowledge?.auditTrail || []
      };

      store.set(cloned.id, cloned);
      return deepClone(cloned) as unknown as T;
    },

    async get<T extends OrbitBaseObject>(id: string): Promise<T | null> {
      const obj = store.get(id);
      if (!obj || obj.isDeleted) return null;
      return deepClone(obj) as unknown as T;
    },

    async update<T extends OrbitBaseObject>(id: string, patch: Partial<T>): Promise<T> {
      const existing = store.get(id);
      if (!existing || existing.isDeleted) {
        throw new Error(`Object ID ${id} not found or deleted.`);
      }

      const now = Date.now();
      const clonedPatch = deepClone(patch);
      
      const updated: OrbitBaseObject = {
        ...existing,
        ...clonedPatch,
        updatedAt: now,
        id: existing.id, // Prevent ID changes
        schemaType: existing.schemaType, // Prevent schema type changes
        knowledge: {
          ...existing.knowledge,
          ...(clonedPatch.knowledge || {}),
          relationships: clonedPatch.knowledge?.relationships || existing.knowledge.relationships
        }
      };

      store.set(id, updated);
      return deepClone(updated) as unknown as T;
    },

    async delete(id: string): Promise<boolean> {
      const existing = store.get(id);
      if (!existing || existing.isDeleted) return false;

      existing.isDeleted = true;
      existing.updatedAt = Date.now();
      store.set(id, existing);
      return true;
    },

    async list(): Promise<OrbitBaseObject[]> {
      const items: OrbitBaseObject[] = [];
      for (const item of store.values()) {
        if (!item.isDeleted) {
          items.push(deepClone(item));
        }
      }
      return items;
    },

    async query(filters: { schemaType?: OrbitObjectType }): Promise<OrbitBaseObject[]> {
      const items: OrbitBaseObject[] = [];
      for (const item of store.values()) {
        if (item.isDeleted) continue;
        if (filters.schemaType && item.schemaType !== filters.schemaType) continue;
        items.push(deepClone(item));
      }
      return items;
    },

    async getRelationships(id: string): Promise<OrbitRelationship[]> {
      const existing = store.get(id);
      if (!existing || existing.isDeleted) {
        throw new Error(`Object ID ${id} not found or deleted.`);
      }
      return deepClone(existing.knowledge.relationships || []);
    },

    async addRelationship(sourceId: string, targetId: string, relationType: string): Promise<boolean> {
      const source = store.get(sourceId);
      if (!source || source.isDeleted) {
        throw new Error(`Source object ID ${sourceId} not found or deleted.`);
      }

      const relationships = source.knowledge.relationships || [];
      const alreadyExists = relationships.some(
        r => r.targetId === targetId && r.relationType === relationType
      );

      if (!alreadyExists) {
        relationships.push({ targetId, relationType });
        source.knowledge.relationships = relationships;
        source.updatedAt = Date.now();
        store.set(sourceId, source);
      }

      return true;
    }
  };
}

# @orbitos/object-store

In-memory implementation of the OrbitOS local-first Object Store, providing query, relationship mapping, and soft-delete capabilities.

## Usage

```typescript
import { createObjectStore } from '@orbitos/object-store';
import type { OrbitBaseObject } from '@orbitos/core-types';

const store = createObjectStore();

const userObj: OrbitBaseObject = {
  id: "usr_danny",
  schemaType: "user",
  ownerId: "usr_danny",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  syncSequence: 1,
  isDeleted: false,
  metadata: {},
  knowledge: {
    summary: "Danny's main user profile",
    tags: ["owner"],
    embeddingsId: null,
    notes: "",
    relationships: [],
    versionHistory: [],
    auditTrail: []
  }
};

// Create Object
await store.create(userObj);

// Retrieve Object
const user = await store.get("usr_danny");

// Update Object
await store.update("usr_danny", {
  metadata: { verified: true }
});

// Relationships
await store.addRelationship("usr_danny", "device_macbook", "owns");
const relations = await store.getRelationships("usr_danny");
```

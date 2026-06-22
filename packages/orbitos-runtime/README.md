# @orbitos/runtime

The core composer runtime for OrbitOS. Combines the core state mutations, capability checks, and automatically generates audit trail activities on object mutations.

## Storage Provider Agnostic Design

The OrbitOS runtime is fully **storage-provider agnostic**. It depends strictly on the `OrbitStorageProvider` interface defined in `@orbitos/core-types` rather than any specific database engine, sql.js, or direct filesystem/Tauri/native bindings.

This decoupled boundary ensures that you can swap out the database driver or physical storage engine without changing any runtime business logic, SDK namespaces, or application code.

### Supported & Future Storage Adapters
- **`@orbitos/storage-sqlite`**: The default WASM/WebAssembly SQLite adapter powered by `sql.js` (ideal for cross-platform Node, browser, and lightweight testing).
- **Tauri SQLite**: Adapter for desktop applications utilizing Tauri's native SQLite plugin.
- **Native SQLite / libSQL**: Adapter for server-side environments leveraging native C-bindings or Turso/libSQL for distributed edge databases.
- **Mobile SQLite**: Adapter utilizing React Native / Expo or Capacitor SQLite bindings.
- **Encrypted SQLite**: SQLCipher-backed adapter for high-security environments.

---

## Usage

```typescript
import { createSQLiteProvider } from '@orbitos/storage-sqlite';
import { createOrbitRuntime } from '@orbitos/runtime';

// 1. Initialize any provider implementing OrbitStorageProvider
const storageProvider = createSQLiteProvider({ databasePath: "./orbit.db" });
await storageProvider.initialize();

// 2. Compose runtime by injecting the provider
const runtime = createOrbitRuntime({ storageProvider });

// This mutation automatically runs within a database transaction,
// validates capabilities, and inserts an OBJECT_CREATE activity.
await runtime.objects.create({
  id: "doc_notes",
  schemaType: "document",
  ownerId: "usr_danny",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  syncSequence: 1,
  isDeleted: false,
  metadata: {},
  knowledge: {
    summary: "",
    tags: [],
    embeddingsId: null,
    notes: "",
    relationships: [],
    versionHistory: [],
    auditTrail: []
  }
});

// Query auto-emitted activities
const activities = await runtime.activities.list();
console.log(activities[0].actionType); // "OBJECT_CREATE"
```

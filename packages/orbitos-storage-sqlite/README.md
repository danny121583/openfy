# @orbitos/storage-sqlite

Persistent SQLite storage provider for OrbitOS objects, activity log entries, capability rules, and system metadata.

This package implements the `OrbitStorageProvider` interface defined in `@orbitos/core-types`. It is a pure WebAssembly-based implementation powered by `sql.js`, allowing it to run cross-platform (Node, browser, desktop, mobile) without requiring native node-gyp compilation.

## Storage Contract Implementation

This package is just one provider implementation. Future providers satisfying the `OrbitStorageProvider` interface may include:
- **Tauri SQLite**: Utilizing native SQLite bindings in desktop environments.
- **Native SQLite / libSQL**: C-bindings/Turso for server-side edge-based persistence.
- **Mobile SQLite**: Expo/React Native or Capacitor SQLite storage.
- **Encrypted SQLite**: Using SQLCipher for secure environments.

---

## Usage

```typescript
import { createSQLiteProvider } from '@orbitos/storage-sqlite';

const provider = createSQLiteProvider({ databasePath: "./orbit.db" });
await provider.initialize();

// Put Object
await provider.putObject({
  id: "doc_1",
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

// Get Object
const doc = await provider.getObject("doc_1");

// Metadata APIs
await provider.setMetadata("ring_signature", "sig_2026_xyz");
const metadataVal = await provider.getMetadata("ring_signature"); // "sig_2026_xyz"

// Transaction
await provider.transaction(async () => {
  // DB queries inside transaction blocks
});

await provider.close();
```

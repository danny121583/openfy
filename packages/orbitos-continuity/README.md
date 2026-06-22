# @orbitos/continuity

This package contains the foundation of the **OrbitOS Continuity Engine**. It is a pure runtime layer responsible for capturing, serializing, and restoring session states across the trusted device ring.

## Features

- **Session Snapshots**: Save and restore active running states (current route, active app, active object, serialized state).
- **Serialization Utilities**: Helper APIs to serialize application state, object focus context, and agent execution states.
- **Resume Registry**: Register and query session handoff candidates across devices.
- **Trusted Ring Distribution**: Since snapshots are stored as standard `OrbitSessionObject` entities in the OrbitOS Object Store, they automatically replicate to all other devices in the device ring via the Sync Engine.

## API Reference

### `createContinuityEngine(options: { runtime: RuntimeInterface })`
Instantiates a new Continuity Engine bound to the current runtime instance.

```typescript
import { createContinuityEngine } from '@orbitos/continuity';
import { createOrbitRuntime } from '@orbitos/runtime';

const runtime = createOrbitRuntime({ storageProvider });
const continuity = createContinuityEngine({ runtime });
```

### `saveSessionSnapshot(sessionId, params)`
Saves or updates the session snapshot in the Object Store.

```typescript
await continuity.saveSessionSnapshot("sess_101", {
  deviceId: "dev_phone",
  appId: "app_notes",
  route: "/notes/note_1",
  activeObjectId: "note_1",
  appState: { cursorPosition: 120, draftText: "Hello OrbitOS" },
  agentContext: { activeGoal: "help write note" }
});
```

### `restoreSessionSnapshot(sessionId)`
Retrieves a session and parses the serialized state.

```typescript
const snapshot = await continuity.restoreSessionSnapshot("sess_101");
console.log(snapshot.appState.draftText); // "Hello OrbitOS"
```

### `registerResumeCandidate(sessionId, targetDeviceId)`
Marks a session as candidate to be resumed by another target device.

```typescript
await continuity.registerResumeCandidate("sess_101", "dev_desktop");
```

### `listResumeCandidates(targetDeviceId)`
Queries all session snapshots that are registered as resume candidates for a given target device.

```typescript
const candidates = await continuity.listResumeCandidates("dev_desktop");
```

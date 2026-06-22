# @orbitos/activity-log

Immutable append-only activity logger for OrbitOS user, app, agent, and sync state transitions.

## Usage

```typescript
import { createActivityLog } from '@orbitos/activity-log';
import type { OrbitActivityNode } from '@orbitos/core-types';

const logger = createActivityLog();

const action: OrbitActivityNode = {
  activityId: "act_101",
  sessionId: "sess_01",
  deviceId: "dev_mac",
  actor: {
    type: "user",
    id: "usr_danny"
  },
  actionType: "OBJECT_CREATE",
  targetObjectId: "obj_doc_01",
  changesPayloadJson: "{}",
  idempotencyKey: "idem_act_101",
  signature: "sig_abc",
  timestamp: Date.now()
};

// Append to log (freezes the object)
await logger.append(action);

// Query
const list = await logger.list();
const byObject = await logger.findByObject("obj_doc_01");
const byActor = await logger.findByActor("usr_danny");
const bySession = await logger.findBySession("sess_01");
```

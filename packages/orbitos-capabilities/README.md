# @orbitos/capabilities

Dynamic security engine evaluating capability scopes, user roles, agent tools, and object level constraints for OrbitOS.

## Usage

```typescript
import { createCapabilityEngine } from '@orbitos/capabilities';
import type { CapabilityRule } from '@orbitos/core-types';

const engine = createCapabilityEngine();

// Grant rule
const rule: CapabilityRule = {
  ruleId: "rule_101",
  accessor: {
    type: "agent",
    id: "notes-agent"
  },
  permittedScope: "files.read",
  targetObjectType: "file",
  targetObjectIdConstraint: "obj_file_welcome",
  permittedActions: ["READ"],
  approvalLevel: "notify"
};

await engine.grant(rule);

// Evaluate access
const result = await engine.check({
  accessor: {
    type: "agent",
    id: "notes-agent"
  },
  scope: "files.read",
  targetObjectType: "file",
  targetObjectId: "obj_file_welcome",
  action: "READ"
});

console.log(result.allowed); // true
console.log(result.approvalLevel); // "notify"
```

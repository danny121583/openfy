const assert = require('assert');
const { createActivityLog } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/activity-log smoke tests...");
  const log = createActivityLog();

  const activity = {
    activityId: "act_1",
    sessionId: "sess_1",
    deviceId: "dev_1",
    actor: {
      type: "user",
      id: "usr_danny"
    },
    actionType: "OBJECT_CREATE",
    targetObjectId: "obj_1",
    changesPayloadJson: "{}",
    idempotencyKey: "idem_1",
    signature: "sig_1",
    timestamp: Date.now()
  };

  // Test append
  const appended = await log.append(activity);
  assert.strictEqual(appended.activityId, "act_1");
  console.log("✓ Append works");

  // Test duplicate idempotency key (deterministically ignores/returns existing)
  const appDuplicate = await log.append({
    ...activity,
    activityId: "act_2" // different ID but same idempotencyKey
  });
  assert.strictEqual(appDuplicate.activityId, "act_1"); // should return existing
  console.log("✓ Duplicate idempotency key handled");

  // Test query by actor
  const byActor = await log.findByActor("usr_danny");
  assert.strictEqual(byActor.length, 1);
  console.log("✓ Find by Actor works");

  // Test query by object
  const byObject = await log.findByObject("obj_1");
  assert.strictEqual(byObject.length, 1);
  console.log("✓ Find by Object works");

  // Test query by session
  const bySession = await log.findBySession("sess_1");
  assert.strictEqual(bySession.length, 1);
  console.log("✓ Find by Session works");

  // Test immutability
  try {
    appended.changesPayloadJson = '{"injected": true}';
  } catch (err) {
    // Should throw on modifying frozen object
    console.log("✓ Log entry is frozen (immutable)");
  }

  console.log("All @orbitos/activity-log smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

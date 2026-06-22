const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSQLiteProvider } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/storage-sqlite smoke tests...");
  const dbPath = path.join(__dirname, 'test.db');
  
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  let provider = createSQLiteProvider({ databasePath: dbPath });
  await provider.initialize();
  console.log("✓ SQLite Database initialized successfully");

  // Test Metadata APIs
  await provider.setMetadata("test_key", "hello_world");
  const initialMeta = await provider.getMetadata("test_key");
  assert.strictEqual(initialMeta, "hello_world");
  console.log("✓ Set/Get metadata works");

  // Metadata non-existent key returns null
  const nullMeta = await provider.getMetadata("non_existent");
  assert.strictEqual(nullMeta, null);
  console.log("✓ Non-existent metadata returns null");

  // Test restart metadata persistence
  await provider.close();
  provider = createSQLiteProvider({ databasePath: dbPath });
  await provider.initialize();
  const persistedMeta = await provider.getMetadata("test_key");
  assert.strictEqual(persistedMeta, "hello_world");
  console.log("✓ Metadata persists across restart");

  const testObj = {
    id: "doc_1",
    schemaType: "document",
    ownerId: "usr_danny",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncSequence: 1,
    isDeleted: false,
    metadata: { test: true },
    knowledge: {
      summary: "Smoke test file",
      tags: ["test"],
      embeddingsId: null,
      notes: "",
      relationships: [],
      versionHistory: [],
      auditTrail: []
    }
  };

  // Test put object
  await provider.putObject(testObj);
  console.log("✓ Put object works");

  // Test get object
  const retrieved = await provider.getObject("doc_1");
  assert.strictEqual(retrieved.id, "doc_1");
  assert.strictEqual(retrieved.metadata.test, true);
  console.log("✓ Get object works");

  // Test list objects
  const list = await provider.listObjects();
  assert.strictEqual(list.length, 1);
  console.log("✓ List objects works");

  // Test delete (soft delete)
  await provider.deleteObject("doc_1");
  const getAfterDelete = await provider.getObject("doc_1");
  assert.strictEqual(getAfterDelete, null);
  console.log("✓ Soft-delete object works (getObject returns null)");

  // Test default listObjects excludes deleted
  const listAfterDeleteDefault = await provider.listObjects();
  assert.strictEqual(listAfterDeleteDefault.length, 0);
  console.log("✓ Default listObjects() excludes deleted objects");

  // Test includeDeleted: true lists the soft-deleted object
  const listAfterDeleteIncluded = await provider.listObjects({ includeDeleted: true });
  assert.strictEqual(listAfterDeleteIncluded.length, 1);
  assert.strictEqual(listAfterDeleteIncluded[0].id, "doc_1");
  assert.strictEqual(listAfterDeleteIncluded[0].isDeleted, true);
  console.log("✓ listObjects({ includeDeleted: true }) includes soft-deleted objects");

  // Test append activity
  const activity = {
    activityId: "act_101",
    sessionId: "sess_1",
    deviceId: "dev_1",
    actor: {
      type: "user",
      id: "usr_danny"
    },
    actionType: "OBJECT_CREATE",
    targetObjectId: "doc_1",
    changesPayloadJson: "{}",
    idempotencyKey: "idem_101",
    signature: "sig_abc",
    timestamp: Date.now()
  };

  await provider.appendActivity(activity);
  console.log("✓ Append activity works");

  // Duplicate idempotency key handles safely (does not insert duplicate activity)
  await provider.appendActivity({
    ...activity,
    activityId: "act_102"
  });
  console.log("✓ Duplicate activity idempotency key handled safely");

  // Test list activities
  const activities = await provider.listActivities();
  assert.strictEqual(activities.length, 1);
  assert.strictEqual(activities[0].activityId, "act_101");
  console.log("✓ List activities works");

  // Test save capability rule
  const rule = {
    ruleId: "rule_1",
    accessor: { type: "agent", id: "notes-agent" },
    permittedScope: "files.read",
    targetObjectType: "file",
    permittedActions: ["READ"],
    approvalLevel: "silent"
  };

  await provider.saveCapability(rule);
  console.log("✓ Save capability works");

  // Test list capabilities
  const rules = await provider.listCapabilities();
  assert.strictEqual(rules.length, 1);
  assert.strictEqual(rules[0].ruleId, "rule_1");
  console.log("✓ List capabilities works");

  // Test delete capability
  await provider.deleteCapability("rule_1");
  const rulesAfterRev = await provider.listCapabilities();
  assert.strictEqual(rulesAfterRev.length, 0);
  console.log("✓ Revoke/delete capability works");

  await provider.close();
  console.log("✓ Close DB works");

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  console.log("All @orbitos/storage-sqlite smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

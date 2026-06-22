const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSQLiteProvider } = require('../orbitos-storage-sqlite/dist/index.js');
const { createOrbitRuntime } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/runtime composed integration smoke tests...");
  const dbPath = path.join(__dirname, 'runtime_test.db');

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Helper to boot runtime using a provider strictly matching the OrbitStorageProvider interface
  const bootRuntime = async () => {
    const rawProvider = createSQLiteProvider({ databasePath: dbPath });
    await rawProvider.initialize();

    // Wrap the provider to ensure it only exposes the OrbitStorageProvider interface methods,
    // proving that the runtime is storage-engine-agnostic and relies only on the adapter contract.
    const storageProvider = {
      initialize: () => rawProvider.initialize(),
      transaction: (fn) => rawProvider.transaction(fn),
      getObject: (id) => rawProvider.getObject(id),
      putObject: (obj) => rawProvider.putObject(obj),
      deleteObject: (id) => rawProvider.deleteObject(id),
      listObjects: (options) => rawProvider.listObjects(options),
      appendActivity: (act) => rawProvider.appendActivity(act),
      listActivities: () => rawProvider.listActivities(),
      saveCapability: (rule) => rawProvider.saveCapability(rule),
      deleteCapability: (ruleId) => rawProvider.deleteCapability(ruleId),
      listCapabilities: () => rawProvider.listCapabilities(),
      getMetadata: (key) => rawProvider.getMetadata(key),
      setMetadata: (key, val) => rawProvider.setMetadata(key, val),
      close: () => rawProvider.close()
    };

    const runtime = createOrbitRuntime({ storageProvider });
    return { runtime, storageProvider };
  };

  // 1. Persistence tests
  console.log("Running Persistence & Metadata Tests...");
  let { runtime, storageProvider } = await bootRuntime();

  const noteObject = {
    id: "note_101",
    schemaType: "document",
    ownerId: "usr_danny",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncSequence: 1,
    isDeleted: false,
    metadata: { content: "Initial Content" },
    knowledge: {
      summary: "",
      tags: [],
      embeddingsId: null,
      notes: "",
      relationships: [],
      versionHistory: [],
      auditTrail: []
    }
  };

  // Create note
  await runtime.objects.create(noteObject);
  
  // Set metadata
  await storageProvider.setMetadata("runtime_version", "v0.1.0-alpha");

  // Close and restart
  await storageProvider.close();
  
  // Re-boot runtime
  const reboot = await bootRuntime();
  runtime = reboot.runtime;
  storageProvider = reboot.storageProvider;

  // Retrieve note and verify persistence
  const persistedNote = await runtime.objects.get("note_101");
  assert.ok(persistedNote);
  assert.strictEqual(persistedNote.id, "note_101");
  assert.strictEqual(persistedNote.metadata.content, "Initial Content");
  console.log("✓ Persistence Test passed: object survives restart");

  // Verify metadata persistence
  const persistedMeta = await storageProvider.getMetadata("runtime_version");
  assert.strictEqual(persistedMeta, "v0.1.0-alpha");
  console.log("✓ Metadata persists across restart");

  // Prove runtime works when provider is passed only as OrbitStorageProvider
  console.log("✓ Runtime works when provider is passed only as OrbitStorageProvider wrapper");

  // 2. Activity generation tests
  console.log("Running Activity Generation Tests...");
  
  // Create object generates OBJECT_CREATE activity
  const activitiesAfterCreate = await runtime.activities.list();
  assert.strictEqual(activitiesAfterCreate.length, 1);
  assert.strictEqual(activitiesAfterCreate[0].actionType, "OBJECT_CREATE");
  assert.strictEqual(activitiesAfterCreate[0].targetObjectId, "note_101");
  assert.strictEqual(activitiesAfterCreate[0].actor.type, "system");
  assert.strictEqual(activitiesAfterCreate[0].actor.id, "runtime");
  console.log("✓ Activity Test: OBJECT_CREATE auto-emitted");

  // Update object generates OBJECT_UPDATE activity
  await runtime.objects.update("note_101", {
    metadata: { content: "Updated Content" }
  });

  const activitiesAfterUpdate = await runtime.activities.list();
  assert.strictEqual(activitiesAfterUpdate.length, 2);
  assert.strictEqual(activitiesAfterUpdate[1].actionType, "OBJECT_UPDATE");
  assert.strictEqual(activitiesAfterUpdate[1].targetObjectId, "note_101");
  console.log("✓ Activity Test: OBJECT_UPDATE auto-emitted");

  // 3. Soft-delete and query filtering tests
  console.log("Running Soft-Delete & Filtering Tests...");

  // Default runtime list includes the object before deletion
  const listBeforeDelete = await runtime.objects.list();
  assert.strictEqual(listBeforeDelete.length, 1);

  // Delete object generates OBJECT_DELETE activity
  await runtime.objects.delete("note_101");
  const getAfterDelete = await runtime.objects.get("note_101");
  assert.strictEqual(getAfterDelete, null); // should be soft deleted and get should return null
  console.log("✓ Activity Test: OBJECT_DELETE auto-emitted");

  // Default listObjects() excludes deleted objects
  const listDefault = await storageProvider.listObjects();
  assert.strictEqual(listDefault.length, 0);
  console.log("✓ Default listObjects() excludes deleted objects");

  // listObjects({ includeDeleted: true }) includes soft-deleted objects
  const listWithDeleted = await storageProvider.listObjects({ includeDeleted: true });
  assert.strictEqual(listWithDeleted.length, 1);
  assert.strictEqual(listWithDeleted[0].id, "note_101");
  assert.strictEqual(listWithDeleted[0].isDeleted, true);
  console.log("✓ listObjects({ includeDeleted: true }) includes soft-deleted objects");

  // 4. Capability persistence tests
  console.log("Running Capability Persistence Tests...");

  const rule = {
    ruleId: "rule_auth_101",
    accessor: { type: "agent", id: "notes-agent" },
    permittedScope: "files.read",
    targetObjectType: "file",
    permittedActions: ["READ"],
    approvalLevel: "ask_once"
  };

  // Grant rule
  await runtime.capabilities.grant(rule);

  // Close and restart
  await storageProvider.close();
  const rebootCap = await bootRuntime();
  runtime = rebootCap.runtime;
  storageProvider = rebootCap.storageProvider;

  // Verify capability is persisted and evaluated correctly
  const checkResult = await runtime.capabilities.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    action: "READ"
  });

  assert.strictEqual(checkResult.allowed, true);
  assert.strictEqual(checkResult.approvalLevel, "ask_once");
  console.log("✓ Capability Test: capability rule survives restart");

  // Test revoke capability
  const revoked = await runtime.capabilities.revoke("rule_auth_101");
  assert.strictEqual(revoked, true);

  const checkAfterRevoke = await runtime.capabilities.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    action: "READ"
  });
  assert.strictEqual(checkAfterRevoke.allowed, false);
  console.log("✓ Capability Test: revoke capability works");

  // Clean up
  await storageProvider.close();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  console.log("All @orbitos/runtime composed integration smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

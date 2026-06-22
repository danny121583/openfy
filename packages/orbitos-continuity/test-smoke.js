const assert = require('assert');
const { createContinuityEngine } = require('./dist/index.js');
const { createOrbitRuntime } = require('@orbitos/runtime');
const { createSQLiteProvider } = require('@orbitos/storage-sqlite');
const { createHash } = require('crypto');

function computeHash(data) {
  return createHash('sha256').update(data).digest('hex');
}

async function run() {
  console.log("Running @orbitos/continuity Phase 3A.1 hardened smoke tests...");

  // Initialize SQLite memory database and OrbitRuntime
  const provider = createSQLiteProvider({ databasePath: ':memory:' });
  await provider.initialize();

  const runtime = createOrbitRuntime({ storageProvider: provider });
  const continuity = createContinuityEngine({ runtime });

  // 1. Test Immutable Snapshots
  console.log("-> Testing Immutable Snapshots...");
  const session1 = await continuity.saveSessionSnapshot("sess_1", {
    deviceId: "dev_phone",
    appId: "app_notes",
    route: "/notes",
    activeObjectId: "note_1",
    appState: { text: "hello" },
    agentContext: { active: true }
  });

  const snapshot = await continuity.restoreSessionSnapshot("sess_1", "dev_phone");
  assert.ok(snapshot);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.appState));
  assert.ok(Object.isFrozen(snapshot.agentContext));

  try {
    snapshot.route = "/new";
    assert.strictEqual(snapshot.route, "/notes");
  } catch (err) {
    assert.ok(err instanceof TypeError);
  }

  try {
    snapshot.appState.text = "mutated";
    assert.strictEqual(snapshot.appState.text, "hello");
  } catch (err) {
    assert.ok(err instanceof TypeError);
  }
  console.log("✓ Snapshot structure is deeply frozen and immutable");

  // 2. Test Validation Layer
  console.log("-> Testing Validation Layer...");
  await assert.rejects(
    continuity.saveSessionSnapshot("", { deviceId: "d", appId: "a", route: "r", appState: {}, agentContext: {} }),
    /sessionId cannot be empty/
  );
  await assert.rejects(
    continuity.saveSessionSnapshot("s", { deviceId: "", appId: "a", route: "r", appState: {}, agentContext: {} }),
    /deviceId cannot be empty/
  );
  await assert.rejects(
    continuity.saveSessionSnapshot("s", { deviceId: "d", appId: "", route: "r", appState: {}, agentContext: {} }),
    /appId cannot be empty/
  );
  await assert.rejects(
    continuity.saveSessionSnapshot("s", { deviceId: "d", appId: "a", route: "", appState: {}, agentContext: {} }),
    /route cannot be empty/
  );
  await assert.rejects(
    continuity.saveSessionSnapshot("s", { deviceId: "d", appId: "a", route: "r", appState: null, agentContext: {} }),
    /appState must be a valid object/
  );
  await assert.rejects(
    continuity.saveSessionSnapshot("s", { deviceId: "d", appId: "a", route: "r", appState: {}, agentContext: "bad" }),
    /agentContext must be a valid object/
  );
  console.log("✓ Empty identifiers and malformed parameters rejected successfully");

  // 3. Test Soft Delete Protection
  console.log("-> Testing Soft Delete Protection...");
  await runtime.objects.delete("sess_1");

  const restoredDeleted = await continuity.restoreSessionSnapshot("sess_1", "dev_phone");
  assert.strictEqual(restoredDeleted, null);

  await assert.rejects(
    continuity.saveSessionSnapshot("sess_1", {
      deviceId: "dev_phone",
      appId: "app_notes",
      route: "/notes",
      activeObjectId: "note_1",
      appState: {},
      agentContext: {}
    }),
    /cannot save snapshot to a soft-deleted session/
  );
  console.log("✓ Soft-deleted sessions cannot be saved to or restored");

  // 4. Test Corrupt Snapshot Recovery
  console.log("-> Testing Corrupt Snapshot Recovery...");
  // Create a new valid snapshot
  await continuity.saveSessionSnapshot("sess_corrupt", {
    deviceId: "dev_tablet",
    appId: "app_kds",
    route: "/kds",
    activeObjectId: "kds_1",
    appState: { items: [1] },
    agentContext: { active: false }
  });

  // Tamper database value directly to bad JSON
  const rawSession = await provider.getObject("sess_corrupt");
  rawSession.serializedStateJson = "{corrupt_json_payload";
  await provider.putObject(rawSession);

  const restoredCorrupt = await continuity.restoreSessionSnapshot("sess_corrupt", "dev_tablet");
  assert.ok(restoredCorrupt);
  assert.strictEqual(restoredCorrupt.corrupted, true);
  assert.deepStrictEqual(restoredCorrupt.appState, {});
  assert.deepStrictEqual(restoredCorrupt.agentContext, {});
  assert.strictEqual(restoredCorrupt.appId, "app_kds");
  assert.strictEqual(restoredCorrupt.route, "/kds");
  console.log("✓ Corrupt JSON payload falls back to empty states with corrupted flag");

  // 5. Test Snapshot Versioning
  console.log("-> Testing Snapshot Versioning...");
  const freshSession = await continuity.saveSessionSnapshot("sess_versioned", {
    deviceId: "dev_desktop",
    appId: "app_editor",
    route: "/editor",
    activeObjectId: null,
    appState: { content: "v1" },
    agentContext: {}
  });
  assert.strictEqual(freshSession.metadata.snapshotVersion, 1);
  console.log("✓ New snapshots are stamped with snapshotVersion = 1");

  // 6. Test Snapshot Integrity Hash
  console.log("-> Testing Snapshot Integrity Hash...");
  assert.ok(freshSession.metadata.snapshotHash);
  const expectedHash = computeHash(freshSession.serializedStateJson);
  assert.strictEqual(freshSession.metadata.snapshotHash, expectedHash);

  // Tamper metadata hash directly
  const rawVersioned = await provider.getObject("sess_versioned");
  rawVersioned.metadata.snapshotHash = "badhash123";
  await provider.putObject(rawVersioned);

  const restoredTampered = await continuity.restoreSessionSnapshot("sess_versioned", "dev_desktop");
  assert.ok(restoredTampered);
  assert.strictEqual(restoredTampered.integrityFailed, true);
  console.log("✓ Snapshot tampering detected via SHA-256 mismatch");

  // 7. Test Expiration Logic
  console.log("-> Testing Candidate Expiration Logic...");
  await continuity.saveSessionSnapshot("sess_expired", {
    deviceId: "dev_phone",
    appId: "app_notes",
    route: "/notes",
    activeObjectId: null,
    appState: {},
    agentContext: {}
  });

  // Register candidate that is already expired
  await continuity.registerResumeCandidate("sess_expired", "dev_tablet", { ttl: -1000 });
  let candidates = await continuity.listResumeCandidates("dev_tablet");
  assert.strictEqual(candidates.length, 0);

  // Register candidate that is active
  await continuity.registerResumeCandidate("sess_expired", "dev_tablet", { ttl: 60 * 1000 });
  candidates = await continuity.listResumeCandidates("dev_tablet");
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].id, "sess_expired");
  console.log("✓ Candidates list respects expiresAt filter rules");

  // 8. Test Multi-Restore Protection
  console.log("-> Testing Multi-Restore Protection...");
  await continuity.saveSessionSnapshot("sess_handoff", {
    deviceId: "dev_phone",
    appId: "app_notes",
    route: "/notes",
    activeObjectId: null,
    appState: { content: "handoff content" },
    agentContext: {}
  });

  // First restore by dev_tablet
  const restore1 = await continuity.restoreSessionSnapshot("sess_handoff", "dev_tablet");
  assert.ok(restore1);
  assert.strictEqual(restore1.alreadyResumed, undefined);
  assert.strictEqual(restore1.resumedByDeviceId, "dev_tablet");

  // Second restore by dev_desktop (should block and return alreadyResumed)
  const restore2 = await continuity.restoreSessionSnapshot("sess_handoff", "dev_desktop");
  assert.ok(restore2);
  assert.strictEqual(restore2.alreadyResumed, true);
  assert.strictEqual(restore2.resumedByDeviceId, "dev_tablet");
  assert.ok(restore2.resumedAt);
  console.log("✓ Multi-restore collision prevented (first restore wins)");

  // 9. Test Activity Logging
  console.log("-> Testing Activity Logging...");
  const activities = await runtime.activities.list();
  const types = activities.map(a => a.actionType);

  assert.ok(types.includes("SESSION_SNAPSHOT_SAVED"));
  assert.ok(types.includes("SESSION_HANDOFF_REGISTERED"));
  assert.ok(types.includes("SESSION_RESTORED"));
  console.log("✓ Continuity operations append structured activity logs");

  // Cleanup
  await provider.close();
  console.log("All @orbitos/continuity Phase 3A.1 hardened smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  if (err && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});

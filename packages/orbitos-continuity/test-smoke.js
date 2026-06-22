const assert = require('assert');
const { createContinuityEngine } = require('./dist/index.js');
const { createOrbitRuntime } = require('@orbitos/runtime');
const { createSQLiteProvider } = require('@orbitos/storage-sqlite');

async function run() {
  console.log("Running @orbitos/continuity smoke tests...");

  // Initialize SQLite memory database and OrbitRuntime
  const provider = createSQLiteProvider({ databasePath: ':memory:' });
  await provider.initialize();

  const runtime = createOrbitRuntime({ storageProvider: provider });

  // Instantiate the Continuity Engine
  const continuity = createContinuityEngine({ runtime });

  // 1. Test saveSessionSnapshot
  console.log("-> Testing saveSessionSnapshot...");
  const appId = "app_kds";
  const deviceId = "device_tablet_1";
  const route = "/orders/new";
  const activeObjectId = "order_abc";
  const appState = { cartItemsCount: 3, totalAmount: 45.5 };
  const agentContext = { lastIntent: "add_item", userQuery: "add cheese burger" };

  const sessionObj = await continuity.saveSessionSnapshot("sess_kds_1", {
    deviceId,
    appId,
    route,
    activeObjectId,
    appState,
    agentContext
  });

  assert.strictEqual(sessionObj.id, "sess_kds_1");
  assert.strictEqual(sessionObj.schemaType, "session");
  assert.strictEqual(sessionObj.activeDeviceId, deviceId);
  assert.strictEqual(sessionObj.activeAppId, appId);
  assert.strictEqual(sessionObj.currentRoute, route);
  assert.strictEqual(sessionObj.activeObjectId, activeObjectId);
  console.log("✓ saveSessionSnapshot creates and returns OrbitSessionObject");

  // Verify DB state
  const rawSession = await runtime.objects.get("sess_kds_1");
  assert.ok(rawSession);
  assert.strictEqual(rawSession.activeAppId, appId);
  console.log("✓ Session snapshot successfully persisted in Object Store");

  // 2. Test restoreSessionSnapshot
  console.log("-> Testing restoreSessionSnapshot...");
  const snapshot = await continuity.restoreSessionSnapshot("sess_kds_1");
  assert.ok(snapshot);
  assert.strictEqual(snapshot.sessionId, "sess_kds_1");
  assert.strictEqual(snapshot.appId, appId);
  assert.strictEqual(snapshot.deviceId, deviceId);
  assert.strictEqual(snapshot.route, route);
  assert.strictEqual(snapshot.activeObjectId, activeObjectId);
  assert.deepStrictEqual(snapshot.appState, appState);
  assert.deepStrictEqual(snapshot.agentContext, agentContext);
  console.log("✓ restoreSessionSnapshot correctly reconstructs snapshot properties and payloads");

  // Test restore missing session
  const missing = await continuity.restoreSessionSnapshot("sess_nonexistent");
  assert.strictEqual(missing, null);
  console.log("✓ restoreSessionSnapshot returns null for missing sessions");

  // 3. Test Serialization Utilities
  console.log("-> Testing Serialization utilities...");
  const serializedApp = continuity.serializeAppState(appId, appState);
  assert.ok(serializedApp.includes(appId));
  assert.ok(serializedApp.includes("cartItemsCount"));
  
  const serializedObj = continuity.serializeObjectContext(sessionObj);
  assert.ok(serializedObj.includes(sessionObj.id));
  assert.ok(serializedObj.includes("session"));

  const serializedAgent = continuity.serializeAgentContext("notes-agent", agentContext);
  assert.ok(serializedAgent.includes("notes-agent"));
  assert.ok(serializedAgent.includes("lastIntent"));
  console.log("✓ Serialization utility functions encode correct structures");

  // 4. Test Resume Candidates Registry
  console.log("-> Testing Resume Candidates registry...");
  // Register sess_kds_1 for dev_desktop
  await continuity.registerResumeCandidate("sess_kds_1", "dev_desktop");
  console.log("✓ registerResumeCandidate registers candidate metadata flag");

  // Query resume candidates for dev_desktop
  const candidatesForDesktop = await continuity.listResumeCandidates("dev_desktop");
  assert.strictEqual(candidatesForDesktop.length, 1);
  assert.strictEqual(candidatesForDesktop[0].id, "sess_kds_1");
  assert.strictEqual(candidatesForDesktop[0].metadata.isResumeCandidate, true);
  assert.strictEqual(candidatesForDesktop[0].metadata.resumeTargetDeviceId, "dev_desktop");
  console.log("✓ listResumeCandidates filters and returns candidates targeted to device");

  // Query resume candidates for dev_phone (should be empty)
  const candidatesForPhone = await continuity.listResumeCandidates("dev_phone");
  assert.strictEqual(candidatesForPhone.length, 0);
  console.log("✓ listResumeCandidates returns empty list when no matches exist");

  // Cleanup
  await provider.close();
  console.log("✓ Provider closed successfully");

  console.log("All @orbitos/continuity smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  console.error("Error type:", typeof err);
  console.error("Error keys:", err ? Object.keys(err) : "null");
  if (err && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});

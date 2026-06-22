const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSQLiteProvider } = require('../orbitos-storage-sqlite/dist/index.js');
const { createOrbitRuntime } = require('../orbitos-runtime/dist/index.js');
const { SyncSequenceEngine, MockNetwork } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/sync-engine smoke tests...");

  const dbPathA = path.join(__dirname, 'device_a.db');
  const dbPathB = path.join(__dirname, 'device_b.db');

  if (fs.existsSync(dbPathA)) fs.unlinkSync(dbPathA);
  if (fs.existsSync(dbPathB)) fs.unlinkSync(dbPathB);

  const bootDevice = async (deviceId, dbPath) => {
    const provider = createSQLiteProvider({ databasePath: dbPath });
    await provider.initialize();
    const runtime = createOrbitRuntime({ storageProvider: provider });
    const syncEngine = new SyncSequenceEngine(deviceId, provider);
    return { provider, runtime, syncEngine };
  };

  // 1. Initialize two independent devices
  const devA = await bootDevice("device_a", dbPathA);
  const devB = await bootDevice("device_b", dbPathB);

  const network = new MockNetwork();
  network.register(devA.syncEngine);
  network.register(devB.syncEngine);

  console.log("✓ Devices initialized and registered to MockNetwork");

  // 2. Perform mutation on A while B is offline
  network.setOnline("device_b", false);
  console.log("-> Set device_b offline");

  const noteObject = {
    id: "note_101",
    schemaType: "document",
    ownerId: "usr_danny",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncSequence: 0,
    isDeleted: false,
    metadata: { title: "Original Title", content: "A's initial note text" },
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

  // Create on A
  await devA.runtime.objects.create(noteObject);
  
  // Update on A
  await devA.runtime.objects.update("note_101", {
    metadata: { title: "A's Edit", content: "A's modified note text" }
  });

  // Verify B has no knowledge of it yet
  const noteOnBBefore = await devB.runtime.objects.get("note_101");
  assert.strictEqual(noteOnBBefore, null);
  console.log("✓ Device B does not have the note while offline");

  // 3. Bring B online and replicate
  network.setOnline("device_b", true);
  console.log("-> Set device_b online");

  // Sync from A to B
  const syncSuccess = await network.sync("device_a", "device_b");
  assert.strictEqual(syncSuccess, true);
  console.log("✓ Replication from A to B completed");

  // Verify B now has the synced object with A's edit
  const noteOnBAfter = await devB.runtime.objects.get("note_101");
  assert.ok(noteOnBAfter);
  assert.strictEqual(noteOnBAfter.metadata.title, "A's Edit");
  assert.strictEqual(noteOnBAfter.syncSequence, 2);
  console.log("✓ Device B successfully replicated the note object and sequence number");

  // Verify B's metadata tracks A's watermarks
  const watermarkOnB = await devB.syncEngine.getPeerSequence("device_a");
  assert.strictEqual(watermarkOnB, 2);
  console.log("✓ Device B watermark sequence for device_a is correctly set to 2");

  // 4. Test Last-Write-Wins Conflict Resolution
  console.log("Running Conflict Resolution Tests...");
  network.setOnline("device_b", false);

  // Device A updates note at timestamp T1
  const t1 = Date.now();
  const updatedA = {
    ...noteOnBAfter,
    updatedAt: t1,
    metadata: { title: "Title Conflict A", content: "Edited by A" }
  };
  await devA.provider.putObject(updatedA);
  await devA.provider.enqueueSyncEvent({
    eventId: "evt_conf_a",
    actionType: "OBJECT_UPDATE",
    targetObjectId: "note_101",
    payloadJson: JSON.stringify(updatedA),
    timestamp: t1
  });
  // Update local sequence for A
  await devA.provider.setMetadata("sys_local_sequence", "3");

  // Wait a small delay to guarantee B's update has a strictly newer timestamp
  await new Promise(resolve => setTimeout(resolve, 100));

  // Device B updates same note at timestamp T2 (Later, wins conflict)
  const t2 = Date.now();
  const updatedB = {
    ...noteOnBAfter,
    updatedAt: t2,
    metadata: { title: "Title Conflict B", content: "Edited by B" }
  };
  await devB.provider.putObject(updatedB);
  await devB.provider.enqueueSyncEvent({
    eventId: "evt_conf_b",
    actionType: "OBJECT_UPDATE",
    targetObjectId: "note_101",
    payloadJson: JSON.stringify(updatedB),
    timestamp: t2
  });
  // Update local sequence for B
  await devB.provider.setMetadata("sys_local_sequence", "3");

  network.setOnline("device_b", true);

  // Sync B to A (B's newer changes flow to A)
  await network.sync("device_b", "device_a");
  const noteOnAConflict = await devA.runtime.objects.get("note_101");
  assert.strictEqual(noteOnAConflict.metadata.title, "Title Conflict B");
  console.log("✓ Sync B -> A: Device B wins the conflict (newer updatedAt wins)");

  // Sync A to B (A's older changes flow to B, should be ignored by B)
  await network.sync("device_a", "device_b");
  const noteOnBConflict = await devB.runtime.objects.get("note_101");
  assert.strictEqual(noteOnBConflict.metadata.title, "Title Conflict B");
  console.log("✓ Sync A -> B: Device B ignores older conflict update from A");

  // 5. Test Delete Syncing
  console.log("Running Delete Syncing Tests...");

  // Wait a small delay to guarantee B's delete has a strictly newer timestamp
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Delete note on Device B
  await devB.runtime.objects.delete("note_101");

  // Sync B to A
  await network.sync("device_b", "device_a");

  // A's get should return null (soft-deleted)
  const noteOnAAfterDelete = await devA.runtime.objects.get("note_101");
  assert.strictEqual(noteOnAAfterDelete, null);

  // A's full list should include the soft-deleted object
  const listOnA = await devA.provider.listObjects({ includeDeleted: true });
  const deletedNoteOnA = listOnA.find(o => o.id === "note_101");
  assert.ok(deletedNoteOnA);
  assert.strictEqual(deletedNoteOnA.isDeleted, true);
  console.log("✓ Soft-delete replicated successfully to Device A");

  // Clean up
  await devA.provider.close();
  await devB.provider.close();

  if (fs.existsSync(dbPathA)) fs.unlinkSync(dbPathA);
  if (fs.existsSync(dbPathB)) fs.unlinkSync(dbPathB);

  console.log("All @orbitos/sync-engine smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

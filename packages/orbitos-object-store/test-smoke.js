const assert = require('assert');
const { createObjectStore } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/object-store smoke tests...");
  const store = createObjectStore();

  const userObj = {
    id: "usr_danny",
    schemaType: "user",
    ownerId: "usr_danny",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncSequence: 1,
    isDeleted: false,
    metadata: {},
    knowledge: {
      summary: "Danny's profile",
      tags: ["owner"],
      embeddingsId: null,
      notes: "",
      relationships: [],
      versionHistory: [],
      auditTrail: []
    }
  };

  // Test create
  const created = await store.create(userObj);
  assert.strictEqual(created.id, "usr_danny");
  console.log("✓ Object creation works");

  // Test duplicate prevention
  try {
    await store.create(userObj);
    assert.fail("Should have rejected duplicate ID");
  } catch (err) {
    assert.ok(err.message.includes("Duplicate object ID"));
    console.log("✓ Duplicate ID prevention works");
  }

  // Test get
  const retrieved = await store.get("usr_danny");
  assert.strictEqual(retrieved.id, "usr_danny");
  console.log("✓ Object retrieval works");

  // Test update
  const updated = await store.update("usr_danny", {
    metadata: { test: true }
  });
  assert.strictEqual(updated.metadata.test, true);
  console.log("✓ Object updating works");

  // Test query
  const queried = await store.query({ schemaType: "user" });
  assert.strictEqual(queried.length, 1);
  console.log("✓ Object querying works");

  // Test relationship
  await store.addRelationship("usr_danny", "dev_mac", "owns");
  const relations = await store.getRelationships("usr_danny");
  assert.strictEqual(relations.length, 1);
  assert.strictEqual(relations[0].targetId, "dev_mac");
  assert.strictEqual(relations[0].relationType, "owns");
  console.log("✓ Relationship mapping works");

  // Test delete
  const deleted = await store.delete("usr_danny");
  assert.strictEqual(deleted, true);
  const getAfterDelete = await store.get("usr_danny");
  assert.strictEqual(getAfterDelete, null);
  console.log("✓ Soft-delete works");

  console.log("All @orbitos/object-store smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

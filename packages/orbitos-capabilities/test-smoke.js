const assert = require('assert');
const { createCapabilityEngine } = require('./dist/index.js');

async function run() {
  console.log("Running @orbitos/capabilities smoke tests...");
  const engine = createCapabilityEngine();

  // Test Default Deny
  const defaultCheck = await engine.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    targetObjectId: "obj_1",
    action: "READ"
  });
  assert.strictEqual(defaultCheck.allowed, false);
  assert.strictEqual(defaultCheck.approvalLevel, "blocked");
  console.log("✓ Default Deny works");

  // Test Grant Rule
  const rule = {
    ruleId: "rule_1",
    accessor: { type: "agent", id: "notes-agent" },
    permittedScope: "files.read",
    targetObjectType: "file",
    targetObjectIdConstraint: "obj_1",
    permittedActions: ["READ"],
    approvalLevel: "ask_once"
  };

  await engine.grant(rule);

  // Test Allowed access with correct constraint
  const allowedCheck = await engine.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    targetObjectId: "obj_1",
    action: "READ"
  });
  assert.strictEqual(allowedCheck.allowed, true);
  assert.strictEqual(allowedCheck.approvalLevel, "ask_once");
  console.log("✓ Allowed Grant works");

  // Test Rejected access with incorrect object ID constraint
  const wrongIdCheck = await engine.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    targetObjectId: "obj_2", // different ID
    action: "READ"
  });
  assert.strictEqual(wrongIdCheck.allowed, false);
  console.log("✓ Object ID Constraint works");

  // Test Expired Rule
  const expiredRule = {
    ruleId: "rule_2",
    accessor: { type: "app", id: "notes-app" },
    permittedScope: "files.write",
    targetObjectType: "file",
    permittedActions: ["CREATE"],
    approvalLevel: "silent",
    expiresAt: Date.now() - 1000 // in the past
  };

  await engine.grant(expiredRule);

  const expiredCheck = await engine.check({
    accessor: { type: "app", id: "notes-app" },
    scope: "files.write",
    targetObjectType: "file",
    action: "CREATE"
  });
  assert.strictEqual(expiredCheck.allowed, false);
  console.log("✓ Expired Rule Deny works");

  // Test Explicit Blocked Rule
  const blockedRule = {
    ruleId: "rule_3",
    accessor: { type: "agent", id: "notes-agent" },
    permittedScope: "files.read",
    targetObjectType: "file",
    permittedActions: ["READ"],
    approvalLevel: "blocked"
  };

  await engine.grant(blockedRule);

  const blockedCheck = await engine.check({
    accessor: { type: "agent", id: "notes-agent" },
    scope: "files.read",
    targetObjectType: "file",
    targetObjectId: "obj_1",
    action: "READ"
  });
  assert.strictEqual(blockedCheck.allowed, false);
  assert.strictEqual(blockedCheck.approvalLevel, "blocked");
  console.log("✓ Explicit Blocked Rule denies access");

  console.log("All @orbitos/capabilities smoke tests passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

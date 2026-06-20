import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

console.log("Running smoke test validations...");

// 1. Verify schema files exist
assert.ok(existsSync(".actor/input_schema.json"), "input_schema.json must exist");
assert.ok(existsSync(".actor/output_schema.json"), "output_schema.json must exist");
assert.ok(existsSync(".actor/dataset_schema.json"), "dataset_schema.json must exist");

// 2. Validate input schema format
try {
    const inputSchema = JSON.parse(readFileSync(".actor/input_schema.json", "utf8"));
    assert.equal(inputSchema.schemaVersion, 1, "schemaVersion must be 1");
    assert.ok(inputSchema.properties, "properties must be defined");
    assert.ok(inputSchema.properties.projectPath, "projectPath property must be defined");
    assert.ok(inputSchema.properties.emailTo, "emailTo property must be defined");
    console.log("Input schema is valid.");
} catch (e) {
    assert.fail(`Input schema validation failed: ${e.message}`);
}

// 3. Verify documentation files
assert.ok(existsSync("README.md"), "Root README.md must exist");
assert.ok(existsSync(".actor/README.md"), "Apify README.md must exist");
assert.ok(existsSync("CHANGELOG.md"), "Root CHANGELOG.md must exist");
assert.ok(existsSync(".actor/CHANGELOG.md"), "Apify CHANGELOG.md must exist");

console.log("All smoke test validations passed successfully!");

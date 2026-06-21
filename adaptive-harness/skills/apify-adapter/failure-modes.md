# Apify Adapter Failure Modes

## Missing actor.json
**Symptom**: No .actor/actor.json found in actor directory.
**Recovery**: Flag as incomplete actor. Cannot validate or deploy.

## Invalid Input Schema
**Symptom**: input_schema.json fails to parse or missing required fields.
**Recovery**: Report specific validation errors. Suggest fixes.

## Schema Validation Failure
**Symptom**: `apify validate-schema` returns errors.
**Recovery**: Report errors verbatim. Do not auto-fix schemas.

## Missing Icon
**Symptom**: No .actor/icon.png found.
**Recovery**: Flag as missing. Actor can still function but won't look polished.

## Apify CLI Not Available
**Symptom**: `apify` command not found.
**Recovery**: Skip CLI-dependent checks. Note in report.

## Local Run Failure
**Symptom**: `apify run` fails.
**Recovery**: Classify failure. Check for missing INPUT.json. Check for missing env vars.

## SDK Version Mismatch
**Symptom**: Apify SDK or Crawlee version is outdated.
**Recovery**: Report as update recommendation. Do not auto-update.

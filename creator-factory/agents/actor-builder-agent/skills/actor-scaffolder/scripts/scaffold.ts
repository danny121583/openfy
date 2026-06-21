#!/usr/bin/env tsx
import { buildActor } from "../../../../../shared/src/agents.js";
import type { ActorRecord } from "../../../../../shared/src/types.js";

const args = process.argv.slice(2);
const slug = args.find(a => a.startsWith("--slug="))?.split("=")[1];
const name = args.find(a => a.startsWith("--name="))?.split("=")[1];
const prompt = args.find(a => a.startsWith("--prompt="))?.split("=")[1];
const template = args.find(a => a.startsWith("--template="))?.split("=")[1] as any || "ts-beeai-agent";

if (!slug || !name || !prompt) {
  console.error("Usage: tsx scaffold.ts --slug=<slug> --name=<name> --prompt=<prompt> [--template=<template>]");
  process.exit(1);
}

const actor: ActorRecord = {
  id: slug,
  name,
  slug,
  sourceType: "idea",
  sourceValue: prompt,
  template,
  status: "building",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  monetizationScore: 0
};

console.log(`Scaffolding Actor: ${name} (${slug}) using template ${template}...`);
buildActor(actor, prompt, template)
  .then((dir) => {
    console.log(`Successfully scaffolded Actor to: ${dir}`);
  })
  .catch((err) => {
    console.error("Scaffolding failed:", err);
    process.exit(1);
  });

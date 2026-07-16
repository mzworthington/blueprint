/**
 * Writes JSON Schema for blueprint YAML IDE validation from the Zod contract.
 *
 * Usage:
 *   pnpm --filter @blueprint/core generate:schema
 *   pnpm --filter @blueprint/core generate:schema -- --check
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEM_SCHEMA_MAJOR_VERSION } from '../src/models/schemaVersion.ts';
import { toSystemSchemaJsonSchema } from '../src/rules/graph.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasRoot = join(__dirname, '../../../../schemas');
const canonicalPath = join(schemasRoot, 'blueprint.schema.json');
const versionedPath = join(schemasRoot, `v${SYSTEM_SCHEMA_MAJOR_VERSION}`, 'blueprint.schema.json');
const latestPath = join(schemasRoot, 'latest', 'blueprint.schema.json');
const checkOnly = process.argv.includes('--check');

const json = `${JSON.stringify(toSystemSchemaJsonSchema(), null, 2)}\n`;
const outputs = [canonicalPath, versionedPath, latestPath];

function writeAll(): void {
  for (const outPath of outputs) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, json, 'utf8');
    console.log(`Wrote ${outPath}`);
  }
}

if (checkOnly) {
  for (const outPath of outputs) {
    let existing: string | undefined;
    try {
      existing = readFileSync(outPath, 'utf8');
    } catch {
      console.error(`Missing ${outPath}. Run: pnpm --filter @blueprint/core generate:schema`);
      process.exit(1);
    }
    if (existing !== json) {
      console.error(`Out of date: ${outPath}\nRun: pnpm --filter @blueprint/core generate:schema`);
      process.exit(1);
    }
  }
  console.log('OK: schema files match Zod contract');
  process.exit(0);
}

writeAll();

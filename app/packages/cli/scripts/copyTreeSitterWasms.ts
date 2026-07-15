#!/usr/bin/env bun
/**
 * Copy language parsers next to a blueprint binary (or into a destination dir).
 *
 * Usage:
 *   bun scripts/copyTreeSitterWasms.ts [destDir...]
 * Default dest: ../../dist (next to compiled blueprint)
 */
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import {
  TREE_SITTER_WASM_LANGUAGES,
  wasmFileName,
} from '../src/analysis/adapters/parsing/treeSitterWasmPaths.ts';

const require = createRequire(import.meta.url);
const pkgJson = require.resolve('tree-sitter-wasms/package.json');
const wasmOut = path.join(path.dirname(pkgJson), 'out');

const defaultDest = path.resolve(import.meta.dirname, '../../../dist');
const destDirs =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2).map(d => path.resolve(d))
    : [defaultDest];

for (const dest of destDirs) {
  fs.mkdirSync(dest, { recursive: true });
  for (const lang of TREE_SITTER_WASM_LANGUAGES) {
    const name = wasmFileName(lang);
    const src = path.join(wasmOut, name);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing WASM: ${src}`);
    }
    fs.copyFileSync(src, path.join(dest, name));
  }
  console.log(`Copied ${TREE_SITTER_WASM_LANGUAGES.length} tree-sitter WASM files → ${dest}`);
}

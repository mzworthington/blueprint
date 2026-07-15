import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/** Language keys we ship / resolve from tree-sitter-wasms. */
export const TREE_SITTER_WASM_LANGUAGES = [
  'typescript',
  'tsx',
  'javascript',
  'python',
  'go',
  'java',
  'c_sharp',
] as const;

export type TreeSitterWasmLanguage = (typeof TREE_SITTER_WASM_LANGUAGES)[number];

export function wasmFileName(langKey: string): string {
  return `tree-sitter-${langKey}.wasm`;
}

/**
 * Candidate directories that may contain language .wasm files.
 * Prefer package install (dev / tests), then next to the compiled binary.
 */
export function treeSitterWasmSearchDirs(opts: {
  cwd?: string;
  execPath?: string;
  argv0?: string;
  moduleUrl?: string;
}): string[] {
  const cwd = opts.cwd ?? process.cwd();
  const execPath = opts.execPath ?? process.execPath;
  const argv0 = opts.argv0 ?? process.argv[0] ?? '';
  const moduleUrl = opts.moduleUrl ?? import.meta.url;
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));

  const dirs: string[] = [];

  try {
    const require = createRequire(moduleUrl);
    const pkgJson = require.resolve('tree-sitter-wasms/package.json');
    dirs.push(path.join(path.dirname(pkgJson), 'out'));
  } catch {
    // Package may be unavailable inside a bun --compile binary.
  }

  // Compiled binary: wasms are copied next to the executable at build time.
  dirs.push(path.dirname(path.resolve(execPath)));

  // When invoked as `./blueprint` or via PATH alias, argv[0] may differ from execPath.
  if (argv0) {
    const argvDir = path.dirname(path.resolve(cwd, argv0));
    dirs.push(argvDir);
  }

  dirs.push(path.join(cwd, 'node_modules', 'tree-sitter-wasms', 'out'));

  // Source / monorepo layouts (adapters → … → app or packages/cli)
  dirs.push(path.resolve(moduleDir, '../../../node_modules/tree-sitter-wasms/out'));
  dirs.push(path.resolve(moduleDir, '../../../../../node_modules/tree-sitter-wasms/out'));
  dirs.push(path.resolve(moduleDir, '../../../../node_modules/tree-sitter-wasms/out'));

  return [...new Set(dirs.map(d => path.normalize(d)))];
}

export function resolveTreeSitterWasmPath(
  langKey: string,
  opts?: Parameters<typeof treeSitterWasmSearchDirs>[0]
): string | null {
  const name = wasmFileName(langKey);
  for (const dir of treeSitterWasmSearchDirs(opts ?? {})) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

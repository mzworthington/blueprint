import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { resolveTreeSitterWasmPath, treeSitterWasmSearchDirs } from './treeSitterWasmPaths.ts';

describe('treeSitterWasmPaths', () => {
  it('resolves c_sharp WASM from the installed tree-sitter-wasms package', () => {
    const resolved = resolveTreeSitterWasmPath('c_sharp');
    expect(resolved).toBeTruthy();
    expect(resolved).toMatch(/tree-sitter-c_sharp\.wasm$/);
    expect(fs.existsSync(resolved!)).toBe(true);
  });

  it('includes the compiled binary directory in search paths', () => {
    const dirs = treeSitterWasmSearchDirs({
      cwd: '/tmp/proj',
      execPath: '/opt/blueprint/blueprint',
      argv0: '/opt/blueprint/blueprint',
    });
    expect(dirs).toContain('/opt/blueprint');
  });

  it('deduplicates search dirs', () => {
    const dirs = treeSitterWasmSearchDirs({
      cwd: '/tmp/proj',
      execPath: '/opt/blueprint/blueprint',
      argv0: '/opt/blueprint/blueprint',
    });
    expect(dirs.length).toBe(new Set(dirs).size);
  });

  it('returns null when no WASM exists for the language', () => {
    const resolved = resolveTreeSitterWasmPath('not_a_real_language', {
      cwd: '/tmp/empty-proj-no-wasm',
      execPath: '/tmp/empty-bin-no-wasm/blueprint',
      argv0: '/tmp/empty-bin-no-wasm/blueprint',
      moduleUrl: 'file:///tmp/empty-bin-no-wasm/adapter.js',
    });
    expect(resolved).toBeNull();
  });
});

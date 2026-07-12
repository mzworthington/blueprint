import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NodeFileSystemAdapter } from './nodeFileSystem.ts';
import * as fs from 'fs';
import * as path from 'path';

describe('NodeFileSystemAdapter', () => {
  const tempDir = path.resolve(new URL('.', import.meta.url).pathname, 'fs_test_tmp');
  const adapter = new NodeFileSystemAdapter();

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should verify file exists, write to files, and delete files', async () => {
    const file = path.join(tempDir, 'test.yaml');
    expect(adapter.exists(file)).toBe(false);

    await adapter.writeSchema(file, 'version: "1"');
    expect(adapter.exists(file)).toBe(true);

    adapter.unlink(file);
    expect(adapter.exists(file)).toBe(false);
  });

  it('should create directories and handle package.json name reading', () => {
    const nestedDir = path.join(tempDir, 'nested/dir');
    adapter.mkdir(nestedDir);
    expect(fs.existsSync(nestedDir)).toBe(true);

    const packageJsonFile = path.join(tempDir, 'package.json');
    expect(adapter.readPackageJsonName(packageJsonFile)).toBeNull();

    fs.writeFileSync(packageJsonFile, JSON.stringify({ name: 'test-package' }), 'utf8');
    expect(adapter.readPackageJsonName(packageJsonFile)).toBe('test-package');

    fs.writeFileSync(packageJsonFile, 'invalid json', 'utf8');
    expect(adapter.readPackageJsonName(packageJsonFile)).toBeNull();
  });

  it('should support path and directory lookups', () => {
    expect(adapter.getCurrentWorkingDirectory()).toBe(process.cwd());
    expect(adapter.getAbsolutePath('a', 'b')).toBe(path.resolve('a', 'b'));
    expect(adapter.getRelativePath('/a/b', '/a/b/c')).toBe('c');
  });
});

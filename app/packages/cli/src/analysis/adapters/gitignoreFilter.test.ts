import { describe, it, expect } from 'vitest';
import ignore from 'ignore';
import {
  isIgnoredByGitignore,
  isTestSourcePath,
  createGitignoreFilter,
} from './gitignoreFilter.ts';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('gitignoreFilter', () => {
  it('marks unit test files and test directories without excluding them from scanning helpers', () => {
    expect(isTestSourcePath('src/domain/graph.test.ts')).toBe(true);
    expect(isTestSourcePath('src/domain/graph.spec.tsx')).toBe(true);
    expect(isTestSourcePath('src/__tests__/graph.ts')).toBe(true);
    expect(isTestSourcePath('src/tests/helpers.ts')).toBe(true);
    expect(isTestSourcePath('src/test/setup.ts')).toBe(true);
    expect(isTestSourcePath('src/setupTests.ts')).toBe(true);
    expect(isTestSourcePath('src/domain/graph.ts')).toBe(false);
  });

  it('honours gitignore patterns instead of hardcoded folder names', () => {
    const ig = ignore().add(['node_modules', 'dist', 'coverage', 'playwright-report/']);
    expect(isIgnoredByGitignore('node_modules/foo/index.js', ig)).toBe(true);
    expect(isIgnoredByGitignore('dist/index.js', ig)).toBe(true);
    expect(isIgnoredByGitignore('src/test/graph.test.ts', ig)).toBe(false);
    expect(isIgnoredByGitignore('src/__tests__/graph.ts', ig)).toBe(false);
  });

  it('loads .gitignore from a project directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-gitignore-'));
    try {
      fs.writeFileSync(path.join(tmp, '.gitignore'), 'build/\n*.local\n', 'utf8');
      const ig = createGitignoreFilter(tmp);
      expect(isIgnoredByGitignore('build/out.js', ig)).toBe(true);
      expect(isIgnoredByGitignore('src/app.ts', ig)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

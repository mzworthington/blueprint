import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createSourcePathFilter } from './sourcePathFilter.ts';

describe('sourcePathFilter', () => {
  it('skips structural noise paths by default', () => {
    const filter = createSourcePathFilter(process.cwd(), { ignore: [], include: [] });
    expect(filter.shouldSkip('docs/architecture.md')).toBe(true);
    expect(filter.shouldSkip('scripts/release.sh')).toBe(true);
    expect(filter.shouldSkip('e2e/login.spec.ts')).toBe(true);
    expect(filter.shouldSkip('packages/app/src/stories/Button.stories.tsx')).toBe(true);
    expect(filter.shouldSkip('dist/index.js')).toBe(true);
    expect(filter.shouldSkip('.github/workflows/ci.yml')).toBe(true);
    expect(filter.shouldSkip('infra/main.tf')).toBe(true);
    expect(filter.shouldSkip('infra/main.tf.json')).toBe(true);
    expect(filter.shouldSkip('packages/catalog/src/index.ts')).toBe(false);
  });

  it('applies extra config ignore globs', () => {
    const filter = createSourcePathFilter(process.cwd(), {
      ignore: ['plugins/**', 'contrib/**'],
      include: [],
    });
    expect(filter.shouldSkip('plugins/foo/src/index.ts')).toBe(true);
    expect(filter.shouldSkip('packages/catalog/src/index.ts')).toBe(false);
  });

  it('honours include allow-lists when provided', () => {
    const filter = createSourcePathFilter(process.cwd(), {
      ignore: [],
      include: ['packages/app/**', 'packages/backend/**'],
    });
    expect(filter.shouldSkip('packages/app/src/index.ts')).toBe(false);
    expect(filter.shouldSkip('packages/backend/src/index.ts')).toBe(false);
    expect(filter.shouldSkip('packages/other/src/index.ts')).toBe(true);
  });

  it('still honours .gitignore via the composite filter', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-source-filter-'));
    try {
      fs.writeFileSync(path.join(tmp, '.gitignore'), 'tmp-local/\n', 'utf8');
      const filter = createSourcePathFilter(tmp, { ignore: [], include: [] });
      expect(filter.shouldSkip('tmp-local/secret.ts')).toBe(true);
      expect(filter.shouldSkip('src/app.ts')).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

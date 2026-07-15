import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TsMorphParserAdapter } from './tsMorphParser.ts';
import * as fs from 'fs';
import * as path from 'path';

describe('TsMorphParserAdapter', () => {
  const tempDir = path.resolve(new URL('.', import.meta.url).pathname, 'ts_morph_test_tmp');
  const relativePattern = path.relative(process.cwd(), tempDir).replace(/\\/g, '/');
  let parser: TsMorphParserAdapter;

  beforeAll(() => {
    parser = new TsMorphParserAdapter();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should parse imports, instantiations, and calls from TypeScript files', async () => {
    const tsContent = `
      import React from 'react';
      import { SystemNode } from '@blueprint/core';
      const x = new PrismaClient();
      fetch('url');
      axios.get('url');
    `;
    const tsFile = path.join(tempDir, 'sample.ts');
    fs.writeFileSync(tsFile, tsContent, 'utf8');

    const results = await parser.parseSourceFiles(`${relativePattern}/**/*.ts`);
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.baseName).toBe('sample');
    expect(file.isTestFile).toBe(false);

    const importSpecs = file.imports.map(i => i.moduleSpecifier);
    expect(importSpecs).toContain('react');
    expect(importSpecs).toContain('@blueprint/core');

    const classNames = file.newExpressions.map(n => n.className);
    expect(classNames).toContain('PrismaClient');

    expect(file.callExpressions).toContain('fetch');
    expect(file.callExpressions).toContain('axios.get');
  });

  it('should identify test files correctly', async () => {
    const tsContent = `import { test } from 'vitest';`;
    const tsFile = path.join(tempDir, 'sample.test.ts');
    fs.writeFileSync(tsFile, tsContent, 'utf8');

    const results = await parser.parseSourceFiles(`${relativePattern}/**/*.test.ts`);
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.isTestFile).toBe(true);
  });

  it('should include files under test directories and mark them as tests', async () => {
    const testDir = path.join(tempDir, 'test');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'helper.ts'), 'export const x = 1;', 'utf8');

    const results = await parser.parseSourceFiles(`${relativePattern}/**/*.ts`);
    const helper = results.find(f => f.relativePath.replace(/\\/g, '/').endsWith('test/helper.ts'));
    expect(helper).toBeDefined();
    expect(helper!.isTestFile).toBe(true);
  });
});

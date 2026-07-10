import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TsMorphParserAdapter } from './tsMorphParser.ts';
import * as fs from 'fs';
import * as path from 'path';

describe('TsMorphParserAdapter', () => {
  const tempDir = path.resolve(process.cwd(), 'cli/analysis/adapters/ts_morph_test_tmp');
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
      import { useState } from 'react';
      import { Graph } from '../domain/graph.ts';
      const db = new PrismaClient();
      fetch('https://api.com');
      axios.get('/users');
    `;
    const tsFile = path.join(tempDir, 'sample.ts');
    fs.writeFileSync(tsFile, tsContent, 'utf8');

    const results = await parser.parseSourceFiles(
      'cli/analysis/adapters/ts_morph_test_tmp/**/*.ts'
    );
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.baseName).toBe('sample');
    expect(file.isTestFile).toBe(false);

    const importSpecs = file.imports.map(i => i.moduleSpecifier);
    expect(importSpecs).toContain('react');
    expect(importSpecs).toContain('../domain/graph.ts');

    const classNames = file.newExpressions.map(n => n.className);
    expect(classNames).toContain('PrismaClient');

    expect(file.callExpressions).toContain('fetch');
    expect(file.callExpressions).toContain('axios.get');
  });

  it('should identify test files correctly', async () => {
    const tsContent = `import { test } from 'vitest';`;
    const tsFile = path.join(tempDir, 'sample.test.ts');
    fs.writeFileSync(tsFile, tsContent, 'utf8');

    const results = await parser.parseSourceFiles(
      'cli/analysis/adapters/ts_morph_test_tmp/**/*.test.ts'
    );
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.isTestFile).toBe(true);
  });
});

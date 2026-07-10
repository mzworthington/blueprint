import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TreeSitterParserAdapter } from './treeSitterParser';
import * as fs from 'fs';
import * as path from 'path';

describe('TreeSitterParserAdapter', () => {
  const tempDir = path.resolve(process.cwd(), 'scripts/analysis/adapters/test_tmp');
  let parser: TreeSitterParserAdapter;

  beforeAll(() => {
    parser = new TreeSitterParserAdapter();
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

    const results = await parser.parseSourceFiles('scripts/analysis/adapters/test_tmp/**/*.ts');
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

  it('should parse imports, instantiations, and calls from Python files', async () => {
    const pyContent = `
import os
from datetime import datetime
client = MongoClient()
fetch("https://api.com")
`;
    const pyFile = path.join(tempDir, 'sample.py');
    fs.writeFileSync(pyFile, pyContent, 'utf8');

    const results = await parser.parseSourceFiles('scripts/analysis/adapters/test_tmp/**/*.py');
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.baseName).toBe('sample');

    const importSpecs = file.imports.map(i => i.moduleSpecifier);
    expect(importSpecs).toContain('os');
    expect(importSpecs).toContain('datetime');

    const classNames = file.newExpressions.map(n => n.className);
    expect(classNames).toContain('MongoClient');

    expect(file.callExpressions).toContain('fetch');
  });

  it('should parse imports, instantiations, and calls from C# files', async () => {
    const csContent = `
using System;
using System.Threading.Tasks;
using TestProject.Services;

namespace TestProject.Controllers
{
    public class UserController
    {
        public UserController()
        {
            var db = new PrismaClient();
            fetch("https://api.com");
        }
    }
}
`;
    const csFile = path.join(tempDir, 'sample.cs');
    fs.writeFileSync(csFile, csContent, 'utf8');

    const results = await parser.parseSourceFiles('scripts/analysis/adapters/test_tmp/**/*.cs');
    expect(results).toHaveLength(1);

    const file = results[0];
    expect(file.baseName).toBe('sample');

    const importSpecs = file.imports.map(i => i.moduleSpecifier);
    expect(importSpecs).toContain('System');
    expect(importSpecs).toContain('System.Threading.Tasks');
    expect(importSpecs).toContain('TestProject.Services');

    const classNames = file.newExpressions.map(n => n.className);
    expect(classNames).toContain('PrismaClient');

    expect(file.callExpressions).toContain('fetch');
    expect(file.namespaces).toContain('TestProject.Controllers');
  });
});

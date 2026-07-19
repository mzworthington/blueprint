import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TestCase, TestModule, TestSuite } from 'vitest/node';
import {
  VitestFeatureReporter,
  embeddingPlaceholder,
  fileLabel,
  packageLabel,
} from './vitestFeatureReporter.ts';

function mockTest(name: string, state: 'passed' | 'failed' | 'skipped'): TestCase {
  return {
    type: 'test',
    name,
    result: () => ({ state }),
  } as unknown as TestCase;
}

function mockSuite(name: string, children: Array<TestSuite | TestCase>): TestSuite {
  return {
    type: 'suite',
    name,
    children: children as TestSuite['children'],
  } as unknown as TestSuite;
}

function mockModule(
  children: Array<TestSuite | TestCase>,
  opts: { project?: string; relativeModuleId?: string; moduleId?: string } = {}
): TestModule {
  return {
    type: 'module',
    children: children as TestModule['children'],
    project: { name: opts.project ?? 'app' },
    relativeModuleId: opts.relativeModuleId ?? 'src/Canvas.test.tsx',
    moduleId: opts.moduleId ?? '/repo/src/Canvas.test.tsx',
  } as unknown as TestModule;
}

describe('VitestFeatureReporter', () => {
  let tmpDir: string;
  let outputFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-feature-reporter-'));
    outputFile = path.join(tmpDir, 'FEATURES.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('maps project names to package labels', () => {
    expect(packageLabel('app')).toBe('Designer');
    expect(packageLabel('core')).toBe('Core');
    expect(packageLabel('cli')).toBe('CLI');
    expect(fileLabel('/x/src/entityRef.test.ts', 'src/entityRef.test.ts')).toBe('entityRef');
  });

  it('nests output as Package → File → describe', async () => {
    const reporter = new VitestFeatureReporter({ outputFile });

    await reporter.onTestRunEnd([
      mockModule(
        [
          mockSuite('Canvas', [
            mockTest('collapses the side panels', 'passed'),
            mockTest('[unit] computes layout coordinates', 'passed'),
          ]),
        ],
        { project: 'app', relativeModuleId: 'src/ui/Canvas.test.tsx' }
      ),
      mockModule([mockSuite('entityRef Rules', [mockTest('parses refs', 'passed')])], {
        project: 'core',
        relativeModuleId: 'src/lib/entityRef.test.ts',
      }),
    ]);

    const md = fs.readFileSync(outputFile, 'utf8');
    expect(md).toContain('## Core');
    expect(md).toContain('### entityRef');
    expect(md).toContain('#### entityRef Rules');
    expect(md).toContain('## Designer');
    expect(md).toContain('### Canvas');
    expect(md).toContain('#### Canvas');
    expect(md).toContain('✅ collapses the side panels');
    expect(md).toContain('✅ parses refs');
    expect(md).not.toContain('computes layout coordinates');
    // Packages sorted alphabetically: Core before Designer
    expect(md.indexOf('## Core')).toBeLessThan(md.indexOf('## Designer'));
    // Prettier-compatible list markers and heading spacing
    expect(md).toMatch(/\n- ✅ collapses the side panels\n/);
    expect(md).toMatch(/## Designer\n\n### Canvas\n\n#### Canvas\n\n- ✅/);
  });

  it('embeds into an existing file between placeholders', async () => {
    fs.writeFileSync(
      outputFile,
      `# Features\n\nIntro.\n\n<!-- ${embeddingPlaceholder}--start -->\nold\n<!-- ${embeddingPlaceholder}--end -->\n\nFooter.\n`
    );

    const reporter = new VitestFeatureReporter({ outputFile });
    await reporter.onTestRunEnd([
      mockModule([mockSuite('Workspace', [mockTest('loads the sandbox', 'passed')])]),
    ]);

    const md = fs.readFileSync(outputFile, 'utf8');
    expect(md).toContain('# Features');
    expect(md).toContain('Intro.');
    expect(md).toContain('Footer.');
    expect(md).toContain('## Designer');
    expect(md).toContain('### Canvas');
    expect(md).toContain('#### Workspace');
    expect(md).toContain('✅ loads the sandbox');
    expect(md).not.toContain('\nold\n');
    expect(md).toMatch(
      new RegExp(
        `<!-- ${embeddingPlaceholder}--start -->\\n\\n## Designer\\n\\n### Canvas\\n\\n#### Workspace\\n\\n- ✅ loads the sandbox\\n\\n<!-- ${embeddingPlaceholder}--end -->`
      )
    );
  });

  it('marks failed and skipped tests with the correct icons', async () => {
    const reporter = new VitestFeatureReporter({ outputFile });
    await reporter.onTestRunEnd([
      mockModule([
        mockSuite('Status', [
          mockTest('passes', 'passed'),
          mockTest('fails', 'failed'),
          mockTest('is skipped', 'skipped'),
        ]),
      ]),
    ]);

    const md = fs.readFileSync(outputFile, 'utf8');
    expect(md).toContain('✅ passes');
    expect(md).toContain('❌ fails');
    expect(md).toContain('🚧 is skipped');
  });
});

/**
 * Vitest adapter for x-feature-reporter — mirrors jest-feature-reporter.
 * Emits Markdown feature docs from describe/it titles (behavioral tests only),
 * grouped as Package → File → describe tree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import type { Reporter, TestCase, TestModule, TestSuite } from 'vitest/node';
import { XFeatureReporter } from 'x-feature-reporter';
import { MarkdownAdapter } from 'x-feature-reporter/adapters/markdown';
import type { XTestResult, XTestSuite } from 'x-feature-reporter';

export const embeddingPlaceholder = 'vitest-feature-reporter';

export const DEFAULT_FEATURES_UNIT_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/features-unit.md'
);

export type VitestFeatureReporterOptions = {
  /** Absolute or cwd-relative path for the Markdown output. */
  outputFile?: string;
  /** Optional link appended at the end of the generated report. */
  fullReportLink?: string;
  /** Placeholder name used when embedding into an existing Markdown file. */
  embeddingPlaceholder?: string;
};

type SuiteBucket = {
  title: string;
  suites: SuiteBucket[];
  tests: Array<{ title: string; status: XTestResult['status']; testType: string }>;
};

const PACKAGE_LABELS: Record<string, string> = {
  app: 'Designer',
  cli: 'CLI',
  core: 'Core',
  reporters: 'Reporters',
};

export function packageLabel(projectName: string): string {
  return PACKAGE_LABELS[projectName] ?? (projectName || 'Other');
}

export function fileLabel(moduleId: string, relativeModuleId?: string): string {
  const base = path.basename(relativeModuleId || moduleId);
  return base.replace(/\.(test|spec)\.[cm]?[jt]sx?$/i, '');
}

function getTestType(title: string): string {
  const match = title.match(/^\[([^\]]+)\]/);
  return match?.[1] ?? 'behavior';
}

function stripTestTypePrefix(title: string): string {
  return title.replace(/^\[([^\]]+)\]/g, '').trim();
}

function outcomeToStatus(test: TestCase): XTestResult['status'] {
  const state = test.result().state;
  if (state === 'passed') return 'passed';
  if (state === 'failed') return 'failed';
  if (state === 'skipped') return 'skipped';
  return 'failed';
}

function convertSuite(bucket: SuiteBucket): XTestSuite {
  return {
    title: bucket.title,
    suites: bucket.suites.map(convertSuite),
    tests: bucket.tests.map(t => ({
      title: t.title,
      status: t.status,
      testType: t.testType,
    })),
  };
}

function collectFromChildren(children: Iterable<TestSuite | TestCase>, parent: SuiteBucket): void {
  for (const child of children) {
    if (child.type === 'suite') {
      const bucket: SuiteBucket = { title: child.name, suites: [], tests: [] };
      parent.suites.push(bucket);
      collectFromChildren(child.children, bucket);
      continue;
    }

    const testType = getTestType(child.name);
    parent.tests.push({
      title: stripTestTypePrefix(child.name),
      status: outcomeToStatus(child),
      testType,
    });
  }
}

function findOrCreate(parent: SuiteBucket, title: string): SuiteBucket {
  let child = parent.suites.find(s => s.title === title);
  if (!child) {
    child = { title, suites: [], tests: [] };
    parent.suites.push(child);
  }
  return child;
}

function sortBuckets(bucket: SuiteBucket): void {
  bucket.suites.sort((a, b) => a.title.localeCompare(b.title));
  for (const child of bucket.suites) sortBuckets(child);
}

/** Format report Markdown so it matches project Prettier rules. */
export async function formatFeatureMarkdownFile(filePath: string): Promise<void> {
  const source = fs.readFileSync(filePath, 'utf8');
  const config = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(source, {
    ...config,
    filepath: filePath,
  });
  if (formatted !== source) {
    fs.writeFileSync(filePath, formatted);
  }
}

/** Build and write the unit-test features Markdown report from Vitest results. */
export async function generateFeaturesUnitReport(
  testModules: ReadonlyArray<TestModule>,
  options: VitestFeatureReporterOptions = {}
): Promise<void> {
  const resolved: Required<Pick<VitestFeatureReporterOptions, 'outputFile'>> &
    VitestFeatureReporterOptions = {
    outputFile: options.outputFile ?? DEFAULT_FEATURES_UNIT_FILE,
    fullReportLink: options.fullReportLink,
    embeddingPlaceholder: options.embeddingPlaceholder ?? embeddingPlaceholder,
  };

  const root: SuiteBucket = { title: 'Root', suites: [], tests: [] };

  for (const mod of testModules) {
    const pkg = findOrCreate(root, packageLabel(mod.project?.name ?? ''));
    const file = findOrCreate(pkg, fileLabel(mod.moduleId, mod.relativeModuleId));
    collectFromChildren(mod.children, file);
  }

  sortBuckets(root);

  const xRoot: XTestSuite = {
    title: 'Root',
    transparent: true,
    suites: root.suites.map(convertSuite),
    tests: [],
  };

  const outputFile = path.isAbsolute(resolved.outputFile)
    ? resolved.outputFile
    : path.resolve(process.cwd(), resolved.outputFile);

  const adapter = new MarkdownAdapter({
    outputFile,
    fullReportLink: resolved.fullReportLink,
    embeddingPlaceholder: resolved.embeddingPlaceholder,
  });
  new XFeatureReporter(adapter).generateReport(xRoot);
  await formatFeatureMarkdownFile(outputFile);
}

export class VitestFeatureReporter implements Reporter {
  readonly options: Required<Pick<VitestFeatureReporterOptions, 'outputFile'>> &
    VitestFeatureReporterOptions;

  constructor(options: VitestFeatureReporterOptions = {}) {
    this.options = {
      outputFile: options.outputFile ?? 'FEATURES.md',
      fullReportLink: options.fullReportLink,
      embeddingPlaceholder: options.embeddingPlaceholder ?? embeddingPlaceholder,
    };
  }

  onInit(): void {
    // no-op — report is written in onTestRunEnd
  }

  async onTestRunEnd(testModules: ReadonlyArray<TestModule> = []): Promise<void> {
    await generateFeaturesUnitReport(testModules, this.options);
  }
}

/**
 * Source-path heuristics that mark test code for `isTest` on extracted nodes.
 * Test sources stay in the scan; they are tagged so the designer can hide them.
 *
 * Framework detection uses import signals parsed from source files, giving more
 * precision than path heuristics for files outside conventional directories.
 */

/** Known test framework identifiers returned by `detectTestFramework`. */
export type TestFramework =
  | 'jest'
  | 'vitest'
  | 'mocha'
  | 'jasmine'
  | 'pytest'
  | 'unittest'
  | 'xunit'
  | 'nunit'
  | 'mstest'
  | 'junit'
  | 'testify'
  | 'go-testing'
  | 'unknown-test';

interface FrameworkRule {
  framework: TestFramework;
  /** Match any element of importModules (case-insensitive substring). */
  importModules?: string[];
  /** Match if baseName or relativePath contains all of these strings (case-insensitive). */
  pathTokens?: string[];
}

const FRAMEWORK_RULES: FrameworkRule[] = [
  // JavaScript / TypeScript
  { framework: 'vitest', importModules: ['vitest'] },
  {
    framework: 'jest',
    importModules: ['@jest/globals', 'jest-circus', '@testing-library/jest-dom'],
  },
  { framework: 'jest', pathTokens: ['jest.config'] },
  { framework: 'mocha', importModules: ['mocha', 'chai'] },
  { framework: 'jasmine', importModules: ['jasmine'] },
  // Python
  { framework: 'pytest', importModules: ['pytest', '_pytest'] },
  { framework: 'unittest', importModules: ['unittest'] },
  // .NET
  { framework: 'xunit', importModules: ['xunit', 'Xunit'] },
  { framework: 'nunit', importModules: ['nunit', 'NUnit'] },
  // mstest before unittest to avoid 'unittest' substring matching 'unittesting'
  { framework: 'mstest', importModules: ['microsoft.visualstudio.testtools', 'mstest'] },
  // Java / Kotlin
  { framework: 'junit', importModules: ['org.junit', 'junit.framework', 'io.kotest'] },
  // Go — path-based: *_test.go uses the "testing" stdlib package
  { framework: 'go-testing', importModules: ['testing'] },
  { framework: 'testify', importModules: ['github.com/stretchr/testify'] },
];

/**
 * Detect the test framework in use from import specifiers (and optionally file path).
 * Returns `null` when no known framework is found.
 *
 * @param importModules - module specifiers from the parsed file (e.g. `file.imports.map(i => i.moduleSpecifier)`)
 * @param relativePath  - optional relative path for path-based rules
 */
export function detectTestFramework(
  importModules: string[],
  relativePath?: string
): TestFramework | null {
  const lowerImports = importModules.map(m => m.toLowerCase());
  const haystack = relativePath ? relativePath.toLowerCase() : '';

  for (const rule of FRAMEWORK_RULES) {
    if (rule.importModules) {
      if (
        rule.importModules.some(m => {
          const needle = m.toLowerCase();
          return lowerImports.some(imp => {
            // Require that the needle matches at a module-boundary:
            // the import must equal needle exactly or start with needle followed by '.' or '/'.
            return imp === needle || imp.startsWith(`${needle}.`) || imp.startsWith(`${needle}/`);
          });
        })
      ) {
        return rule.framework;
      }
    }
    if (rule.pathTokens && relativePath) {
      if (rule.pathTokens.every(tok => haystack.includes(tok.toLowerCase()))) {
        return rule.framework;
      }
    }
  }

  return null;
}

/**
 * True for dedicated test-project folder names (e.g. Ordering.UnitTests, IntegrationTests).
 */
export function isTestProjectSegment(segment: string): boolean {
  return (
    /\.(Unit|Integration|Functional)?Tests?$/i.test(segment) ||
    /^(Unit|Integration|Functional|E2E|EndToEnd)Tests?$/i.test(segment)
  );
}

/**
 * Whether a relative source path should be tagged as test code.
 *
 * Covers JS/TS (`*.test.ts`, `__tests__`), .NET (`*.UnitTests`, `FooTests.cs`),
 * Go (`*_test.go`), Java (`*Test.java`, `src/test`), and Python (`test_*.py`).
 */
export function isTestSourcePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const baseName = segments[segments.length - 1] ?? '';

  // JS/TS: file.test.ts, file.spec.tsx, setupTests.ts
  if (/\.(test|spec)\.[^./]+$/i.test(baseName)) return true;
  if (/^setupTests\.[^./]+$/i.test(baseName)) return true;

  // Go: foo_test.go
  if (/_test\.[^./]+$/i.test(baseName)) return true;

  // .NET: FooTests.cs (plural avoids Contest.cs / Context.cs false positives)
  if (/Tests\.[^./]+$/i.test(baseName)) return true;

  // Java/Kotlin: FooTest.java
  if (/Test\.(java|kt|kts)$/i.test(baseName)) return true;

  // Python: test_foo.py, foo_test.py
  if (/^test_.+\.[^./]+$/i.test(baseName) || /^.+_test\.[^./]+$/i.test(baseName)) return true;

  // Path segments (exclude the filename)
  for (const seg of segments.slice(0, -1)) {
    if (/^(__tests__|tests?)$/i.test(seg)) return true;
    if (isTestProjectSegment(seg)) return true;
  }

  return false;
}

/**
 * Source-path heuristics that mark test code for `isTest` on extracted nodes.
 * Test sources stay in the scan; they are tagged so the designer can hide them.
 *
 * Home for future test-classification helpers (kinds, frameworks, coverage cues, …).
 */

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

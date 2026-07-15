import { describe, it, expect } from 'vitest';
import { TypeScriptAnalyzer } from './typescriptAnalyzer.ts';

describe('TypeScriptAnalyzer Strategy', () => {
  const analyzer = new TypeScriptAnalyzer();

  it('supports ts, tsx, js, jsx', () => {
    expect(analyzer.supports('ts')).toBe(true);
    expect(analyzer.supports('tsx')).toBe(true);
    expect(analyzer.supports('js')).toBe(true);
    expect(analyzer.supports('jsx')).toBe(true);
    expect(analyzer.supports('cs')).toBe(false);
  });

  it('creates node with correct properties', () => {
    const node = analyzer.createNode(
      {
        filePath: 'test.ts',
        relativePath: 'src/test.ts',
        baseName: 'test',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      'test',
      false
    );
    expect(node.type).toBe('background-worker');
    expect(node.properties?.technology).toBe('TypeScript Domain Service');
  });

  it('computes container info correctly', () => {
    const info = analyzer.getContainerInfo(
      { entityRef: 'test', type: 'background-worker', name: 'test' },
      'system',
      'ts',
      'src/domain/test.ts'
    );
    expect(info?.entityRef).toBe('domain-logic');
  });
});

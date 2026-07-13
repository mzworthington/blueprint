import { describe, it, expect } from 'vitest';
import { PythonAnalyzer } from './pythonAnalyzer.ts';
import { NodeType } from '../../core/generated/blueprint/v1/schema.ts';

describe('PythonAnalyzer Strategy', () => {
  const analyzer = new PythonAnalyzer();

  it('supports py', () => {
    expect(analyzer.supports('py')).toBe(true);
    expect(analyzer.supports('ts')).toBe(false);
  });

  it('creates node with default properties', () => {
    const node = analyzer.createNode(
      {
        filePath: 'main.py',
        relativePath: 'src/main.py',
        baseName: 'main',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      'main',
      false
    );
    expect(node.type).toBe(NodeType.NODE_TYPE_BACKGROUND_WORKER);
    expect(node.properties?.technology).toBe('Python Domain Service');
  });
});

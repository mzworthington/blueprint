import { describe, it, expect } from 'vitest';
import { CSharpAnalyzer } from './csharpAnalyzer.ts';

describe('CSharpAnalyzer Strategy', () => {
  const analyzer = new CSharpAnalyzer();

  it('supports cs', () => {
    expect(analyzer.supports('cs')).toBe(true);
    expect(analyzer.supports('ts')).toBe(false);
  });

  it('creates node with default properties', () => {
    const node = analyzer.createNode(
      {
        filePath: 'Data.cs',
        relativePath: 'src/Data.cs',
        baseName: 'Data',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      'data',
      false
    );
    expect(node.type).toBe('background-worker');
    expect(node.properties?.technology).toBe('C# Domain Service');
  });

  it('computes container info from C# namespaces', () => {
    const info = analyzer.getContainerInfo(
      {
        entityRef: 'usercontroller',
        type: 'background-worker',
        name: 'UserController',
        properties: {
          namespaces: 'TestProject.Controllers,TestProject.Services',
        },
      },
      'testproject',
      'cs',
      'src/UserController.cs'
    );
    expect(info?.entityRef).toBe('testproject_controllers');
    expect(info?.name).toBe('TestProject.Controllers');
  });
});

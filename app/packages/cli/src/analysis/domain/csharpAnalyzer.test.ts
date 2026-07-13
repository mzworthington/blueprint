import { describe, it, expect } from 'vitest';
import { CSharpAnalyzer } from './csharpAnalyzer.ts';
import { NodeType } from '../../core/generated/blueprint/v1/schema.ts';

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
    expect(node.type).toBe(NodeType.NODE_TYPE_BACKGROUND_WORKER);
    expect(node.properties?.technology).toBe('C# Domain Service');
  });

  it('computes container info from C# namespaces', () => {
    const info = analyzer.getContainerInfo(
      {
        id: 'usercontroller',
        type: NodeType.NODE_TYPE_BACKGROUND_WORKER,
        name: 'UserController',
        properties: {
          namespaces: 'TestProject.Controllers,TestProject.Services',
        },
      },
      'testproject',
      'cs',
      'src/UserController.cs'
    );
    expect(info?.id).toBe('testproject_controllers');
    expect(info?.name).toBe('TestProject.Controllers');
  });
});

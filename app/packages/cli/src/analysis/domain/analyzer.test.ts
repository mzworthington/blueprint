import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CodebaseAnalyzer } from './analyzer.ts';
import { MockParser, MockLayout, MockFileSystem, MockLogger } from '../../test/fakes.ts';

const mockContextWrite = vi.fn();
const mockContainerWrite = vi.fn();
const mockComponentWrite = vi.fn();

vi.mock('../../writers/contextLevelWriter.ts', () => {
  return {
    ContextLevelWriter: class {
      write = mockContextWrite;
    },
  };
});

vi.mock('../../writers/containerLevelWriter.ts', () => {
  return {
    ContainerLevelWriter: class {
      write = mockContainerWrite;
    },
  };
});

vi.mock('../../writers/componentLevelWriter.ts', () => {
  return {
    ComponentLevelWriter: class {
      write = mockComponentWrite;
    },
  };
});

describe('CodebaseAnalyzer Domain Service', () => {
  let parser: MockParser;
  let layout: MockLayout;
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let analyzer: CodebaseAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    parser = new MockParser();
    layout = new MockLayout();
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    fileSystem.existingFiles.add('/workspace/package.json');
    analyzer = new CodebaseAnalyzer({ parser, layout, fileSystem, logger });
  });

  it('should correctly run analysis and delegate to writers', async () => {
    parser.files = [
      {
        filePath: '/workspace/src/domain/graph.ts',
        relativePath: 'src/domain/graph.ts',
        baseName: 'graph',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: '/workspace/src/adapters/Canvas.tsx',
        relativePath: 'src/adapters/Canvas.tsx',
        baseName: 'Canvas',
        isTestFile: false,
        imports: [{ moduleSpecifier: 'react' }, { moduleSpecifier: '../domain/graph' }],
        newExpressions: [],
        callExpressions: ['fetch'],
      },
    ];

    await analyzer.runAnalysis('test-pkg', 'blueprints');

    // 1. Verify ContextLevelWriter was called
    expect(mockContextWrite).toHaveBeenCalledTimes(1);
    expect(mockContextWrite).toHaveBeenCalledWith('/workspace/blueprints', 'test-pkg', 'test-pkg');

    // 2. Verify ContainerLevelWriter was called
    expect(mockContainerWrite).toHaveBeenCalledTimes(1);
    const containerArgs = mockContainerWrite.mock.calls[0];
    expect(containerArgs[0]).toBe('/workspace/blueprints/test-pkg');
    expect(containerArgs[1]).toBe('test-pkg');
    expect(containerArgs[2]).toBe('test-pkg');
    // Verify container nodes map contains our extracted containers (domain, adapters)
    const containerNodesMap = containerArgs[3];
    expect(containerNodesMap.has('domain')).toBe(true);
    expect(containerNodesMap.has('adapters')).toBe(true);

    // 3. Verify ComponentLevelWriter was called
    expect(mockComponentWrite).toHaveBeenCalledTimes(1);
    const componentArgs = mockComponentWrite.mock.calls[0];
    expect(componentArgs[0]).toBe('/workspace/blueprints/test-pkg');
    expect(componentArgs[1]).toBe('test-pkg');
    expect(componentArgs[2]).toBe('test-pkg');
    // Verify component nodes map contains our extracted components (graph, canvas)
    const componentNodesMap = componentArgs[3];
    expect(componentNodesMap.has('domain/graph')).toBe(true);
    expect(componentNodesMap.has('adapters/canvas')).toBe(true);
  });

  describe('Obsolete File Deletion Fallback', () => {
    it('should not throw if deleting non-existent obsolete files', async () => {
      parser.files = [];
      await expect(analyzer.runAnalysis('test-pkg', 'blueprints')).resolves.not.toThrow();
    });
  });
});

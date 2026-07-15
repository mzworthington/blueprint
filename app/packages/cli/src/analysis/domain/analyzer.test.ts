import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CodebaseAnalyzer } from './analyzer.ts';
import { MockParser, MockLayout, MockFileSystem, MockLogger } from '../../test/fakes.ts';

const mockContextWrite = vi.fn();
const mockContextWriteSystems = vi.fn();
const mockContainerWrite = vi.fn();
const mockComponentWrite = vi.fn();

vi.mock('../../writers/contextLevelWriter.ts', () => {
  return {
    ContextLevelWriter: class {
      write = mockContextWrite;
      writeSystems = mockContextWriteSystems;
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

    // 1. Verify ContextLevelWriter.writeSystems was called once with the fallback system
    expect(mockContextWriteSystems).toHaveBeenCalledTimes(1);
    expect(mockContextWriteSystems).toHaveBeenCalledWith(
      '/workspace/blueprints',
      'test-pkg',
      [
        {
          entityRef: 'test-pkg',
          displayName: 'Test Pkg',
          rootPath: '',
          productId: 'test-pkg',
          isProductHub: true,
        },
      ],
      undefined
    );

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

  it('splits complex monorepos into multiple systems from workspaces', async () => {
    fileSystem.textFiles.set(
      '/workspace/package.json',
      JSON.stringify({ name: 'backstage', workspaces: ['packages/*', 'plugins/*'] })
    );
    fileSystem.textFiles.set(
      '/workspace/microsite/package.json',
      JSON.stringify({ name: 'microsite' })
    );
    fileSystem.directories.set('/workspace', ['packages', 'plugins', 'microsite', 'docs']);
    fileSystem.existingFiles.add('/workspace/packages/catalog/package.json');
    fileSystem.existingFiles.add('/workspace/plugins/search/package.json');

    parser.files = [
      {
        filePath: '/workspace/packages/catalog/src/index.ts',
        relativePath: 'packages/catalog/src/index.ts',
        baseName: 'index',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: '/workspace/plugins/search/src/plugin.ts',
        relativePath: 'plugins/search/src/plugin.ts',
        baseName: 'plugin',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: '/workspace/microsite/src/pages/index.tsx',
        relativePath: 'microsite/src/pages/index.tsx',
        baseName: 'index',
        isTestFile: false,
        imports: [{ moduleSpecifier: 'react' }],
        newExpressions: [],
        callExpressions: [],
      },
    ];

    await analyzer.runAnalysis('backstage', 'blueprints');

    expect(mockContextWriteSystems).toHaveBeenCalledTimes(1);
    const systemsArg = mockContextWriteSystems.mock.calls[0][2] as Array<{
      entityRef: string;
      productId: string;
      isProductHub?: boolean;
    }>;
    expect(systemsArg.map(s => s.entityRef).sort()).toEqual([
      'backstage',
      'microsite',
      'packages',
      'plugins',
    ]);
    expect(systemsArg.find(s => s.entityRef === 'backstage')?.isProductHub).toBe(true);
    expect(systemsArg.every(s => s.productId === 'backstage')).toBe(true);
    expect(mockContainerWrite.mock.calls.map(c => c[0]).sort()).toEqual([
      '/workspace/blueprints/microsite',
      '/workspace/blueprints/packages',
      '/workspace/blueprints/plugins',
    ]);
  });

  it('should not throw if analyzing an empty file set', async () => {
    parser.files = [];
    await expect(analyzer.runAnalysis('test-pkg', 'blueprints')).resolves.not.toThrow();
  });

  it('attaches forensics onto component and container nodes when metrics are provided', async () => {
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
    ];

    const forensicsByPath = new Map([
      [
        'src/domain/graph.ts',
        {
          path: 'src/domain/graph.ts',
          complexity: 22,
          loc: 40,
          sloc: 30,
          churn: 7,
          authorCount: 1,
          topAuthorPercent: 1,
          coupledFiles: [],
          hotspotScore: 0.85,
          classifications: ['hotspot' as const, 'knowledge-silo' as const],
          sinceDays: 45,
        },
      ],
    ]);

    await analyzer.runAnalysis('test-pkg', 'blueprints', 'src/**/*.ts', undefined, {
      forensicsByPath,
    });

    const componentNodesMap = mockComponentWrite.mock.calls[0][3] as Map<
      string,
      { forensics?: { complexity?: number; hotspotScore?: number; sinceDays?: number } }
    >;
    const graph = componentNodesMap.get('domain/graph');
    expect(graph?.forensics?.complexity).toBe(22);
    expect(graph?.forensics?.hotspotScore).toBe(0.85);
    expect(graph?.forensics?.sinceDays).toBe(45);

    const containerNodesMap = mockContainerWrite.mock.calls[0][3] as Map<
      string,
      { forensics?: { hotspotCount?: number; fileCount?: number; sinceDays?: number } }
    >;
    expect(containerNodesMap.get('domain')?.forensics?.fileCount).toBe(1);
    expect(containerNodesMap.get('domain')?.forensics?.hotspotCount).toBe(1);
    expect(containerNodesMap.get('domain')?.forensics?.sinceDays).toBe(45);

    expect(mockContextWriteSystems).toHaveBeenCalledWith(
      '/workspace/blueprints',
      'test-pkg',
      expect.any(Array),
      expect.objectContaining({
        forensicsComponentNodes: expect.any(Array),
      })
    );
  });

  it('stops when the abort signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      analyzer.runAnalysis('test-pkg', 'blueprints', 'src/**/*.ts', controller.signal)
    ).rejects.toMatchObject({ name: 'CancellationError' });
    expect(mockContextWriteSystems).not.toHaveBeenCalled();
  });
});

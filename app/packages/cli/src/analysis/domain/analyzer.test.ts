import { describe, it, expect, beforeEach } from 'vitest';
import { CodebaseAnalyzer } from './analyzer.ts';
import type {
  CodebaseParserPort,
  LayoutPort,
  AnalysisFileSystemPort,
  LoggerPort,
} from './ports.ts';
import type { ParsedSourceFile } from './types.ts';
import type { SystemNode, SystemDependency } from '../../core/generated/blueprint/v1/schema.ts';

class MockParser implements CodebaseParserPort {
  files: ParsedSourceFile[] = [];
  async parseSourceFiles(_globPattern: string): Promise<ParsedSourceFile[]> {
    return this.files;
  }
}

class MockLayout implements LayoutPort {
  async computeLayout(
    nodes: SystemNode[],
    _dependencies: SystemDependency[]
  ): Promise<SystemNode[]> {
    return nodes.map((n, idx) => ({
      ...n,
      x: (idx + 1) * 10,
      y: (idx + 1) * 20,
    }));
  }
}

class MockFileSystem implements AnalysisFileSystemPort {
  writtenFiles = new Map<string, string>();
  deletedFiles = new Set<string>();
  existingFiles = new Set<string>();
  createdDirs = new Set<string>();
  pkgName: string | null = 'test-pkg';

  async writeSchema(filePath: string, yamlContent: string): Promise<void> {
    this.writtenFiles.set(filePath, yamlContent);
    this.existingFiles.add(filePath); // Automatically treat written files as existing
  }

  async readSchema(filePath: string): Promise<string> {
    const content = this.writtenFiles.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  exists(filePath: string): boolean {
    return this.existingFiles.has(filePath);
  }

  mkdir(dirPath: string): void {
    this.createdDirs.add(dirPath);
  }

  unlink(filePath: string): void {
    this.deletedFiles.add(filePath);
  }

  readPackageJsonName(_packageJsonPath: string): string | null {
    return this.pkgName;
  }

  getRelativePath(from: string, to: string): string {
    return to.replace(from, '').replace(/^[\\/]/, '');
  }

  getAbsolutePath(...parts: string[]): string {
    const joined = parts.join('/');
    return joined.startsWith('/') ? joined : '/' + joined;
  }

  getCurrentWorkingDirectory(): string {
    return '/workspace';
  }
}

class MockLogger implements LoggerPort {
  logs: string[] = [];
  info(message: string, _context?: Record<string, unknown>): void {
    this.logs.push(`INFO: ${message}`);
  }
  warn(message: string, _context?: Record<string, unknown>): void {
    this.logs.push(`WARN: ${message}`);
  }
  error(message: string, _error?: unknown, _context?: Record<string, unknown>): void {
    this.logs.push(`ERROR: ${message}`);
  }
}

describe('CodebaseAnalyzer Domain Service', () => {
  let parser: MockParser;
  let layout: MockLayout;
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let analyzer: CodebaseAnalyzer;

  beforeEach(() => {
    parser = new MockParser();
    layout = new MockLayout();
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    fileSystem.existingFiles.add('/workspace/package.json');
    analyzer = new CodebaseAnalyzer({ parser, layout, fileSystem, logger });
  });

  it('should correctly run analysis and write yaml schemas', async () => {
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

    // Mark package.json and old files as existing
    fileSystem.existingFiles.add('/workspace/package.json');
    fileSystem.existingFiles.add('/workspace/blueprints/test-pkg.yaml');
    fileSystem.existingFiles.add('/workspace/blueprints/test-pkg-components.yaml');

    await analyzer.runAnalysis();

    // Verify written schema files
    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg/containers.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg/domain-logic-components.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg/frontend-ui-components.yaml');
    expect(writtenPaths).not.toContain('/workspace/blueprints/test-pkg/workspace.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/context.yaml');

    // Inspect container schema content
    const containerYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/test-pkg/containers.yaml'
    )!;
    expect(containerYaml).toContain('Test Pkg - Container Level');
    expect(containerYaml).toContain('parentRef: test-pkg');
    expect(containerYaml).toContain('id: frontend-ui');
    expect(containerYaml).toContain('id: domain-logic');
    expect(containerYaml).toContain('id: external-services');

    // Inspect context schema content
    const contextYaml = fileSystem.writtenFiles.get('/workspace/blueprints/context.yaml')!;
    expect(contextYaml).toContain('Workspace Context');
    expect(contextYaml).toContain('id: test-pkg');
    expect(contextYaml).toContain('name: Test Pkg');
    expect(contextYaml).toContain('type: software-system');
  });

  describe('Obsolete File Deletion Fallback', () => {
    it('should not throw if deleting non-existent obsolete files', async () => {
      parser.files = [];
      await expect(analyzer.runAnalysis()).resolves.not.toThrow();
    });
  });
});

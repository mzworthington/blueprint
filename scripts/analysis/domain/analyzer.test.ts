import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodebaseAnalyzer } from './analyzer';
import type { CodebaseParserPort, LayoutPort, AnalysisFileSystemPort, LoggerPort } from './ports';
import type { ParsedSourceFile } from './types';
import type { SystemNode, SystemDependency } from '../../../src/domain/schema';

class MockParser implements CodebaseParserPort {
  files: ParsedSourceFile[] = [];
  async parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]> {
    return this.files;
  }
}

class MockLayout implements LayoutPort {
  async computeLayout(nodes: SystemNode[], dependencies: SystemDependency[]): Promise<SystemNode[]> {
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

  readPackageJsonName(packageJsonPath: string): string | null {
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
  info(message: string, context?: Record<string, unknown>): void {
    this.logs.push(`INFO: ${message}`);
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.logs.push(`WARN: ${message}`);
  }
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
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
        imports: [
          { moduleSpecifier: 'react' },
          { moduleSpecifier: '../domain/graph' },
        ],
        newExpressions: [],
        callExpressions: ['fetch'],
      },
    ];

    // Mark package.json and old files as existing
    fileSystem.existingFiles.add('/workspace/package.json');
    fileSystem.existingFiles.add('/workspace/blueprints/test-pkg.yaml');
    fileSystem.existingFiles.add('/workspace/blueprints/test-pkg-components.yaml');

    await analyzer.runAnalysis();

    // Check cleanup
    expect(fileSystem.deletedFiles.has('/workspace/blueprints/test-pkg.yaml')).toBe(true);
    expect(fileSystem.deletedFiles.has('/workspace/blueprints/test-pkg-components.yaml')).toBe(true);

    // Verify written schema files
    const writtenPaths = Array.from(fileSystem.writtenFiles.keys());
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg-containers.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg-domain-logic-components.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg-frontend-ui-components.yaml');
    expect(writtenPaths).toContain('/workspace/blueprints/test-pkg-workspace.yaml');

    // Inspect Workspace Manifest content
    const manifestYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-workspace.yaml')!;
    expect(manifestYaml).toContain('name: Test Pkg Workspace');
    expect(manifestYaml).toContain('root: ./test-pkg-containers.yaml');

    // Inspect container schema content
    const containerYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-containers.yaml')!;
    expect(containerYaml).toContain('Test Pkg - Container Level');
    expect(containerYaml).toContain('id: frontend-ui');
    expect(containerYaml).toContain('id: domain-logic');
    expect(containerYaml).toContain('id: external-services');
  });

  describe('Heuristics Classification', () => {
    it('should classify React components correctly', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/Header.tsx',
          relativePath: 'src/adapters/Header.tsx',
          baseName: 'Header',
          isTestFile: false,
          imports: [{ moduleSpecifier: '@xyflow/react' }],
          newExpressions: [],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const containerYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-containers.yaml')!;
      expect(containerYaml).toContain('id: frontend-ui');
    });

    it('should classify DB Clients correctly based on imports', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/database.ts',
          relativePath: 'src/adapters/database.ts',
          baseName: 'database',
          isTestFile: false,
          imports: [{ moduleSpecifier: 'mongodb' }],
          newExpressions: [],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const componentYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-frontend-ui-components.yaml')!;
      expect(componentYaml).toContain('type: relational-database');
      expect(componentYaml).toContain('name: database Database');
    });

    it('should classify DB Clients correctly based on new expressions', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/db.ts',
          relativePath: 'src/adapters/db.ts',
          baseName: 'db',
          isTestFile: false,
          imports: [],
          newExpressions: [{ className: 'PrismaClient' }],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const componentYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-frontend-ui-components.yaml')!;
      expect(componentYaml).toContain('type: relational-database');
    });

    it('should classify Message Brokers correctly', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/queue.ts',
          relativePath: 'src/adapters/queue.ts',
          baseName: 'queue',
          isTestFile: false,
          imports: [],
          newExpressions: [{ className: 'BullQueue' }],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const componentYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-frontend-ui-components.yaml')!;
      expect(componentYaml).toContain('type: event-broker');
    });

    it('should classify REST controllers correctly', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/server.ts',
          relativePath: 'src/adapters/server.ts',
          baseName: 'server',
          isTestFile: false,
          imports: [{ moduleSpecifier: 'fastify' }],
          newExpressions: [],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const componentYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-frontend-ui-components.yaml')!;
      expect(componentYaml).toContain('type: rest-api');
    });
  });

  describe('C4 Container Mapping', () => {
    it('should map domain files to domain-logic container', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/domain/user.ts',
          relativePath: 'src/domain/user.ts',
          baseName: 'user',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const containerYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-containers.yaml')!;
      expect(containerYaml).toContain('id: domain-logic');
    });

    it('should map state-sync adapter files to state-sync container', async () => {
      parser.files = [
        {
          filePath: '/workspace/src/adapters/store.ts',
          relativePath: 'src/adapters/store.ts',
          baseName: 'store',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
        },
      ];

      await analyzer.runAnalysis();
      const containerYaml = fileSystem.writtenFiles.get('/workspace/blueprints/test-pkg-containers.yaml')!;
      expect(containerYaml).toContain('id: state-sync');
    });
  });

  describe('Obsolete File Deletion Fallback', () => {
    it('should not throw if deleting non-existent obsolete files', async () => {
      parser.files = [];
      await expect(analyzer.runAnalysis()).resolves.not.toThrow();
    });
  });
});

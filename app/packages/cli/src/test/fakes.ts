import type {
  CodebaseParserPort,
  LayoutPort,
  AnalysisFileSystemPort,
  LoggerPort,
} from '../analysis/domain/ports.ts';
import type { ParsedSourceFile } from '../analysis/domain/types.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';

export class MockParser implements CodebaseParserPort {
  files: ParsedSourceFile[] = [];
  async parseSourceFiles(_globPattern: string): Promise<ParsedSourceFile[]> {
    return this.files;
  }
}

export class MockLayout implements LayoutPort {
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

export class MockFileSystem implements AnalysisFileSystemPort {
  writtenFiles = new Map<string, string>();
  deletedFiles = new Set<string>();
  existingFiles = new Set<string>();
  createdDirs = new Set<string>();
  pkgName: string | null = 'test-pkg';

  async writeSchema(filePath: string, yamlContent: string): Promise<void> {
    this.writtenFiles.set(filePath, yamlContent);
    this.existingFiles.add(filePath);
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
    this.existingFiles.delete(filePath);
  }

  readPackageJsonName(_packageJsonPath: string): string | null {
    return this.pkgName;
  }

  getRelativePath(from: string, to: string): string {
    return to.replace(from, '').replace(/^[\\/]/, '');
  }

  getAbsolutePath(...parts: string[]): string {
    const joined = parts.join('/');
    if (joined.startsWith('/')) return joined;
    return '/workspace/' + joined;
  }

  getCurrentWorkingDirectory(): string {
    return '/workspace';
  }
}

export class MockLogger implements LoggerPort {
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

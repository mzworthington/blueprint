import type { ParsedSourceFile } from './types.ts';
import type { SystemNode, SystemDependency } from '../../core/generated/blueprint/v1/schema.ts';

export interface CodebaseParserPort {
  parseSourceFiles(globPattern: string): Promise<ParsedSourceFile[]>;
}

export interface LayoutPort {
  computeLayout(nodes: SystemNode[], dependencies: SystemDependency[]): Promise<SystemNode[]>;
}

export interface AnalysisFileSystemPort {
  writeSchema(filePath: string, yamlContent: string): Promise<void>;
  exists(filePath: string): boolean;
  mkdir(dirPath: string): void;
  unlink(filePath: string): void;
  readPackageJsonName(packageJsonPath: string): string | null;
  getRelativePath(from: string, to: string): string;
  getAbsolutePath(...parts: string[]): string;
  getCurrentWorkingDirectory(): string;
}

export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

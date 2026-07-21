import type { ParsedSourceFile } from './types.ts';

export interface CodebaseParserPort {
  parseSourceFiles(globPattern: string, signal?: AbortSignal): Promise<ParsedSourceFile[]>;
}

export interface AnalysisFileSystemPort {
  writeSchema(filePath: string, yamlContent: string): Promise<void>;
  readSchema(filePath: string): Promise<string>;
  exists(filePath: string): boolean;
  mkdir(dirPath: string): void;
  unlink(filePath: string): void;
  readPackageJsonName(packageJsonPath: string): string | null;
  /** Raw text read; returns null when missing or unreadable. */
  readText(filePath: string): string | null;
  /** Immediate child names of a directory (files and folders). */
  listDirectoryNames(dirPath: string): string[];
  getRelativePath(from: string, to: string): string;
  getAbsolutePath(...parts: string[]): string;
  getCurrentWorkingDirectory(): string;
}

export interface LoggerPort {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

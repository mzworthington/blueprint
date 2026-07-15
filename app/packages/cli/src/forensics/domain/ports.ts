import type { ForensicsOptions } from './options.ts';
import type { CoupledPair, FileHistoryTraits, ForensicReport, StructuralMetrics } from './types.ts';

export interface SourceFileListerPort {
  /**
   * Returns repo-relative paths matching the forensics glob after ignore filters.
   */
  listSourceFiles(options: ForensicsOptions, signal?: AbortSignal): Promise<string[]>;
}

export interface ComplexityAnalyzerPort {
  /**
   * Extract structural metrics for the given repo-relative paths.
   * Must catch per-file failures, log warnings via injected logger, and continue.
   */
  analyze(
    paths: string[],
    options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]>;
}

export interface GitHistoryPort {
  /**
   * Load non-merge commits touching relevant paths within the sinceDays window.
   * Implementations must use bounded (chunked) git log invocations — not one spawn per file.
   */
  loadHistory(
    rootPath: string,
    options: Pick<ForensicsOptions, 'sinceDays'>,
    signal?: AbortSignal
  ): Promise<import('./types.ts').GitCommit[]>;
}

export interface ReporterPort {
  report(report: ForensicReport, signal?: AbortSignal): Promise<void>;
}

export interface ForensicAnalyzerPorts {
  fileLister: SourceFileListerPort;
  complexity: ComplexityAnalyzerPort;
  gitHistory: GitHistoryPort;
  reporters: ReporterPort[];
}

export type { CoupledPair, FileHistoryTraits, ForensicReport, StructuralMetrics };

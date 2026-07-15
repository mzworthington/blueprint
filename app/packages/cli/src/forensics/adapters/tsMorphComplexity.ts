import { Project, SyntaxKind, type SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import type { LoggerPort } from '../../analysis/domain/ports.ts';
import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import type { ForensicsOptions } from '../domain/options.ts';
import type { ComplexityAnalyzerPort } from '../domain/ports.ts';
import type { StructuralMetrics } from '../domain/types.ts';

const DECISION_KINDS = new Set([
  SyntaxKind.IfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.CaseClause,
  SyntaxKind.CatchClause,
  SyntaxKind.ConditionalExpression,
]);

export function countCyclomaticComplexity(sourceFile: SourceFile): number {
  let complexity = 1;
  sourceFile.forEachDescendant(node => {
    const kind = node.getKind();
    if (DECISION_KINDS.has(kind)) {
      complexity++;
      return;
    }
    if (kind === SyntaxKind.BinaryExpression) {
      const op = node.asKindOrThrow(SyntaxKind.BinaryExpression).getOperatorToken().getKind();
      if (op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken) {
        complexity++;
      }
    }
  });
  return complexity;
}

export function countLocAndSloc(text: string): { loc: number; sloc: number } {
  const withoutBlock = text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ''));
  const lines = withoutBlock.split(/\r?\n/);
  let sloc = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//')) continue;
    sloc++;
  }
  return { loc: lines.length, sloc };
}

export class TsMorphComplexityAdapter implements ComplexityAnalyzerPort {
  constructor(
    private readonly logger: LoggerPort,
    private readonly cwd: string = process.cwd()
  ) {}

  async analyze(
    paths: string[],
    _options: ForensicsOptions,
    signal?: AbortSignal
  ): Promise<StructuralMetrics[]> {
    throwIfAborted(signal);

    const tsConfigPath = path.resolve(this.cwd, 'tsconfig.json');
    const project = new Project(
      fs.existsSync(tsConfigPath)
        ? { tsConfigFilePath: tsConfigPath, skipAddingFilesFromTsConfig: true }
        : {}
    );

    const results: StructuralMetrics[] = [];

    for (const relativePath of paths) {
      throwIfAborted(signal);
      const absolute = path.resolve(this.cwd, relativePath);
      try {
        if (!fs.existsSync(absolute)) {
          this.logger.warn('Skipping missing file for complexity analysis', { path: relativePath });
          continue;
        }
        const sourceFile = project.addSourceFileAtPath(absolute);
        const { loc, sloc } = countLocAndSloc(sourceFile.getFullText());
        results.push({
          path: relativePath.replace(/\\/g, '/'),
          complexity: countCyclomaticComplexity(sourceFile),
          loc,
          sloc,
        });
      } catch (error) {
        this.logger.warn('Failed to analyze structural metrics; continuing', {
          path: relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}

import ignore, { type Ignore } from 'ignore';
import {
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  type AnalysisOptions,
} from '../../domain/analysisOptions.ts';
import { createGitignoreFilter, isIgnoredByGitignore } from './gitignoreFilter.ts';

export type SourcePathFilter = {
  /** True when the relative path should not be scanned. */
  shouldSkip: (relativePath: string) => boolean;
};

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Builds a composable skip predicate:
 *   gitignore ∪ structural defaults ∪ config/CLI ignores
 *   ∩ (optional include allow-list)
 */
export function createSourcePathFilter(
  cwd: string = process.cwd(),
  options: Pick<AnalysisOptions, 'ignore' | 'include'> = { ignore: [], include: [] }
): SourcePathFilter {
  const gitignore = createGitignoreFilter(cwd);

  const structural: Ignore = ignore().add([...DEFAULT_STRUCTURAL_IGNORE_GLOBS]);
  const extra: Ignore = ignore().add(options.ignore || []);
  const include: Ignore | null =
    options.include && options.include.length > 0 ? ignore().add(options.include) : null;

  return {
    shouldSkip(relativePath: string): boolean {
      const normalized = normalizeRelative(relativePath);
      if (!normalized || normalized === '.') return false;

      if (isIgnoredByGitignore(normalized, gitignore)) return true;
      if (structural.ignores(normalized)) return true;
      if (options.ignore?.length && extra.ignores(normalized)) return true;
      if (include && !include.ignores(normalized)) return true;

      return false;
    },
  };
}

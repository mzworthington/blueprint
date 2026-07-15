import fs from 'fs';
import path from 'path';
import ignore, { type Ignore } from 'ignore';

/**
 * Loads `.gitignore` from `cwd` and ancestors (until filesystem root).
 * Always skips `.git` directories regardless of gitignore content.
 */
export function createGitignoreFilter(cwd: string = process.cwd()): Ignore {
  const ig = ignore();
  ig.add('.git');

  let dir = path.resolve(cwd);
  const seen = new Set<string>();

  while (true) {
    const gitignorePath = path.join(dir, '.gitignore');
    if (fs.existsSync(gitignorePath) && !seen.has(gitignorePath)) {
      seen.add(gitignorePath);
      try {
        const content = fs.readFileSync(gitignorePath, 'utf8');
        ig.add(content);
      } catch {
        // ignore unreadable files
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return ig;
}

/** True when a path relative to the scan root should be skipped. */
export function isIgnoredByGitignore(
  relativePath: string,
  ig: Ignore = createGitignoreFilter()
): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized === '.') return false;
  return ig.ignores(normalized);
}

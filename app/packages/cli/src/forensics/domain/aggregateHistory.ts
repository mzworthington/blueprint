import type { GitCommit } from './types.ts';
import type { FileHistoryTraits } from './types.ts';

/**
 * Aggregate per-file churn and authorship from an in-memory commit list.
 */
export function aggregateFileHistory(
  commits: readonly GitCommit[],
  paths: readonly string[]
): FileHistoryTraits[] {
  const pathSet = new Set(paths);
  const byPath = new Map<string, { hashes: Set<string>; authors: Map<string, number> }>();

  for (const path of paths) {
    byPath.set(path, { hashes: new Set(), authors: new Map() });
  }

  for (const commit of commits) {
    const touched = new Set(commit.paths.filter(p => pathSet.has(p)));
    for (const path of touched) {
      const entry = byPath.get(path);
      if (!entry) continue;
      entry.hashes.add(commit.hash);
      entry.authors.set(commit.authorEmail, (entry.authors.get(commit.authorEmail) ?? 0) + 1);
    }
  }

  return paths.map(path => {
    const entry = byPath.get(path)!;
    const churn = entry.hashes.size;
    const authorCount = entry.authors.size;
    let topAuthorPercent = 0;
    if (churn > 0 && authorCount > 0) {
      let maxCommits = 0;
      for (const count of entry.authors.values()) {
        if (count > maxCommits) maxCommits = count;
      }
      topAuthorPercent = maxCommits / churn;
    }
    return {
      path,
      churn,
      authorCount,
      topAuthorPercent,
      commitHashes: [...entry.hashes],
    };
  });
}

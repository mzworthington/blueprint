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
  const byPath = new Map<
    string,
    { hashes: Set<string>; authors: Map<string, { name?: string; commits: number }> }
  >();

  for (const path of paths) {
    byPath.set(path, { hashes: new Set(), authors: new Map() });
  }

  for (const commit of commits) {
    const touched = new Set(commit.paths.filter(p => pathSet.has(p)));
    for (const path of touched) {
      const entry = byPath.get(path);
      if (!entry) continue;
      entry.hashes.add(commit.hash);
      const existing = entry.authors.get(commit.authorEmail) ?? { commits: 0 };
      entry.authors.set(commit.authorEmail, {
        commits: existing.commits + 1,
        name: commit.authorName || existing.name,
      });
    }
  }

  return paths.map(path => {
    const entry = byPath.get(path)!;
    const churn = entry.hashes.size;
    const authorCount = entry.authors.size;
    let topAuthorPercent = 0;
    if (churn > 0 && authorCount > 0) {
      let maxCommits = 0;
      for (const info of entry.authors.values()) {
        if (info.commits > maxCommits) maxCommits = info.commits;
      }
      topAuthorPercent = maxCommits / churn;
    }

    const contributors = Array.from(entry.authors.entries())
      .map(([email, info]) => ({
        email,
        name: info.name,
        commits: info.commits,
      }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10);

    return {
      path,
      churn,
      authorCount,
      topAuthorPercent,
      contributors,
      commitHashes: [...entry.hashes],
    };
  });
}

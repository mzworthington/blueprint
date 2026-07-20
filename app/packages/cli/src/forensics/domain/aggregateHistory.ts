import type { GitCommit } from './types.ts';
import type { FileHistoryTraits } from './types.ts';

export interface AggregateFileHistoryOptions {
  sinceDays?: number;
  /** Clock anchor for week bucketing (defaults to now). */
  referenceDate?: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Bucket commit touches for a single file into weekly churn counts.
 * Index 0 is the oldest week in the lookback window.
 */
export function computeChurnByWeek(
  commits: readonly GitCommit[],
  path: string,
  sinceDays: number,
  referenceDate: Date = new Date()
): number[] {
  const weekCount = Math.max(1, Math.ceil(sinceDays / 7));
  const buckets = new Array<number>(weekCount).fill(0);
  const windowStart = new Date(referenceDate.getTime() - sinceDays * MS_PER_DAY);

  for (const commit of commits) {
    if (!commit.paths.includes(path)) continue;
    if (commit.authorDate < windowStart) continue;
    const weekIndex = Math.min(
      weekCount - 1,
      Math.floor((commit.authorDate.getTime() - windowStart.getTime()) / MS_PER_WEEK)
    );
    buckets[weekIndex] += 1;
  }

  return buckets;
}

/**
 * Aggregate per-file churn and authorship from an in-memory commit list.
 */
export function aggregateFileHistory(
  commits: readonly GitCommit[],
  paths: readonly string[],
  options: AggregateFileHistoryOptions = {}
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

  const referenceDate = options.referenceDate ?? new Date();

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
    const churnByWeek =
      options.sinceDays != null
        ? computeChurnByWeek(commits, path, options.sinceDays, referenceDate)
        : undefined;
    return {
      path,
      churn,
      churnByWeek,
      authorCount,
      topAuthorPercent,
      commitHashes: [...entry.hashes],
    };
  });
}

import type { CoupledPair, GitCommit } from './types.ts';

/**
 * Jaccard-style temporal coupling:
 * shared / (commitsA + commitsB - shared)
 */
export function couplingScore(shared: number, commitsA: number, commitsB: number): number {
  const denom = commitsA + commitsB - shared;
  if (denom <= 0) return 0;
  return shared / denom;
}

/**
 * Build co-change pairs from commits. Paths are ordered lexicographically in each pair (a < b).
 */
export function computeTemporalCoupling(
  commits: readonly GitCommit[],
  options: { minSharedCommits: number; couplingThreshold: number },
  /** Optional allow-list; when set, only these paths participate. */
  allowedPaths?: ReadonlySet<string>
): CoupledPair[] {
  const fileCommits = new Map<string, Set<string>>();

  for (const commit of commits) {
    const paths = commit.paths.filter(p => !allowedPaths || allowedPaths.has(p));
    for (const path of paths) {
      let set = fileCommits.get(path);
      if (!set) {
        set = new Set();
        fileCommits.set(path, set);
      }
      set.add(commit.hash);
    }
  }

  const paths = [...fileCommits.keys()].sort();
  const pairs: CoupledPair[] = [];

  for (let i = 0; i < paths.length; i++) {
    const a = paths[i]!;
    const setA = fileCommits.get(a)!;
    for (let j = i + 1; j < paths.length; j++) {
      const b = paths[j]!;
      const setB = fileCommits.get(b)!;
      let shared = 0;
      for (const hash of setA) {
        if (setB.has(hash)) shared++;
      }
      if (shared < options.minSharedCommits) continue;
      const score = couplingScore(shared, setA.size, setB.size);
      if (score < options.couplingThreshold) continue;
      pairs.push({ a, b, score, sharedCommits: shared });
    }
  }

  return pairs.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a));
}

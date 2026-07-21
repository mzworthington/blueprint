import type { ForensicAuthor, NodeForensics } from '../models/schema';

export type OwnershipConcentration = 'solo' | 'shared' | 'distributed';

export interface OwnershipAuthor {
  email: string;
  commits: number;
  percent: number;
}

export interface OwnershipBreakdown {
  authors: OwnershipAuthor[];
  concentration: OwnershipConcentration;
}

function classifyConcentration(topPercent: number, authorCount: number): OwnershipConcentration {
  if (authorCount <= 1 || topPercent >= 0.9) return 'solo';
  if (topPercent >= 0.6) return 'shared';
  return 'distributed';
}

/**
 * Roll up author commit counts from child forensics (container/system rollups).
 */
export function rollupForensicAuthors(
  forensicsList: readonly Pick<NodeForensics, 'authors'>[]
): ForensicAuthor[] {
  const byEmail = new Map<string, number>();
  for (const forensics of forensicsList) {
    for (const author of forensics.authors ?? []) {
      byEmail.set(author.email, (byEmail.get(author.email) ?? 0) + author.commits);
    }
  }
  return [...byEmail.entries()]
    .map(([email, commits]) => ({ email, commits }))
    .sort((a, b) => b.commits - a.commits);
}

/**
 * Build a display ownership breakdown from forensics (component or rolled-up container).
 */
export function buildOwnershipBreakdown(forensics?: NodeForensics): OwnershipBreakdown | undefined {
  if (!forensics?.authors?.length) return undefined;

  const totalCommits = forensics.authors.reduce((sum, a) => sum + a.commits, 0);
  if (totalCommits <= 0) return undefined;

  const authors: OwnershipAuthor[] = forensics.authors.map(a => ({
    email: a.email,
    commits: a.commits,
    percent: a.commits / totalCommits,
  }));

  const topPercent = authors[0]?.percent ?? forensics.topAuthorPercent ?? 0;
  const authorCount = forensics.authorCount ?? authors.length;

  return {
    authors,
    concentration: classifyConcentration(topPercent, authorCount),
  };
}

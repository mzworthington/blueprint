import { describe, expect, it } from 'vitest';
import { aggregateFileHistory } from './aggregateHistory.ts';
import type { GitCommit } from './types.ts';

describe('aggregateFileHistory', () => {
  it('computes churn, authorCount, and topAuthorPercent', () => {
    const commits: GitCommit[] = [
      {
        hash: '1',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
      },
      {
        hash: '2',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
      },
      {
        hash: '3',
        authorEmail: 'bob@ex.com',
        authorDate: new Date(),
        paths: ['a.ts', 'b.ts'],
      },
    ];

    const traits = aggregateFileHistory(commits, ['a.ts', 'b.ts', 'c.ts']);
    const a = traits.find(t => t.path === 'a.ts')!;
    const b = traits.find(t => t.path === 'b.ts')!;
    const c = traits.find(t => t.path === 'c.ts')!;

    expect(a.churn).toBe(3);
    expect(a.authorCount).toBe(2);
    expect(a.topAuthorPercent).toBeCloseTo(2 / 3, 5);

    expect(b.churn).toBe(1);
    expect(b.authorCount).toBe(1);
    expect(b.topAuthorPercent).toBe(1);

    expect(c.churn).toBe(0);
    expect(c.authorCount).toBe(0);
    expect(c.topAuthorPercent).toBe(0);
  });
});

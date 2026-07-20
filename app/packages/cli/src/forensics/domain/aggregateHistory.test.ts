import { describe, expect, it } from 'vitest';
import { aggregateFileHistory, computeChurnByWeek } from './aggregateHistory.ts';
import type { GitCommit } from './types.ts';

describe('computeChurnByWeek', () => {
  it('buckets commits into weekly counts oldest-first', () => {
    const referenceDate = new Date('2026-02-07T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: 'old',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2026-01-12T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'mid',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2026-01-20T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'new',
        authorEmail: 'b@ex.com',
        authorDate: new Date('2026-02-05T12:00:00Z'),
        paths: ['a.ts', 'b.ts'],
      },
    ];

    const weeks = computeChurnByWeek(commits, 'a.ts', 28, referenceDate);
    expect(weeks).toHaveLength(4);
    expect(weeks).toEqual([1, 1, 0, 1]);
    expect(computeChurnByWeek(commits, 'b.ts', 28, referenceDate)).toEqual([0, 0, 0, 1]);
  });
});

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

  it('includes churnByWeek when sinceDays is provided', () => {
    const referenceDate = new Date('2026-01-28T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: '1',
        authorEmail: 'alice@ex.com',
        authorDate: new Date('2026-01-10T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: '2',
        authorEmail: 'alice@ex.com',
        authorDate: new Date('2026-01-24T12:00:00Z'),
        paths: ['a.ts'],
      },
    ];

    const traits = aggregateFileHistory(commits, ['a.ts'], {
      sinceDays: 28,
      referenceDate,
    });
    expect(traits[0].churnByWeek).toBeDefined();
    expect(traits[0].churnByWeek?.reduce((sum, n) => sum + n, 0)).toBe(2);
  });
});

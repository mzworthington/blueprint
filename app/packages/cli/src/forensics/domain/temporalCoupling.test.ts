import { describe, expect, it } from 'vitest';
import { computeTemporalCoupling, couplingScore } from './temporalCoupling.ts';
import type { GitCommit } from './types.ts';

describe('couplingScore', () => {
  it('uses Jaccard-style formula', () => {
    expect(couplingScore(6, 7, 6)).toBeCloseTo(6 / 7, 5);
  });

  it('returns 0 when denominator is non-positive', () => {
    expect(couplingScore(0, 0, 0)).toBe(0);
  });
});

describe('computeTemporalCoupling', () => {
  function commit(hash: string, paths: string[]): GitCommit {
    return {
      hash,
      authorEmail: 'a@example.com',
      authorDate: new Date('2026-01-01'),
      paths,
    };
  }

  it('flags pairs above threshold with enough shared commits', () => {
    const shared = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
    const commits: GitCommit[] = [
      ...shared.map(h => commit(h, ['a.ts', 'b.ts'])),
      commit('c7', ['a.ts']),
    ];
    // a: 7, b: 6, shared: 6 → 6/(7+6-6)=6/7≈0.857
    const pairs = computeTemporalCoupling(commits, {
      minSharedCommits: 5,
      couplingThreshold: 0.75,
    });
    expect(pairs).toEqual([{ a: 'a.ts', b: 'b.ts', score: 6 / 7, sharedCommits: 6 }]);
  });

  it('excludes pairs below shared-commit floor', () => {
    const commits = [
      commit('c1', ['a.ts', 'b.ts']),
      commit('c2', ['a.ts', 'b.ts']),
      commit('c3', ['a.ts', 'b.ts']),
    ];
    const pairs = computeTemporalCoupling(commits, {
      minSharedCommits: 5,
      couplingThreshold: 0.5,
    });
    expect(pairs).toEqual([]);
  });
});

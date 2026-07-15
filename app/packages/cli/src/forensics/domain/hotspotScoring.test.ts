import { describe, expect, it } from 'vitest';
import { computeHotspotScores, minMaxNormalize } from './hotspotScoring.ts';

describe('minMaxNormalize', () => {
  it('returns 0 when max equals min', () => {
    expect(minMaxNormalize(5, 5, 5)).toBe(0);
  });

  it('maps endpoints to 0 and 1', () => {
    expect(minMaxNormalize(1, 1, 11)).toBe(0);
    expect(minMaxNormalize(11, 1, 11)).toBe(1);
    expect(minMaxNormalize(6, 1, 11)).toBe(0.5);
  });
});

describe('computeHotspotScores', () => {
  it('returns empty map for empty input', () => {
    expect(computeHotspotScores([])).toEqual(new Map());
  });

  it('scores the red-zone file highest', () => {
    const scores = computeHotspotScores([
      { path: 'cold.ts', complexity: 1, churn: 1 },
      { path: 'hot.ts', complexity: 20, churn: 50 },
      { path: 'complex-stable.ts', complexity: 20, churn: 1 },
      { path: 'churny-simple.ts', complexity: 1, churn: 50 },
    ]);
    expect(scores.get('hot.ts')).toBe(1);
    expect(scores.get('cold.ts')).toBe(0);
    expect(scores.get('complex-stable.ts')).toBe(0);
    expect(scores.get('churny-simple.ts')).toBe(0);
  });
});

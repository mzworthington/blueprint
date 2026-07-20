import { describe, expect, it } from 'vitest';
import { computeRefactorScore } from './refactorScore';

describe('computeRefactorScore', () => {
  it('ranks complexity × churn × (1 - topAuthorPercent)', () => {
    expect(computeRefactorScore({ complexity: 20, churn: 10, topAuthorPercent: 0.5 })).toBe(100);
    expect(computeRefactorScore({ complexity: 20, churn: 10, topAuthorPercent: 1 })).toBe(0);
    expect(computeRefactorScore({ complexity: 0, churn: 10, topAuthorPercent: 0 })).toBe(0);
    expect(computeRefactorScore({ complexity: 10, churn: 0, topAuthorPercent: 0 })).toBe(0);
  });

  it('treats missing ownership as zero concentration', () => {
    expect(computeRefactorScore({ complexity: 5, churn: 4 })).toBe(20);
  });
});

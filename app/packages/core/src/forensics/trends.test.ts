import { describe, expect, it } from 'vitest';
import { bucketAuthorActivity, bucketComplexityCounts, rollupChurnByWeek } from './trends';

describe('rollupChurnByWeek', () => {
  it('sums aligned weekly buckets across series', () => {
    expect(rollupChurnByWeek([[1, 0, 2], [0, 3, 1], undefined])).toEqual([1, 3, 3]);
  });

  it('pads shorter series with implicit zeros', () => {
    expect(
      rollupChurnByWeek([
        [1, 2],
        [0, 0, 4],
      ])
    ).toEqual([1, 2, 4]);
  });

  it('returns undefined when no series have data', () => {
    expect(rollupChurnByWeek([undefined, [], undefined])).toBeUndefined();
  });
});

describe('bucketComplexityCounts', () => {
  it('groups complexities into display bands', () => {
    expect(bucketComplexityCounts([3, 8, 15, 40, 0])).toEqual([1, 1, 1, 1]);
  });
});

describe('bucketAuthorActivity', () => {
  it('groups author counts into solo, pair, and team bands', () => {
    expect(bucketAuthorActivity([1, 1, 2, 3, 5, 0])).toEqual([2, 2, 1]);
  });
});

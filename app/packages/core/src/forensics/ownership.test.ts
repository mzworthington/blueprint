import { describe, expect, it } from 'vitest';
import { buildOwnershipBreakdown, rollupForensicAuthors } from './ownership';

describe('buildOwnershipBreakdown', () => {
  it('derives concentration from authors list', () => {
    const breakdown = buildOwnershipBreakdown({
      authors: [
        { email: 'a@ex.com', commits: 8 },
        { email: 'b@ex.com', commits: 2 },
      ],
      authorCount: 2,
      topAuthorPercent: 0.8,
    });
    expect(breakdown?.concentration).toBe('shared');
    expect(breakdown?.authors[0]).toMatchObject({ email: 'a@ex.com', percent: 0.8 });
  });

  it('classifies solo ownership', () => {
    const breakdown = buildOwnershipBreakdown({
      authors: [{ email: 'solo@ex.com', commits: 5 }],
      authorCount: 1,
      topAuthorPercent: 1,
    });
    expect(breakdown?.concentration).toBe('solo');
  });
});

describe('rollupForensicAuthors', () => {
  it('sums commits per email across children', () => {
    const rolled = rollupForensicAuthors([
      { authors: [{ email: 'a@ex.com', commits: 3 }] },
      {
        authors: [
          { email: 'a@ex.com', commits: 2 },
          { email: 'b@ex.com', commits: 1 },
        ],
      },
    ]);
    expect(rolled).toEqual([
      { email: 'a@ex.com', commits: 5 },
      { email: 'b@ex.com', commits: 1 },
    ]);
  });
});

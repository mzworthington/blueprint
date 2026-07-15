import { describe, expect, it } from 'vitest';
import { evaluateForensicsConcern } from './concern.ts';

describe('evaluateForensicsConcern', () => {
  it('returns none for undefined or empty forensics', () => {
    expect(evaluateForensicsConcern(undefined)).toEqual({ level: 'none', reasons: [] });
    expect(evaluateForensicsConcern({})).toEqual({ level: 'none', reasons: [] });
  });

  it('marks hotspot classification as danger', () => {
    expect(
      evaluateForensicsConcern({
        classifications: ['hotspot'],
        hotspotScore: 0.2,
      })
    ).toEqual({ level: 'danger', reasons: ['Hotspot'] });
  });

  it('marks knowledge-silo as warning and combines with hotspot as danger', () => {
    expect(
      evaluateForensicsConcern({
        classifications: ['knowledge-silo'],
      })
    ).toEqual({ level: 'warning', reasons: ['Knowledge silo'] });

    const both = evaluateForensicsConcern({
      classifications: ['knowledge-silo', 'hotspot'],
    });
    expect(both.level).toBe('danger');
    expect(both.reasons).toEqual(expect.arrayContaining(['Hotspot', 'Knowledge silo']));
  });

  it('uses secondary thresholds when classifications are absent', () => {
    expect(evaluateForensicsConcern({ hotspotScore: 0.5 })).toEqual({
      level: 'danger',
      reasons: ['High hotspot score'],
    });
    expect(evaluateForensicsConcern({ complexity: 12, authorCount: 1 })).toEqual({
      level: 'warning',
      reasons: ['Knowledge silo risk'],
    });
    expect(evaluateForensicsConcern({ complexity: 12, authorCount: 3 })).toEqual({
      level: 'info',
      reasons: ['Elevated complexity'],
    });
  });
});

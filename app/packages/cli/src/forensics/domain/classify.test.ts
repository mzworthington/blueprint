import { describe, expect, it } from 'vitest';
import { classifyFile } from './classify.ts';

describe('classifyFile', () => {
  it('classifies hotspot when score meets threshold', () => {
    expect(
      classifyFile({
        hotspotScore: 0.6,
        complexity: 5,
        authorCount: 5,
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
      })
    ).toEqual(['hotspot']);
  });

  it('classifies knowledge silo for complex single-author files', () => {
    expect(
      classifyFile({
        hotspotScore: 0.1,
        complexity: 15,
        authorCount: 1,
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
      })
    ).toEqual(['knowledge-silo']);
  });

  it('does not treat never-touched files as silos', () => {
    expect(
      classifyFile({
        hotspotScore: 0,
        complexity: 50,
        authorCount: 0,
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
      })
    ).toEqual([]);
  });

  it('can apply both classifications', () => {
    expect(
      classifyFile({
        hotspotScore: 0.9,
        complexity: 20,
        authorCount: 1,
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
      })
    ).toEqual(['hotspot', 'knowledge-silo']);
  });

  it('returns empty when neither applies', () => {
    expect(
      classifyFile({
        hotspotScore: 0.2,
        complexity: 5,
        authorCount: 3,
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
      })
    ).toEqual([]);
  });
});

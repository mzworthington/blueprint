import { describe, it, expect } from 'vitest';
import type { SystemNode } from '../models/schema';
import {
  hasFinitePosition,
  nodesNeedingLayout,
  preservedBoundingBox,
  seedPreservedPositions,
  mergeLaidOutGapNodes,
  mergeLayoutPositions,
} from './layoutMerge';

const node = (ref: string, x?: number, y?: number): SystemNode => ({
  entityRef: ref,
  type: 'component',
  name: ref,
  ...(x !== undefined ? { x } : {}),
  ...(y !== undefined ? { y } : {}),
});

describe('hasFinitePosition', () => {
  it('requires finite x and y', () => {
    expect(hasFinitePosition(node('a', 10, 20))).toBe(true);
    expect(hasFinitePosition(node('a', 10))).toBe(false);
    expect(hasFinitePosition(node('a'))).toBe(false);
    expect(hasFinitePosition({ ...node('a'), x: Number.NaN, y: 1 })).toBe(false);
  });
});

describe('nodesNeedingLayout', () => {
  it('returns nodes missing a finite position', () => {
    const nodes = [node('a', 1, 2), node('b'), node('c', 3, Number.NaN)];
    expect(nodesNeedingLayout(nodes).map(n => n.entityRef)).toEqual(['b', 'c']);
  });
});

describe('preservedBoundingBox', () => {
  it('returns null when no preserved positions', () => {
    expect(preservedBoundingBox([node('a'), node('b')])).toBeNull();
  });

  it('computes min/max over finite positions', () => {
    expect(preservedBoundingBox([node('a', 10, 20), node('b', 100, 50), node('c')])).toEqual({
      minX: 10,
      minY: 20,
      maxX: 100,
      maxY: 50,
    });
  });
});

describe('seedPreservedPositions', () => {
  it('copies finite positions and strips coords from new nodes', () => {
    const previous = [node('a', 100, 200)];
    const next = [node('a', 0, 0), node('b', 9, 9)];
    const seeded = seedPreservedPositions(previous, next);
    expect(seeded[0]).toMatchObject({ entityRef: 'a', x: 100, y: 200 });
    expect(seeded[1]?.entityRef).toBe('b');
    expect(seeded[1]?.x).toBeUndefined();
    expect(seeded[1]?.y).toBeUndefined();
  });
});

describe('mergeLaidOutGapNodes', () => {
  it('places gap cluster to the right of preserved bbox with gap', () => {
    const preserved = [node('a', 10, 20), node('b', 100, 80)];
    const laidOutGaps = [node('c', 0, 0), node('d', 50, 40)];
    const merged = mergeLaidOutGapNodes(preserved, laidOutGaps, { gap: 80 });

    expect(merged.find(n => n.entityRef === 'a')).toMatchObject({ x: 10, y: 20 });
    expect(merged.find(n => n.entityRef === 'b')).toMatchObject({ x: 100, y: 80 });
    // gap bbox was (0,0)-(50,40); offsetX = maxX + gap - minGapX = 100 + 80 - 0 = 180
    expect(merged.find(n => n.entityRef === 'c')).toMatchObject({ x: 180, y: 0 });
    expect(merged.find(n => n.entityRef === 'd')).toMatchObject({ x: 230, y: 40 });
  });

  it('keeps gap layout as-is when nothing is preserved', () => {
    const merged = mergeLaidOutGapNodes([], [node('c', 5, 6)], { gap: 80 });
    expect(merged).toEqual([node('c', 5, 6)]);
  });
});

describe('mergeLayoutPositions', () => {
  it('preserves existing positions and only layouts gap nodes', () => {
    const previous = [node('a', 100, 200), node('gone', 1, 1)];
    const next = [node('a', 0, 0), node('b')];
    const laidOutGaps = [node('b', 0, 0)];

    const result = mergeLayoutPositions(previous, next, laidOutGaps, { gap: 80 });

    expect(result.find(n => n.entityRef === 'a')).toMatchObject({ x: 100, y: 200 });
    expect(result.find(n => n.entityRef === 'b')).toMatchObject({ x: 180, y: 0 });
    expect(result.map(n => n.entityRef)).toEqual(['a', 'b']);
  });

  it('forceRelayout ignores previous positions', () => {
    const previous = [node('a', 100, 200)];
    const next = [node('a', 0, 0), node('b', 10, 10)];
    const result = mergeLayoutPositions(previous, next, next, { forceRelayout: true });
    expect(result.find(n => n.entityRef === 'a')).toMatchObject({ x: 0, y: 0 });
    expect(result.find(n => n.entityRef === 'b')).toMatchObject({ x: 10, y: 10 });
  });
});

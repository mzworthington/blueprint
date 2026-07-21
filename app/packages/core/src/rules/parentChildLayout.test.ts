import { describe, expect, it } from 'vitest';
import type { SystemNode } from '../models/schema';
import {
  applyRelativePositionsAfterLayout,
  buildParentChildEdges,
  fitGroupBounds,
  hasGroupedLayout,
  packGroupChildren,
  resolveGroupContentLayout,
  stripLayoutCoordinates,
  toAbsolutePosition,
  toRelativePosition,
  topLevelNodes,
} from './parentChildLayout';

describe('parentChildLayout', () => {
  it('topLevelNodes excludes nodes with parentEntityRef', () => {
    const nodes: SystemNode[] = [
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
      },
      { entityRef: 'ctx/user', type: 'person', name: 'User' },
    ];
    expect(
      topLevelNodes(nodes)
        .map(n => n.entityRef)
        .sort()
    ).toEqual(['ctx/hub', 'ctx/user']);
  });

  it('buildParentChildEdges maps parentEntityRef to layout edges', () => {
    const nodes: SystemNode[] = [
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
      { entityRef: 'ctx/a', type: 'software-system', name: 'A', parentEntityRef: 'ctx/hub' },
      { entityRef: 'ctx/b', type: 'software-system', name: 'B', parentEntityRef: 'ctx/hub' },
    ];
    expect(buildParentChildEdges(nodes)).toEqual([
      { from: 'ctx/hub', to: 'ctx/a' },
      { from: 'ctx/hub', to: 'ctx/b' },
    ]);
  });

  it('converts between absolute and relative positions', () => {
    const parent = { x: 100, y: 200 };
    const absolute = { x: 150, y: 260 };
    expect(toRelativePosition(absolute, parent)).toEqual({ x: 50, y: 60 });
    expect(toAbsolutePosition({ x: 50, y: 60 }, parent)).toEqual(absolute);
  });

  it('fitGroupBounds wraps children with padding', () => {
    const bounds = fitGroupBounds([
      { x: 10, y: 20, width: 280, height: 120 },
      { x: 320, y: 40, width: 280, height: 120 },
    ]);
    expect(bounds).toEqual({
      x: -38,
      y: -28,
      width: 686,
      height: 236,
    });
  });

  it('applyRelativePositionsAfterLayout stores child coords relative to parent', () => {
    const nodes: SystemNode[] = [
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', x: 100, y: 100 },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        x: 200,
        y: 250,
      },
    ];
    const result = applyRelativePositionsAfterLayout(nodes);
    expect(result.find(n => n.entityRef === 'ctx/child')).toMatchObject({ x: 48, y: 88 });
    expect(result.find(n => n.entityRef === 'ctx/hub')).toMatchObject({ x: 100, y: 100 });
  });

  it('resolveGroupContentLayout packs children inside the frame', () => {
    const { bounds, positionsByRef } = resolveGroupContentLayout([
      { entityRef: 'ctx/child', x: 0, y: 280 },
    ]);
    expect(bounds.height).toBeGreaterThanOrEqual(216);
    expect(positionsByRef.get('ctx/child')).toEqual({ x: 48, y: 88 });
  });

  it('packGroupChildren lays out multiple children in a row without overlap', () => {
    const { bounds, positionsByRef } = packGroupChildren([
      { entityRef: 'ctx/a' },
      { entityRef: 'ctx/b' },
      { entityRef: 'ctx/c' },
      { entityRef: 'ctx/d' },
    ]);

    expect(bounds.width).toBeGreaterThan(1200);
    const a = positionsByRef.get('ctx/a')!;
    const b = positionsByRef.get('ctx/b')!;
    expect(b.x).toBeGreaterThan(a.x + 250);
  });

  it('hasGroupedLayout detects group and parent-child nodes', () => {
    expect(hasGroupedLayout([{ entityRef: 'a', type: 'group' }])).toBe(true);
    expect(hasGroupedLayout([{ entityRef: 'a' }, { entityRef: 'b', parentEntityRef: 'a' }])).toBe(
      true
    );
    expect(hasGroupedLayout([{ entityRef: 'a', type: 'software-system' }])).toBe(false);
  });

  it('stripLayoutCoordinates removes x and y', () => {
    expect(stripLayoutCoordinates([{ entityRef: 'a', x: 1, y: 2 }])).toEqual([{ entityRef: 'a' }]);
  });
});

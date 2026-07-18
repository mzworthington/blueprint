import { describe, it, expect } from 'vitest';
import type { SystemNode, SystemDependency } from '@blueprint/core';
import type { LayoutPort } from '../analysis/domain/ports.ts';
import { layoutWithPreservation } from './layoutWithPreservation.ts';

class SpyLayout implements LayoutPort {
  calls: Array<{ nodes: SystemNode[]; dependencies: SystemDependency[] }> = [];

  async computeLayout(
    nodes: SystemNode[],
    dependencies: SystemDependency[]
  ): Promise<SystemNode[]> {
    this.calls.push({ nodes: [...nodes], dependencies: [...dependencies] });
    return nodes.map((n, idx) => ({
      ...n,
      x: idx * 10,
      y: idx * 20,
    }));
  }
}

describe('layoutWithPreservation', () => {
  it('preserves previous positions and only layouts gap nodes', async () => {
    const layout = new SpyLayout();
    const previous: SystemNode[] = [
      { entityRef: 'a', type: 'component', name: 'A', x: 100, y: 200 },
    ];
    const next: SystemNode[] = [
      { entityRef: 'a', type: 'component', name: 'A' },
      { entityRef: 'b', type: 'component', name: 'B' },
    ];
    const deps: SystemDependency[] = [{ from: 'a', to: 'b', type: 'direct-call' }];

    const result = await layoutWithPreservation(layout, previous, next, deps);

    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes.map(n => n.entityRef)).toEqual(['b']);
    expect(result.find(n => n.entityRef === 'a')).toMatchObject({ x: 100, y: 200 });
    expect(result.find(n => n.entityRef === 'b')?.x).toBeGreaterThan(100);
  });

  it('forceRelayout layouts the full set', async () => {
    const layout = new SpyLayout();
    const previous: SystemNode[] = [
      { entityRef: 'a', type: 'component', name: 'A', x: 100, y: 200 },
    ];
    const next: SystemNode[] = [
      { entityRef: 'a', type: 'component', name: 'A' },
      { entityRef: 'b', type: 'component', name: 'B' },
    ];

    const result = await layoutWithPreservation(layout, previous, next, [], {
      forceRelayout: true,
    });

    expect(layout.calls).toHaveLength(1);
    expect(layout.calls[0]!.nodes).toHaveLength(2);
    expect(result.find(n => n.entityRef === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('skips the layout engine when every node already has a position', async () => {
    const layout = new SpyLayout();
    const previous: SystemNode[] = [
      { entityRef: 'a', type: 'component', name: 'A', x: 1, y: 2 },
      { entityRef: 'b', type: 'component', name: 'B', x: 3, y: 4 },
    ];
    const next = previous.map(n => ({ ...n, x: undefined, y: undefined }));

    const result = await layoutWithPreservation(layout, previous, next, []);

    expect(layout.calls).toHaveLength(0);
    expect(result).toEqual([
      expect.objectContaining({ entityRef: 'a', x: 1, y: 2 }),
      expect.objectContaining({ entityRef: 'b', x: 3, y: 4 }),
    ]);
  });
});

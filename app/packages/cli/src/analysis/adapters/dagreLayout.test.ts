import { describe, it, expect } from 'vitest';
import { DagreLayoutAdapter, layoutAsGrid, shouldUseGrid } from './dagreLayout.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';

describe('shouldUseGrid', () => {
  it('uses a grid for empty or disconnected graphs', () => {
    expect(shouldUseGrid(0, 0)).toBe(true);
    expect(shouldUseGrid(1, 0)).toBe(true);
    expect(shouldUseGrid(5, 0)).toBe(true);
  });

  it('uses a grid when edge density is low', () => {
    expect(shouldUseGrid(10, 3)).toBe(true);
    expect(shouldUseGrid(10, 4)).toBe(false);
  });
});

describe('layoutAsGrid', () => {
  it('places production nodes before tests in a stable grid', () => {
    const nodes: SystemNode[] = [
      { entityRef: 'z-test', name: 'Z Test', type: 'container', isTest: true },
      { entityRef: 'b-prod', name: 'B', type: 'container', isTest: false },
      { entityRef: 'a-prod', name: 'A', type: 'container', isTest: false },
    ];

    const result = layoutAsGrid(nodes);
    expect(result.map(n => n.entityRef)).toEqual(['a-prod', 'b-prod', 'z-test']);
    expect(result[0].x).toBeLessThan(result[1].x!);
    expect(result.every(n => typeof n.x === 'number' && typeof n.y === 'number')).toBe(true);
  });
});

describe('DagreLayoutAdapter', () => {
  const adapter = new DagreLayoutAdapter();

  it('layouts a connected pair with dagre (top-left coords)', async () => {
    const nodes: SystemNode[] = [
      { entityRef: 'nodeA', name: 'Node A', type: 'component' },
      { entityRef: 'nodeB', name: 'Node B', type: 'component' },
    ];
    const dependencies: SystemDependency[] = [{ from: 'nodeA', to: 'nodeB', type: 'direct-call' }];

    const result = await adapter.computeLayout(nodes, dependencies);
    const nodeA = result.find(n => n.entityRef === 'nodeA')!;
    const nodeB = result.find(n => n.entityRef === 'nodeB')!;

    expect(nodeA.y).toBeLessThan(nodeB.y!);
    // Layers are deliberately tall so edges have room between cards.
    expect(nodeB.y! - nodeA.y!).toBeGreaterThanOrEqual(200);
    expect(nodeA.x).toBeGreaterThanOrEqual(0);
  });

  it('falls back to a grid for sparse container diagrams', async () => {
    const nodes: SystemNode[] = [
      { entityRef: 'api', name: 'API', type: 'container', isTest: false },
      { entityRef: 'web', name: 'Web', type: 'container', isTest: false },
      { entityRef: 'api-tests', name: 'API Tests', type: 'container', isTest: true },
      { entityRef: 'db', name: 'DB', type: 'container', isTest: false },
    ];
    const dependencies: SystemDependency[] = [];

    const result = await adapter.computeLayout(nodes, dependencies);
    expect(result).toHaveLength(4);
    expect(result.find(n => n.entityRef === 'api-tests')!.y).toBeGreaterThanOrEqual(
      result.find(n => n.entityRef === 'api')!.y!
    );
  });

  it('ignores edges that reference missing nodes', async () => {
    const nodes: SystemNode[] = [{ entityRef: 'only', name: 'Only', type: 'component' }];
    const dependencies: SystemDependency[] = [{ from: 'only', to: 'ghost', type: 'direct-call' }];

    const result = await adapter.computeLayout(nodes, dependencies);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBeDefined();
  });
});

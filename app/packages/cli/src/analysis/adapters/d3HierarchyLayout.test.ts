import { describe, expect, it } from 'vitest';
import { D3HierarchyLayoutAdapter } from './d3HierarchyLayout.ts';
import type { SystemNode } from '@blueprint/core';

function nodes(...refs: string[]): SystemNode[] {
  return refs.map(entityRef => ({
    entityRef,
    type: entityRef.endsWith('/user') ? 'person' : 'software-system',
    name: entityRef,
  }));
}

describe('D3HierarchyLayoutAdapter', () => {
  it('places tree children below the root', async () => {
    const adapter = new D3HierarchyLayoutAdapter();
    const result = await adapter.computeLayout(nodes('root', 'left', 'right'), [
      { from: 'root', to: 'left', type: 'direct-call' },
      { from: 'root', to: 'right', type: 'direct-call' },
    ]);

    const byRef = Object.fromEntries(result.map(n => [n.entityRef, n]));
    expect(byRef.root!.y!).toBeLessThan(byRef.left!.y!);
    expect(byRef.root!.y!).toBeLessThan(byRef.right!.y!);
  });

  it('roots context layout at the person node when present', async () => {
    const adapter = new D3HierarchyLayoutAdapter();
    const result = await adapter.computeLayout(nodes('ctx/user', 'ctx/blueprint', 'ctx/packages'), [
      { from: 'ctx/user', to: 'ctx/blueprint', type: 'direct-call' },
      { from: 'ctx/blueprint', to: 'ctx/packages', type: 'direct-call' },
    ]);

    const byRef = Object.fromEntries(result.map(n => [n.entityRef, n]));
    expect(byRef['ctx/user']!.y!).toBeLessThan(byRef['ctx/blueprint']!.y!);
    expect(byRef['ctx/blueprint']!.y!).toBeLessThan(byRef['ctx/packages']!.y!);
  });
});

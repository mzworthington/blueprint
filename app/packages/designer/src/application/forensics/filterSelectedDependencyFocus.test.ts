import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import {
  collectDependencyNeighborhood,
  filterSelectedDependencyFocusNodes,
} from './filterSelectedDependencyFocus';

function node(id: string): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      entityRef: id,
      properties: {},
    },
    type: 'blueprintNode',
  };
}

function edge(source: string, target: string): BlueprintRFEdge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    data: { type: 'direct-call', description: '' },
  };
}

describe('filterSelectedDependencyFocus', () => {
  // a → b → c ← orphan
  // a → d
  const nodes = [node('a'), node('b'), node('c'), node('d'), node('orphan')];
  const edges = [edge('a', 'b'), edge('b', 'c'), edge('a', 'd'), edge('orphan', 'c')];

  it('collects selected node plus transitive upstream and downstream neighbors', () => {
    const visible = collectDependencyNeighborhood('a', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('includes upstream dependents when selecting a mid-chain node', () => {
    const visible = collectDependencyNeighborhood('b', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c']);
    expect(visible.has('d')).toBe(false);
    expect(visible.has('orphan')).toBe(false);
  });

  it('includes all transitive upstream callers when selecting a leaf', () => {
    const visible = collectDependencyNeighborhood('c', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c', 'orphan']);
    expect(visible.has('d')).toBe(false);
  });

  it('does not include sibling-only branches via a shared upstream', () => {
    const visible = collectDependencyNeighborhood('b', nodes, edges);
    expect(visible.has('d')).toBe(false);
  });

  it('filters nodes when enabled; passes through when disabled or unselected', () => {
    expect(filterSelectedDependencyFocusNodes(nodes, edges, 'a', false)).toHaveLength(5);
    expect(filterSelectedDependencyFocusNodes(nodes, edges, null, true)).toHaveLength(5);

    const focused = filterSelectedDependencyFocusNodes(nodes, edges, 'a', true);
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps upstream callers when focusing a dependency target', () => {
    const focused = filterSelectedDependencyFocusNodes(nodes, edges, 'c', true);
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'orphan']);
  });
});

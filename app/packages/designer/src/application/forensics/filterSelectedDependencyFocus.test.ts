import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import {
  collectDownstreamDependencyClosure,
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
  const nodes = [node('a'), node('b'), node('c'), node('d'), node('orphan')];
  const edges = [edge('a', 'b'), edge('b', 'c'), edge('a', 'd'), edge('orphan', 'c')];

  it('collects selected node and all transitive downstream targets to leaves', () => {
    const visible = collectDownstreamDependencyClosure('a', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not include upstream-only dependents', () => {
    const visible = collectDownstreamDependencyClosure('b', nodes, edges);
    expect([...visible].sort()).toEqual(['b', 'c']);
    expect(visible.has('a')).toBe(false);
    expect(visible.has('orphan')).toBe(false);
  });

  it('filters nodes when enabled; passes through when disabled or unselected', () => {
    expect(filterSelectedDependencyFocusNodes(nodes, edges, 'a', false)).toHaveLength(5);
    expect(filterSelectedDependencyFocusNodes(nodes, edges, null, true)).toHaveLength(5);

    const focused = filterSelectedDependencyFocusNodes(nodes, edges, 'a', true);
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

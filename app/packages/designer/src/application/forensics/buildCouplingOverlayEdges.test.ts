import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import {
  applyCouplingHighlights,
  buildCouplingOverlayEdges,
  COUPLING_EDGE_PREFIX,
  filterCouplingFocusNodes,
} from './buildCouplingOverlayEdges';

function node(
  id: string,
  filepath?: string,
  coupledFiles: Array<{ path: string; score: number; sharedCommits: number }> = []
): BlueprintRFNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      properties: filepath ? { filepath } : {},
      entityRef: id,
      forensics: coupledFiles.length > 0 ? { coupledFiles } : undefined,
    },
  };
}

describe('buildCouplingOverlayEdges', () => {
  it('returns no edges when overlay is disabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
    ];
    expect(buildCouplingOverlayEdges('a', nodes, false)).toEqual([]);
  });

  it('builds labeled coupling edges when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
    ];
    const edges = buildCouplingOverlayEdges('a', nodes, true);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe(`${COUPLING_EDGE_PREFIX}a-b`);
    expect(edges[0]!.source).toBe('a');
    expect(edges[0]!.target).toBe('b');
    expect(edges[0]!.label).toBe('0.90');
    expect(edges[0]!.data?.coupling).toBe(true);
  });
});

describe('applyCouplingHighlights', () => {
  it('marks coupled peer nodes when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    const next = applyCouplingHighlights(nodes, 'a', true);
    expect(next.find(n => n.id === 'b')!.data.couplingHighlight).toBe(true);
    expect(next.find(n => n.id === 'c')!.data.couplingHighlight).toBeFalsy();
    expect(next.find(n => n.id === 'a')!.data.couplingHighlight).toBeFalsy();
  });

  it('clears highlights when disabled', () => {
    const nodes: BlueprintRFNode[] = [
      {
        ...node('b', 'src/b.ts'),
        data: { ...node('b', 'src/b.ts').data, couplingHighlight: true },
      },
    ];
    const next = applyCouplingHighlights(nodes, 'a', false);
    expect(next[0]!.data.couplingHighlight).toBe(false);
  });
});

describe('filterCouplingFocusNodes', () => {
  it('keeps only the selected node and coupled peers when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    const next = filterCouplingFocusNodes(nodes, 'a', true);
    expect(next.map(n => n.id).sort()).toEqual(['a', 'b']);
  });

  it('returns all nodes when disabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    expect(filterCouplingFocusNodes(nodes, 'a', false)).toHaveLength(3);
  });

  it('returns all nodes when there are no resolvable peers', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/missing.ts', score: 0.5, sharedCommits: 2 }]),
    ];
    expect(filterCouplingFocusNodes(nodes, 'a', true)).toHaveLength(1);
  });
});

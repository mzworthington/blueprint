import dagre from 'dagre';
import type { LayoutPort } from '../domain/ports.ts';
import type { SystemNode, SystemDependency } from '@blueprint/core';

/** Matches typical BlueprintNode card size in the designer (~256–300×120). */
const NODE_SIZE = { width: 280, height: 120 } as const;

/**
 * Grid pitch — tall cells leave room to scan between rows without edges
 * skimming through neighbouring cards.
 */
const GRID = { cellW: 360, cellH: 260, originX: 40, originY: 40 } as const;

/**
 * Dagre spacing — large `ranksep` is the main lever for readable TB flows:
 * more vertical room between layers means fewer overlapping edge segments.
 */
const DAGRE = {
  nodesep: 100,
  edgesep: 60,
  ranksep: 200,
  marginx: 48,
  marginy: 64,
} as const;

export class DagreLayoutAdapter implements LayoutPort {
  async computeLayout(
    nodes: SystemNode[],
    dependencies: SystemDependency[]
  ): Promise<SystemNode[]> {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map(n => n.entityRef));
    const edges = dependencies.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    // Sparse graphs → one overcrowded dagre rank. A grid stays scannable.
    if (shouldUseGrid(nodes.length, edges.length)) {
      return layoutAsGrid(nodes);
    }

    return layoutWithDagre(nodes, edges);
  }
}

/** Prefer a grid when connectivity is too low for a meaningful hierarchy. */
export function shouldUseGrid(nodeCount: number, edgeCount: number): boolean {
  if (nodeCount <= 1) return true;
  if (edgeCount === 0) return true;
  return edgeCount < nodeCount * 0.4;
}

/** Stable top-left grid; production nodes before test nodes. */
export function layoutAsGrid(nodes: SystemNode[]): SystemNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const testOrder = Number(!!a.isTest) - Number(!!b.isTest);
    if (testOrder !== 0) return testOrder;
    return a.entityRef.localeCompare(b.entityRef);
  });

  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));

  return sorted.map((node, index) => ({
    ...node,
    x: GRID.originX + (index % cols) * GRID.cellW,
    y: GRID.originY + Math.floor(index / cols) * GRID.cellH,
  }));
}

function layoutWithDagre(nodes: SystemNode[], edges: SystemDependency[]): SystemNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    align: 'UL',
    ranker: 'tight-tree',
    ...DAGRE,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ordered = [...nodes].sort((a, b) => a.entityRef.localeCompare(b.entityRef));
  for (const node of ordered) {
    g.setNode(node.entityRef, { width: NODE_SIZE.width, height: NODE_SIZE.height });
  }

  // Stable, de-duplicated edges
  const seen = new Set<string>();
  for (const edge of [...edges].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
  )) {
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  // Dagre returns centers; the designer uses top-left positions.
  return nodes.map(node => {
    const coords = g.node(node.entityRef);
    if (!coords) {
      return { ...node, x: GRID.originX, y: GRID.originY };
    }
    return {
      ...node,
      x: Math.round(coords.x - NODE_SIZE.width / 2),
      y: Math.round(coords.y - NODE_SIZE.height / 2),
    };
  });
}

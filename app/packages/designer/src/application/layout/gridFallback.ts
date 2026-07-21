import type { LayoutNodeInput, LayoutPosition } from '../../core';
import { GRID } from './constants';

/** Prefer a grid when connectivity is too low for a meaningful hierarchy. */
export function shouldUseGrid(nodeCount: number, edgeCount: number): boolean {
  if (nodeCount <= 1) return true;
  if (edgeCount === 0) return true;
  return edgeCount < nodeCount * 0.4;
}

/** Stable top-left grid keyed by node id. */
export function layoutAsGrid(nodes: LayoutNodeInput[]): Map<string, LayoutPosition> {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const cellW = Math.max(GRID.cellW, ...nodes.map(n => n.width + 80), GRID.cellW);
  const cellH = Math.max(GRID.cellH, ...nodes.map(n => n.height + 80), GRID.cellH);
  const positions = new Map<string, LayoutPosition>();

  sorted.forEach((node, index) => {
    positions.set(node.id, {
      x: GRID.originX + (index % cols) * cellW,
      y: GRID.originY + Math.floor(index / cols) * cellH,
    });
  });

  return positions;
}

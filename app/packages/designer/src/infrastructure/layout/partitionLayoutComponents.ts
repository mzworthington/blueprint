import type { LayoutEdgeInput, LayoutNodeInput, LayoutPosition } from '../../core';

export type LayoutComponent = {
  nodeIds: Set<string>;
};

/** Group nodes into connected components (undirected) for chunked layout. */
export function partitionLayoutComponents(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): LayoutComponent[] {
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    const root = parent.get(id) ?? id;
    if (root === id) {
      parent.set(id, id);
      return id;
    }
    const resolved = find(root);
    parent.set(id, resolved);
    return resolved;
  };

  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  for (const node of nodes) {
    find(node.id);
  }
  for (const edge of edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) {
      union(edge.source, edge.target);
    }
  }

  const groups = new Map<string, Set<string>>();
  for (const node of nodes) {
    const root = find(node.id);
    const group = groups.get(root) ?? new Set<string>();
    group.add(node.id);
    groups.set(root, group);
  }

  return [...groups.values()]
    .map(nodeIds => ({ nodeIds }))
    .sort((a, b) => [...a.nodeIds].sort()[0]!.localeCompare([...b.nodeIds].sort()[0]!));
}

export function layoutBounds(
  positions: Map<string, LayoutPosition>,
  nodes: LayoutNodeInput[]
): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const byId = new Map(nodes.map(node => [node.id, node]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [id, pos] of positions) {
    const node = byId.get(id);
    if (!node) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Lay out large graphs component-by-component so the UI can breathe between chunks. */
export const LAYOUT_CHUNK_NODE_THRESHOLD = 80;
export const LAYOUT_COMPONENT_GAP = 120;

export async function layoutInChunks(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[],
  layoutChunk: (
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ) => Promise<Map<string, LayoutPosition>>,
  yieldBetweenChunks: () => Promise<void> = async () => {}
): Promise<Map<string, LayoutPosition>> {
  if (nodes.length <= LAYOUT_CHUNK_NODE_THRESHOLD) {
    return layoutChunk(nodes, edges);
  }

  const components = partitionLayoutComponents(nodes, edges);
  if (components.length <= 1) {
    return layoutChunk(nodes, edges);
  }

  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const merged = new Map<string, LayoutPosition>();
  let offsetX = 0;

  for (const component of components) {
    const componentNodes = [...component.nodeIds]
      .map(id => nodesById.get(id))
      .filter((node): node is LayoutNodeInput => node !== undefined);
    const componentEdges = edges.filter(
      edge => component.nodeIds.has(edge.source) && component.nodeIds.has(edge.target)
    );

    const positions = await layoutChunk(componentNodes, componentEdges);
    const bounds = layoutBounds(positions, componentNodes);

    for (const [id, pos] of positions) {
      merged.set(id, {
        x: pos.x - bounds.minX + offsetX,
        y: pos.y - bounds.minY,
      });
    }

    offsetX += bounds.width + LAYOUT_COMPONENT_GAP;
    await yieldBetweenChunks();
  }

  return merged;
}

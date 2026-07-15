import type {
  LayoutEdgeInput,
  LayoutEngineId,
  LayoutNodeInput,
  LayoutPosition,
  LayoutRegistryPort,
} from '../../core';
import { NODE_SIZE } from './constants';
import { layoutAsGrid, shouldUseGrid } from './gridFallback';

export type ClientLayoutNode = {
  id: string;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

export type ClientLayoutEdge = {
  id: string;
  source: string;
  target: string;
};

/**
 * Application use-case: normalize sizes, apply sparse-graph grid policy, then
 * delegate to the selected layout engine port. No library imports.
 */
export async function computeClientLayout(
  engine: LayoutEngineId,
  nodes: ClientLayoutNode[],
  edges: ClientLayoutEdge[],
  registry: LayoutRegistryPort
): Promise<Map<string, LayoutPosition>> {
  const layoutNodes: LayoutNodeInput[] = nodes.map(n => ({
    id: n.id,
    width: n.measured?.width ?? n.width ?? NODE_SIZE.width,
    height: n.measured?.height ?? n.height ?? NODE_SIZE.height,
  }));

  const layoutEdges: LayoutEdgeInput[] = edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  const nodeIds = new Set(layoutNodes.map(n => n.id));
  const usableEdges = layoutEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (shouldUseGrid(layoutNodes.length, usableEdges.length)) {
    return layoutAsGrid(layoutNodes);
  }

  const port = registry.get(engine);
  if (!port) {
    return layoutAsGrid(layoutNodes);
  }

  return port.computeLayout(layoutNodes, usableEdges);
}

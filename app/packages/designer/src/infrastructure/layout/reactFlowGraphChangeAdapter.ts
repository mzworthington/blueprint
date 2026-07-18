import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react';
import type { GraphChangePort, CanvasNodeChange, CanvasEdgeChange } from '../../core';

/**
 * React Flow adapter for applying canvas change lists.
 * Application code depends on GraphChangePort only.
 */
export const reactFlowGraphChangeAdapter: GraphChangePort = {
  applyNodeChanges<TNode>(changes: CanvasNodeChange[], nodes: TNode[]): TNode[] {
    return applyNodeChanges(changes as NodeChange[], nodes as Node[]) as TNode[];
  },
  applyEdgeChanges<TEdge>(changes: CanvasEdgeChange[], edges: TEdge[]): TEdge[] {
    return applyEdgeChanges(changes as EdgeChange[], edges as Edge[]) as TEdge[];
  },
};

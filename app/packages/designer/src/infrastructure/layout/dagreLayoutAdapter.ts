import type {
  LayoutEdgeInput,
  LayoutEnginePort,
  LayoutNodeInput,
  LayoutPosition,
} from '../../core';
import { computeDagrePositions } from './dagreLayoutCore';
import { computeDagrePositionsOffThread, DAGRE_WORKER_NODE_THRESHOLD } from './dagreWorkerClient';
import { layoutInChunks } from './partitionLayoutComponents';
import { yieldToUi } from '../../application/store/yieldToUi';

/**
 * Dagre-backed layout adapter. Positions are top-left (React Flow), not centers.
 * Large graphs run in a Web Worker; very large graphs are split by connected component.
 */
export class DagreLayoutAdapter implements LayoutEnginePort {
  async computeLayout(
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ): Promise<Map<string, LayoutPosition>> {
    return layoutInChunks(
      nodes,
      edges,
      (chunkNodes, chunkEdges) => this.layoutChunk(chunkNodes, chunkEdges),
      () => yieldToUi()
    );
  }

  private async layoutChunk(
    nodes: LayoutNodeInput[],
    edges: LayoutEdgeInput[]
  ): Promise<Map<string, LayoutPosition>> {
    if (nodes.length >= DAGRE_WORKER_NODE_THRESHOLD) {
      return computeDagrePositionsOffThread(nodes, edges);
    }
    return computeDagrePositions(nodes, edges);
  }
}

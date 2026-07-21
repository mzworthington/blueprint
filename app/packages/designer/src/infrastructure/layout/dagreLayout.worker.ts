import type { LayoutEdgeInput, LayoutNodeInput, LayoutPosition } from '../../core';
import { computeDagrePositions } from './dagreLayoutCore';

export type DagreWorkerRequest = {
  requestId: number;
  nodes: LayoutNodeInput[];
  edges: LayoutEdgeInput[];
};

export type DagreWorkerResponse = {
  requestId: number;
  positions: Array<[string, LayoutPosition]>;
};

self.onmessage = (event: MessageEvent<DagreWorkerRequest>) => {
  const { requestId, nodes, edges } = event.data;
  const positions = computeDagrePositions(nodes, edges);
  const response: DagreWorkerResponse = {
    requestId,
    positions: Array.from(positions.entries()),
  };
  self.postMessage(response);
};

import type { LayoutEdgeInput, LayoutNodeInput, LayoutPosition } from '../../core';
import { computeDagrePositions } from './dagreLayoutCore';
import type { DagreWorkerRequest, DagreWorkerResponse } from './dagreLayout.worker';

/** Run dagre off-thread when Workers are available. */
export const DAGRE_WORKER_NODE_THRESHOLD = 24;

const WORKER_TIMEOUT_MS = 30_000;

type PendingRequest = {
  resolve: (positions: Map<string, LayoutPosition>) => void;
  reject: (error: Error) => void;
};

let worker: Worker | undefined;
let nextRequestId = 0;
const pending = new Map<number, PendingRequest>();

function ensureWorker(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined;
  if (worker) return worker;

  worker = new Worker(new URL('./dagreLayout.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<DagreWorkerResponse>) => {
    const { requestId, positions } = event.data;
    const entry = pending.get(requestId);
    if (!entry) return;
    pending.delete(requestId);
    entry.resolve(new Map(positions));
  };
  worker.onerror = event => {
    for (const entry of pending.values()) {
      entry.reject(new Error(event.message || 'Dagre layout worker failed'));
    }
    pending.clear();
    worker?.terminate();
    worker = undefined;
  };
  return worker;
}

export function resetDagreWorkerForTests(): void {
  worker?.terminate();
  worker = undefined;
  pending.clear();
  nextRequestId = 0;
}

function runOnWorker(
  activeWorker: Worker,
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Promise<Map<string, LayoutPosition>> {
  const requestId = ++nextRequestId;
  const request: DagreWorkerRequest = { requestId, nodes, edges };

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    activeWorker.postMessage(request);
  });
}

export async function computeDagrePositionsOffThread(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Promise<Map<string, LayoutPosition>> {
  const activeWorker = ensureWorker();
  if (!activeWorker) {
    return computeDagrePositions(nodes, edges);
  }

  try {
    const layoutPromise = runOnWorker(activeWorker, nodes, edges);
    const timeoutPromise = new Promise<never>((_, reject) => {
      globalThis.setTimeout(() => reject(new Error('Dagre worker timed out')), WORKER_TIMEOUT_MS);
    });
    return await Promise.race([layoutPromise, timeoutPromise]);
  } catch {
    return computeDagrePositions(nodes, edges);
  }
}

import type { LayoutEdgeInput, LayoutEnginePort, LayoutNodeInput } from '../../core';

/**
 * Defers loading a concrete layout adapter until the first layout request.
 * Keeps heavy deps (elkjs, dagre, d3-hierarchy) out of the initial bundle.
 */
export function lazyLayoutEngine(load: () => Promise<LayoutEnginePort>): LayoutEnginePort {
  let port: LayoutEnginePort | undefined;
  let loading: Promise<LayoutEnginePort> | undefined;

  return {
    async computeLayout(nodes: LayoutNodeInput[], edges: LayoutEdgeInput[]) {
      if (!port) {
        loading ??= load();
        port = await loading;
      }
      return port.computeLayout(nodes, edges);
    },
  };
}

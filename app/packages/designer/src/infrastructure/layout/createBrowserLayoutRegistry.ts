import type { LayoutEngineId, LayoutEnginePort, LayoutRegistryPort } from '../../core';
import { lazyLayoutEngine } from './lazyLayoutEngine';

function defaultEngines(): Partial<Record<LayoutEngineId, LayoutEnginePort>> {
  return {
    dagre: lazyLayoutEngine(async () => {
      const { DagreLayoutAdapter } = await import('./dagreLayoutAdapter');
      return new DagreLayoutAdapter();
    }),
    elk: lazyLayoutEngine(async () => {
      const { ElkLayoutAdapter } = await import('./elkLayoutAdapter');
      return new ElkLayoutAdapter();
    }),
    'd3-hierarchy': lazyLayoutEngine(async () => {
      const { D3HierarchyLayoutAdapter } = await import('./d3HierarchyLayoutAdapter');
      return new D3HierarchyLayoutAdapter();
    }),
  };
}

/** Composition helper: concrete layout engines for the designer UI (lazy-loaded). */
export function createBrowserLayoutRegistry(
  engines: Partial<Record<LayoutEngineId, LayoutEnginePort>> = defaultEngines()
): LayoutRegistryPort {
  return {
    get: engine => engines[engine],
  };
}

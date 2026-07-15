import type { LayoutEngineId, LayoutEnginePort, LayoutRegistryPort } from '../../core';
import { D3HierarchyLayoutAdapter } from './d3HierarchyLayoutAdapter';
import { DagreLayoutAdapter } from './dagreLayoutAdapter';
import { ElkLayoutAdapter } from './elkLayoutAdapter';

/** Composition helper: concrete layout engines for the designer UI. */
export function createBrowserLayoutRegistry(
  engines: Partial<Record<LayoutEngineId, LayoutEnginePort>> = {
    dagre: new DagreLayoutAdapter(),
    elk: new ElkLayoutAdapter(),
    'd3-hierarchy': new D3HierarchyLayoutAdapter(),
  }
): LayoutRegistryPort {
  return {
    get: engine => engines[engine],
  };
}

import type { SystemSchema } from '@blueprint/core';
import { shouldAutoLayoutOnLoad } from './layoutUtils';
import { hasSessionLayout, schemaLayoutFingerprint } from './sessionLayoutCache';

export const DIAGRAM_LOADING_MESSAGE = 'Loading diagram...';
export const DIAGRAM_LAYOUT_MESSAGE = 'Arranging diagram...';
export const SANDBOX_LOADING_MESSAGE = 'Loading sandbox...';

/** Sentinel value for systemSelectInFlight during full sandbox reload. */
export const SANDBOX_RELOAD_IN_FLIGHT = '__sandbox_reload__';

export type DiagramLoadStoreSlice = {
  diagramLoadCount: number;
  isLoading: boolean | string;
};

export function beginDiagramLoad(
  get: () => DiagramLoadStoreSlice,
  set: (partial: Partial<DiagramLoadStoreSlice>) => void,
  message: string
): void {
  set({
    diagramLoadCount: get().diagramLoadCount + 1,
    isLoading: message,
  });
}

export function endDiagramLoad(
  get: () => DiagramLoadStoreSlice,
  set: (partial: Partial<DiagramLoadStoreSlice>) => void
): void {
  const next = Math.max(0, get().diagramLoadCount - 1);
  set({
    diagramLoadCount: next,
    ...(next === 0 ? { isLoading: false } : {}),
  });
}

export function diagramWillAutoLayout(
  schema: SystemSchema,
  filePath: string | null | undefined
): boolean {
  if (!filePath || schema.nodes.length === 0) return false;
  return (
    shouldAutoLayoutOnLoad(schema) && !hasSessionLayout(filePath, schemaLayoutFingerprint(schema))
  );
}

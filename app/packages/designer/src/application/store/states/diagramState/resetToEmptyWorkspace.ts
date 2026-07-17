import type { SystemSchema } from '@blueprint/core';
import { cancelDefaultIdbSeed } from './defaultIdbSeed';

export const EMPTY_WORKSPACE_SCHEMA: SystemSchema = {
  name: 'Empty Workspace',
  version: '1.0.0',
  level: 'container',
  nodes: [],
  dependencies: [],
};

export const EMPTY_WORKSPACE_PATH = 'blueprint.yaml';

/**
 * Replace the active diagram with a blank canvas (no sandbox systems).
 * Used when starting from Mermaid import so merge is not against bundled demos.
 */
export function resetToEmptyWorkspace(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    initSchema: (schema: SystemSchema) => void;
    clearHistory: () => void;
  }
): void {
  cancelDefaultIdbSeed();
  get().clearHistory();

  const empty = { ...EMPTY_WORKSPACE_SCHEMA, nodes: [], dependencies: [] };

  set({
    currentFilePath: EMPTY_WORKSPACE_PATH,
    loadedSystems: [{ path: EMPTY_WORKSPACE_PATH, name: empty.name, schema: empty }],
    isWorkspaceOpen: false,
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
  });

  get().initSchema(empty);
}

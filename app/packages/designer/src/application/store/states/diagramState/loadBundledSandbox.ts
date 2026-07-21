import { resolveWorkspaceEntityRefs, type SystemSchema } from '@blueprint/core';
import { buildBundledPathCatalog, startBundledBlueprintPrefetch } from './bundledBlueprintLoader';
import { blueprintPaths, defaultLoadedSystems } from '../../defaultData';
import { clearSandboxCaches } from '../../clearSandboxCaches';
import type { HydrateSystem } from './hydrateSandboxDrafts';

export function resolveBundledSandboxSystems(): HydrateSystem[] {
  return defaultLoadedSystems;
}

export function pickSandboxEntryDiagram(systems: HydrateSystem[]): HydrateSystem | undefined {
  return (
    systems.find(s => s.schema.level === 'context') ||
    systems.find(s => s.schema.level === 'container') ||
    systems[0]
  );
}

type ActivateBundledSandboxGet = () => {
  isWorkspaceOpen: boolean;
  initSchema: (schema: SystemSchema) => void;
  clearHistory: () => void;
  loadedSystems: HydrateSystem[];
  workspaceName: string;
  workingCopyPort?: {
    pathHasStoredData: (filePath: string) => Promise<boolean>;
    saveBaselineSchema: (args: {
      filePath: string;
      schema: SystemSchema;
      systemId: string;
      nodeRefMap: Record<string, string>;
    }) => Promise<void>;
    saveWorkingSchema: (args: {
      filePath: string;
      schema: SystemSchema;
      systemId: string;
      nodeRefMap: Record<string, string>;
    }) => Promise<void>;
  };
};

type ActivateBundledSandboxSet = (partial: Record<string, unknown>) => void;

/**
 * Load the bundled demo blueprints into the store (sandbox mode).
 * Replaces any prior empty/import canvas state with the full bundled tree.
 */
export function activateBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  systems: HydrateSystem[] = resolveBundledSandboxSystems()
): void {
  if (get().isWorkspaceOpen || systems.length === 0) return;

  const resolved = resolveWorkspaceEntityRefs(
    systems.map(sys => ({ path: sys.path, schema: sys.schema }))
  );
  const systemsWithResolved = systems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));
  const entry = pickSandboxEntryDiagram(systemsWithResolved);
  if (!entry) return;

  const workspaceCatalog = buildBundledPathCatalog(blueprintPaths);

  set({
    isWorkspaceOpen: false,
    workspaceName: '',
    workspaceCatalog,
    loadedSystems: systemsWithResolved,
    nodeRefMap: resolved.nodeRefMap,
    currentFilePath: entry.path,
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
    layoutCustomized: false,
    hasPendingChanges: false,
  });

  get().initSchema(entry.schema);
}

/**
 * Reset caches and reload the bundled sandbox from disk defaults (no IDB drafts).
 */
export async function reloadBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet
): Promise<void> {
  if (get().isWorkspaceOpen) return;

  await clearSandboxCaches();
  get().clearHistory();
  activateBundledSandbox(set, get, resolveBundledSandboxSystems());
  startBundledBlueprintPrefetch({ get, set });
}

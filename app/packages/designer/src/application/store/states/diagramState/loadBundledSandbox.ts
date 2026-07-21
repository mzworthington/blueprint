import {
  buildWorkspaceCatalog,
  resolveWorkspaceEntityRefs,
  type SystemSchema,
} from '@blueprint/core';
import { defaultLoadedSystems, defaultInitialSchema } from '../../defaultData';
import type { HydrateSystem } from './hydrateSandboxDrafts';

export function resolveBundledSandboxSystems(): HydrateSystem[] {
  const source =
    defaultLoadedSystems.length > 0
      ? defaultLoadedSystems
      : [{ path: 'blueprint.yaml', name: defaultInitialSchema.name, schema: defaultInitialSchema }];

  const resolved = resolveWorkspaceEntityRefs(source);
  return source.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));
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
};

/**
 * Load the bundled demo blueprints into the store (sandbox mode).
 * Replaces any prior empty/import canvas state with the full bundled tree.
 */
export function activateBundledSandbox(
  set: (partial: Record<string, unknown>) => void,
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

  const workspaceCatalog = buildWorkspaceCatalog(
    systemsWithResolved.map(sys => ({ path: sys.path, schema: sys.schema }))
  );

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
  });

  get().initSchema(entry.schema);
}

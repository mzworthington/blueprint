import { resolveEntityHome, type WorkspaceCatalogEntry } from '@blueprint/core';

export type NavigateToWorkspaceEntityActions = {
  workspaceCatalog: WorkspaceCatalogEntry[];
  currentFilePath: string;
  setLocation: (path: string) => void;
  selectSystem: (path: string) => Promise<void>;
  selectNode: (id: string | null) => void;
};

/**
 * Navigate to `/workspace/<entityRef>`, loading the owning diagram when needed.
 * Returns false when the ref is not present in the loaded workspace catalog.
 */
export async function navigateToWorkspaceEntity(
  entityRef: string,
  actions: NavigateToWorkspaceEntityActions
): Promise<boolean> {
  const home = resolveEntityHome(actions.workspaceCatalog, entityRef);
  if (!home) return false;

  if (actions.currentFilePath !== home.path) {
    await actions.selectSystem(home.path);
  }
  if (home.entityRef !== entityRef) {
    actions.selectNode(entityRef);
  }
  actions.setLocation(`/workspace/${entityRef}`);
  return true;
}

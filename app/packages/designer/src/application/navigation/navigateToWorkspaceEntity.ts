import { resolveEntityHome, type WorkspaceCatalogEntry } from '@blueprint/core';

export type NavigateToWorkspaceEntityActions = {
  workspaceCatalog: WorkspaceCatalogEntry[];
  setLocation: (path: string) => void;
};

/**
 * Navigate to `/workspace/<entityRef>`. Diagram load and node selection are handled
 * by `useUrlSync` from the URL alone so store updates do not race the router.
 * Returns false when the ref is not present in the loaded workspace catalog.
 */
export function navigateToWorkspaceEntity(
  entityRef: string,
  actions: NavigateToWorkspaceEntityActions
): boolean {
  const home = resolveEntityHome(actions.workspaceCatalog, entityRef);
  if (!home) return false;

  actions.setLocation(`/workspace/${entityRef}`);
  return true;
}

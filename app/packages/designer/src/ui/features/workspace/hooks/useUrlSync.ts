import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { guessBundledPathForEntityRef } from '../../../../application/store/states/diagramState/bundledBlueprintLoader';
import { SANDBOX_RELOAD_IN_FLIGHT } from '../../../../application/store/diagramLoadSession';
import { getSchemaEntityRef, resolveEntityHome } from '@blueprint/core';

/**
 * Synchronises the browser URL with the active diagram.
 *
 * Responsibilities:
 *  - Reads the URL slug (entityRef) and selects the matching diagram system.
 *  - Node-level URLs (`/workspace/<node-entityRef>`) load the owning diagram and select the node.
 *  - Canvas / panel selection updates the URL without fighting the current deep link.
 *  - On store changes (active diagram switched), pushes the new path to URL.
 *  - Handles root paths by selecting the highest-level diagram (usually context).
 *  - Leaves bare `/workspace` alone while the startup chooser is open.
 */
export function useUrlSync(): void {
  const {
    schema,
    loadedSystems,
    selectSystem,
    selectNode,
    selectedNodeId,
    currentFilePath,
    workspaceName,
    workspaceCatalog,
    isWorkspaceOpen,
    isStartupOpen,
  } = useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/*');

  const prevLocationRef = useRef<string | null>(null);
  const prevSelectedNodeIdRef = useRef<string | null | undefined>(undefined);
  const systemSelectInFlight = useBlueprintStore(s => s.systemSelectInFlight);
  const diagramLoadCount = useBlueprintStore(s => s.diagramLoadCount);

  useEffect(() => {
    const isWorkspaceRoute =
      location.startsWith('/workspace') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    if (diagramLoadCount > 0 || systemSelectInFlight === SANDBOX_RELOAD_IN_FLIGHT) return;

    const locationChanged = prevLocationRef.current !== location;
    const selectionChanged = prevSelectedNodeIdRef.current !== selectedNodeId;
    const isInitialSync = prevLocationRef.current === null;
    prevLocationRef.current = location;
    prevSelectedNodeIdRef.current = selectedNodeId;

    const entityRef = params?.['*']?.replace(/\/$/, '');
    const isWorkspaceRoot = location === '/workspace' || location === '/workspace/';

    // Keep bare /workspace stable until the user picks sandbox / folder / Mermaid.
    if (isWorkspaceRoot && isStartupOpen) return;

    const diagramEntityRef = getSchemaEntityRef(
      schema,
      isWorkspaceOpen ? workspaceName : undefined
    );

    // User changed selection on the canvas or property panel — reflect it in the URL.
    if (selectionChanged && !locationChanged && !isInitialSync) {
      const targetPath = selectedNodeId
        ? `/workspace/${selectedNodeId}`
        : `/workspace/${diagramEntityRef}`;
      if (location !== targetPath) {
        setLocation(targetPath, { replace: true });
      }
      return;
    }

    if (!locationChanged && !isInitialSync) return;

    const home = entityRef ? resolveEntityHome(workspaceCatalog, entityRef) : undefined;
    const isNodeTarget = !!(home && entityRef && home.entityRef !== entityRef);

    if (isNodeTarget && home && home.path === currentFilePath) {
      selectNode(entityRef);
      return;
    }

    let foundSystem: (typeof loadedSystems)[0] | undefined;

    if (!entityRef) {
      foundSystem = loadedSystems[0];
    } else {
      foundSystem = loadedSystems.find(sys => {
        const dRef = getSchemaEntityRef(sys.schema, isWorkspaceOpen ? workspaceName : undefined);
        return dRef === entityRef;
      });
    }

    if (!foundSystem && entityRef) {
      const catalogEntry = workspaceCatalog.find(entry => entry.entityRef === entityRef);
      const path = home?.path ?? catalogEntry?.path ?? guessBundledPathForEntityRef(entityRef);
      if (path) {
        if (systemSelectInFlight !== path) {
          void selectSystem(path).then(() => {
            if (isNodeTarget && entityRef) selectNode(entityRef);
          });
        } else if (isNodeTarget && entityRef) {
          selectNode(entityRef);
        }
        return;
      }
    }

    if (foundSystem) {
      if (foundSystem.path !== currentFilePath) {
        if (systemSelectInFlight !== foundSystem.path) {
          void selectSystem(foundSystem.path).then(() => {
            if (isNodeTarget && entityRef) selectNode(entityRef);
          });
        }
        return;
      }

      if (isNodeTarget && entityRef) {
        selectNode(entityRef);
        return;
      }

      const diagramPath = `/workspace/${diagramEntityRef}`;
      if (location !== diagramPath) {
        setLocation(diagramPath, { replace: true });
      }
    }
  }, [
    location,
    schema,
    currentFilePath,
    workspaceName,
    loadedSystems,
    workspaceCatalog,
    selectSystem,
    selectNode,
    selectedNodeId,
    setLocation,
    match,
    params,
    isWorkspaceOpen,
    isStartupOpen,
    systemSelectInFlight,
    diagramLoadCount,
  ]);
}

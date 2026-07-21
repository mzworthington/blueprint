import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { guessBundledPathForEntityRef } from '../../../../application/store/states/diagramState/bundledBlueprintLoader';
import { SANDBOX_RELOAD_IN_FLIGHT } from '../../../../application/store/diagramLoadSession';
import { getSchemaEntityRef } from '@blueprint/core';

/**
 * Synchronises the browser URL with the active diagram.
 *
 * Responsibilities:
 *  - Reads the URL slug (entityRef) and selects the matching diagram system.
 *  - On store changes (active diagram switched), pushes the new path to URL.
 *  - Handles root paths by selecting the highest-level diagram (usually context).
 *  - Leaves bare `/workspace` alone while the startup chooser is open.
 */
export function useUrlSync(): void {
  const {
    schema,
    loadedSystems,
    selectSystem,
    currentFilePath,
    workspaceName,
    workspaceCatalog,
    isWorkspaceOpen,
    isStartupOpen,
  } = useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/*');

  const lastSyncedLocationRef = useRef<string | null>(null);
  const systemSelectInFlight = useBlueprintStore(s => s.systemSelectInFlight);
  const diagramLoadCount = useBlueprintStore(s => s.diagramLoadCount);

  useEffect(() => {
    const isWorkspaceRoute =
      location.startsWith('/workspace') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    if (diagramLoadCount > 0 || systemSelectInFlight === SANDBOX_RELOAD_IN_FLIGHT) return;

    const entityRef = params?.['*']?.replace(/\/$/, '');
    const isWorkspaceRoot = location === '/workspace' || location === '/workspace/';

    // Keep bare /workspace stable until the user picks sandbox / folder / Mermaid.
    if (isWorkspaceRoot && isStartupOpen) return;

    let foundSystem: (typeof loadedSystems)[0] | undefined;

    if (!entityRef) {
      foundSystem = loadedSystems[0];
    } else {
      foundSystem = loadedSystems.find(sys => {
        const dRef = getSchemaEntityRef(sys.schema, isWorkspaceOpen ? workspaceName : undefined);
        return dRef === entityRef;
      });

      if (!foundSystem) {
        const catalogEntry = workspaceCatalog.find(entry => entry.entityRef === entityRef);
        const path = catalogEntry?.path ?? guessBundledPathForEntityRef(entityRef);
        if (path) {
          if (systemSelectInFlight !== path) {
            void selectSystem(path);
          }
          lastSyncedLocationRef.current = location;
          return;
        }
      }
    }

    if (foundSystem) {
      if (foundSystem.path !== currentFilePath) {
        if (systemSelectInFlight !== foundSystem.path) {
          void selectSystem(foundSystem.path);
        }
        lastSyncedLocationRef.current = location;
        return;
      }

      const currentEntityRef = getSchemaEntityRef(
        schema,
        isWorkspaceOpen ? workspaceName : undefined
      );
      const expectedPath = `/workspace/${currentEntityRef}`;
      if (location !== expectedPath) {
        setLocation(expectedPath, { replace: true });
        lastSyncedLocationRef.current = expectedPath;
      } else {
        lastSyncedLocationRef.current = location;
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
    setLocation,
    match,
    params,
    isWorkspaceOpen,
    isStartupOpen,
    systemSelectInFlight,
    diagramLoadCount,
  ]);
}

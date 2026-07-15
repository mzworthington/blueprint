import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { getSchemaEntityRef } from '@blueprint/core';

/**
 * Synchronises the browser URL with the active diagram.
 *
 * Responsibilities:
 *  - Reads the URL slug (entityRef) and selects the matching diagram system.
 *  - On store changes (active diagram switched), pushes the new path to URL.
 *  - Handles root paths by selecting the highest-level diagram (usually context).
 */
export function useUrlSync(): void {
  const { schema, loadedSystems, selectSystem, currentFilePath, workspaceName, isWorkspaceOpen } =
    useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/*');

  const lastSyncedLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const isWorkspaceRoute =
      location.startsWith('/workspace') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    const entityRef = params?.['*']?.replace(/\/$/, '');

    let foundSystem: (typeof loadedSystems)[0] | undefined;

    if (!entityRef) {
      foundSystem = loadedSystems[0];
    } else {
      foundSystem = loadedSystems.find(sys => {
        const dRef = getSchemaEntityRef(sys.schema, isWorkspaceOpen ? workspaceName : undefined);
        return dRef === entityRef;
      });
    }

    if (foundSystem) {
      if (foundSystem.path !== currentFilePath) {
        selectSystem(foundSystem.path);
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
    selectSystem,
    setLocation,
    match,
    params,
    isWorkspaceOpen,
  ]);
}

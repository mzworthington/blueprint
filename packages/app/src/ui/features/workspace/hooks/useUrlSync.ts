import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { slugify, getSchemaEntityRef } from '@blueprint/core';

/**
 * Synchronises the browser URL with the active diagram and selected node.
 *
 * Responsibilities:
 *  - On first mount, reads the URL slug and selects the matching system/node.
 *  - On store changes (diagram switched, node selected), pushes the new path.
 *  - On URL changes (back/forward), selects the matching system/node in the store.
 */
export function useUrlSync(): void {
  const {
    schema,
    loadedSystems,
    selectSystem,
    currentFilePath,
    selectedNodeId,
    selectNode,
    workspaceName,
  } = useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/*');

  const lastSyncedLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const isWorkspaceRoute =
      location.startsWith('/workspace') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    const entityRef = params?.['*'];
    const isRootPath =
      location === '/' ||
      location === '' ||
      location === '/workspace' ||
      location === '/workspace/';
    if (!isRootPath && (!match || !entityRef)) return;

    const diagramEntityRef = getSchemaEntityRef(schema, currentFilePath, workspaceName);
    if (!diagramEntityRef) return;

    const isDiagramPath = loadedSystems.some(sys => {
      const dRef = getSchemaEntityRef(sys.schema, sys.path, workspaceName);
      return dRef === entityRef;
    });

    const isNodePath =
      !isDiagramPath &&
      loadedSystems.some(sys => sys.schema?.nodes.some(n => n.entityRef === entityRef));

    const isFirstSync = lastSyncedLocationRef.current === null;
    const isUrlChanged = !isFirstSync && location !== lastSyncedLocationRef.current;
    const shouldSyncFromUrl = (!isFirstSync && isUrlChanged) || (isFirstSync && isNodePath);

    if (shouldSyncFromUrl) {
      let foundSystem: (typeof loadedSystems)[0] | undefined;
      let targetNodeId: string | null = null;

      for (const sys of loadedSystems) {
        const node = sys.schema?.nodes.find(n => n.entityRef === entityRef);
        if (node) {
          foundSystem = sys;
          targetNodeId = node.id;
          break;
        }
      }

      if (!foundSystem) {
        foundSystem = loadedSystems.find(sys => {
          const dRef = getSchemaEntityRef(sys.schema, sys.path, workspaceName);
          return dRef === entityRef;
        });
      }

      if (!foundSystem) {
        foundSystem = loadedSystems.find(sys => {
          const legacySlug = slugify(sys.schema?.name || sys.name || sys.path);
          return legacySlug === entityRef;
        });
      }

      if (foundSystem) {
        if (foundSystem.path !== currentFilePath) {
          selectSystem(foundSystem.path);
        }
        if (targetNodeId !== null) {
          if (selectedNodeId !== targetNodeId) {
            selectNode(targetNodeId);
          }
        } else {
          if (selectedNodeId !== null) {
            selectNode(null);
          }
        }
      }

      lastSyncedLocationRef.current = location;
    } else {
      if (isFirstSync && entityRef) {
        let foundSystem = loadedSystems.find(sys => {
          const dRef = getSchemaEntityRef(sys.schema, sys.path, workspaceName);
          return dRef === entityRef;
        });
        if (!foundSystem) {
          foundSystem = loadedSystems.find(sys => {
            const legacySlug = slugify(sys.schema?.name || sys.name || sys.path);
            return legacySlug === entityRef;
          });
        }
        if (foundSystem && foundSystem.path !== currentFilePath) {
          selectSystem(foundSystem.path);
          return;
        }
      }

      const selectedNode = schema.nodes.find(n => n.id === selectedNodeId);
      const activeEntityRef =
        selectedNode && selectedNode.entityRef ? selectedNode.entityRef : diagramEntityRef;
      const expectedPath = `/workspace/${activeEntityRef}`;

      if (location !== expectedPath) {
        const isInitial =
          location === '/' ||
          location === '' ||
          location === '/workspace' ||
          location === '/workspace/';
        setLocation(expectedPath, { replace: isInitial });
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
    selectedNodeId,
    loadedSystems,
    selectSystem,
    selectNode,
    setLocation,
    match,
    params,
  ]);
}

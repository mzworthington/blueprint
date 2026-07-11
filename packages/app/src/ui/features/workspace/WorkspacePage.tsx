import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { CodeViewer } from '../../components/CodeViewer';
import { Canvas } from '../../components/Canvas';
import { PropertyPanel } from '../../components/PropertyPanel';
import { Header } from '../../components/Header';
import { useBlueprintStore } from '../../../application/store/store';
import { slugify, getSchemaEntityRef } from '@blueprint/core';
import { DiffMenu } from '../../components/DiffMenu';

export const WorkspacePage: React.FC = () => {
  const {
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed,
    workspaceName,
    schema,
    loadedSystems,
    selectSystem,
    currentFilePath,
    selectedNodeId,
    selectNode,
    isDiffOpen,
    setIsDiffOpen,
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

    // Check if the current URL path represents a diagram
    const isDiagramPath = loadedSystems.some(sys => {
      const dRef = getSchemaEntityRef(sys.schema, sys.path, workspaceName);
      return dRef === entityRef;
    });

    // Check if the current URL path represents a node in any loaded system schema
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

      // Check if URL matches a system FQN
      if (!foundSystem) {
        foundSystem = loadedSystems.find(sys => {
          const dRef = getSchemaEntityRef(sys.schema, sys.path, workspaceName);
          return dRef === entityRef;
        });
      }

      // Try legacy slug fallback
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

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-600/30">
        <Header />
        <div className="flex-1 flex overflow-hidden relative">
          <CodeViewer />
          <Canvas />
          <PropertyPanel />

          <button
            onClick={toggleLeftCollapsed}
            className={`absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-r-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-l-0 ${
              leftCollapsed ? 'flex' : 'hidden sm:flex'
            }`}
            style={{ left: leftCollapsed ? '0px' : 'calc(min(384px, 100vw - 40px))' }}
            aria-label="Toggle Left Panel"
            title={leftCollapsed ? 'Expand Schema Explorer' : 'Collapse Schema Explorer'}
          >
            {leftCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={toggleRightCollapsed}
            className={`absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-l-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-r-0 ${
              rightCollapsed ? 'flex' : 'hidden sm:flex'
            }`}
            style={{ right: rightCollapsed ? '0px' : 'calc(min(320px, 100vw - 40px))' }}
            aria-label="Toggle Right Panel"
            title={rightCollapsed ? 'Expand Properties Panel' : 'Collapse Properties Panel'}
          >
            {rightCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <DiffMenu isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
    </ReactFlowProvider>
  );
};

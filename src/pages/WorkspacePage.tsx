import React, { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { CodeViewer } from '../components/CodeViewer';
import { Canvas } from '../components/Canvas';
import { PropertyPanel } from '../components/PropertyPanel';
import { Header } from '../components/Header';
import { useBlueprintStore } from '../store/store';
import { slugify } from '../domain/slug';

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
  } = useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/:slug');

  // Track the previous system file path to detect store-initiated changes
  const prevFilePathRef = useRef(currentFilePath);
  const storeChanged = currentFilePath !== prevFilePathRef.current;

  useEffect(() => {
    prevFilePathRef.current = currentFilePath;
  }, [currentFilePath]);

  useEffect(() => {
    // If the store was updated in this render cycle, skip the URL sync effect
    if (storeChanged) return;

    if (match && params?.slug) {
      const found = loadedSystems.find(sys => {
        const sysName = sys.schema?.name || sys.name || sys.path;
        return slugify(sysName) === params.slug;
      });
      if (found && found.path !== currentFilePath) {
        selectSystem(found.path);
      }
    }
  }, [match, params?.slug, loadedSystems, currentFilePath, selectSystem, storeChanged]);

  useEffect(() => {
    // Only redirect/sync pathname if we are on a workspace route or the root path
    const isWorkspaceRoute =
      location.startsWith('/workspace/') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    const name = workspaceName || schema.name;
    if (!name) return;
    const slug = slugify(name);
    const expectedPath = `/workspace/${slug}`;
    if (location !== expectedPath) {
      const isInitial = location === '/' || location === '';
      setLocation(expectedPath, { replace: isInitial });
    }
  }, [workspaceName, schema.name, location, setLocation]);

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
    </ReactFlowProvider>
  );
};

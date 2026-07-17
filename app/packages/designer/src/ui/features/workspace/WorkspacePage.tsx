import React, { useCallback, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CodeViewer } from './components/CodeViewer/CodeViewer';
import { Canvas } from './components/Canvas/Canvas';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { Header } from './components/Header/Header';
import { MobilePanelToggles } from './components/MobilePanelToggles/MobilePanelToggles';
import { useBlueprintStore } from '../../../application/store/store';
import { DiffMenu } from './components/DiffMenu/DiffMenu';
import { ImportMermaidDialog } from './components/ImportMermaidDialog/ImportMermaidDialog';
import { StartupWorkspaceDialog } from './components/StartupWorkspaceDialog/StartupWorkspaceDialog';
import { useUrlSync } from './hooks/useUrlSync';

function isWorkspaceRootPath(location: string): boolean {
  return location === '/workspace' || location === '/workspace/';
}

export const WorkspacePage: React.FC = () => {
  const [location] = useLocation();
  const {
    leftCollapsed,
    rightCollapsed,
    toggleLeftCollapsed,
    toggleRightCollapsed,
    isDiffOpen,
    setIsDiffOpen,
    isImportMermaidOpen,
    setIsImportMermaidOpen,
    isStartupOpen,
    setIsStartupOpen,
    openWorkspaceDirectory,
    resetToEmptyWorkspace,
  } = useBlueprintStore();

  useUrlSync();

  // Deep links (/workspace/…) skip the chooser; only bare /workspace shows it.
  useEffect(() => {
    if (!isWorkspaceRootPath(location) && isStartupOpen) {
      setIsStartupOpen(false);
    }
  }, [location, isStartupOpen, setIsStartupOpen]);

  const handleLoadSandbox = useCallback(() => {
    setIsStartupOpen(false);
  }, [setIsStartupOpen]);

  const handleOpenDirectory = useCallback(async () => {
    try {
      const opened = await openWorkspaceDirectory();
      if (opened) setIsStartupOpen(false);
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
    }
  }, [openWorkspaceDirectory, setIsStartupOpen]);

  const handleImportMermaid = useCallback(() => {
    resetToEmptyWorkspace();
    setIsStartupOpen(false);
    setIsImportMermaidOpen(true);
  }, [resetToEmptyWorkspace, setIsStartupOpen, setIsImportMermaidOpen]);

  const showStartup = isStartupOpen && isWorkspaceRootPath(location);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-dvh w-full bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-600/30">
        <Header />
        <div className="flex-1 flex overflow-hidden relative">
          <CodeViewer />
          <Canvas />
          <PropertyPanel />

          {/* Desktop: thin edge rails. Mobile: labelled chips (MobilePanelToggles). */}
          <button
            onClick={toggleLeftCollapsed}
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-r-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-l-0"
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
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-850 p-2 rounded-l-xl shadow-2xl transition-all duration-300 ease-in-out focus:outline-none cursor-pointer items-center justify-center border-r-0"
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

          <MobilePanelToggles />
        </div>
      </div>
      <DiffMenu isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
      <ImportMermaidDialog
        isOpen={isImportMermaidOpen}
        onClose={() => setIsImportMermaidOpen(false)}
      />
      <StartupWorkspaceDialog
        isOpen={showStartup}
        onLoadSandbox={handleLoadSandbox}
        onOpenDirectory={() => void handleOpenDirectory()}
        onImportMermaid={handleImportMermaid}
      />
    </ReactFlowProvider>
  );
};

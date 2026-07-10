import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import { useBlueprintStore } from './store';
import { BlueprintNode } from './BlueprintNode';
import { Breadcrumbs } from './Breadcrumbs';
import { Download, Upload, AlertTriangle, CheckCircle, RefreshCcw, Folder } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    nodes,
    edges,
    validationResult,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    initSchema,
    saveSchema,
    loadSchema,
    lastError,
    clearError,
    showTests,
    zoomIntoNode,
    zoomOut,
    openWorkspaceDirectory,
    isWorkspaceOpen,
    saveActiveDiagram,
    loadedSystems,
    currentFilePath,
    selectSystem,
  } = useBlueprintStore();

  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({
      blueprintNode: BlueprintNode as any,
    }),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentFilePath, fitView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      if (isTyping) return;

      if (e.key === 'Escape' || e.key === 'Backspace') {
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomOut]);

  const handleSave = async () => {
    if (isWorkspaceOpen) {
      await saveActiveDiagram();
    } else {
      await saveSchema();
    }
  };

  const handleLoad = async () => {
    await loadSchema();
  };

  const handleClear = () => {
    if (confirm('Clear the workspace and create a blank canvas?')) {
      initSchema({
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      });
    }
  };

  const filteredNodes = useMemo(() => {
    if (showTests) return nodes;
    return nodes.filter(n => !n.data.isTest);
  }, [nodes, showTests]);

  const filteredEdges = useMemo(() => {
    if (showTests) return edges;
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, filteredNodes, showTests]);

  return (
    <div className="flex-1 h-full relative" onClick={() => selectNode(null)}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => {
          if (node.data?.c4Ref) {
            zoomIntoNode(node.id);
          }
        }}
        nodeTypes={nodeTypes}
        minZoom={0.05}
        maxZoom={4}
        fitView
        className="h-full"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          bgColor="#0f172a"
          nodeColor={n => {
            if (n.type === 'blueprintNode') {
              if (n.data?.type === 'relational-database') return '#06b6d4';
              if (n.data?.type === 'event-broker') return '#a855f7';
              if (n.data?.type === 'grpc-service') return '#3b82f6';
              if (n.data?.type === 'serverless-function') return '#eab308';
              if (n.data?.type === 'rest-api') return '#10b981';
              if (n.data?.type === 'cache-store') return '#f97316';
            }
            return '#1e293b';
          }}
          maskColor="rgba(15, 23, 42, 0.6)"
          className="border border-slate-800 rounded-lg overflow-hidden"
          style={{ width: 120, height: 90 }}
        />

        <Panel position="top-left" className="m-4 flex items-center gap-3">
          <Breadcrumbs />

          {/* System Selector Dropdown */}
          {loadedSystems && loadedSystems.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-900 px-3 py-1.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                System:
              </span>
              <select
                value={currentFilePath}
                onChange={e => selectSystem(e.target.value)}
                className="bg-slate-900 border border-slate-850 text-slate-200 hover:text-slate-100 hover:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer transition duration-200"
              >
                {loadedSystems.map(sys => (
                  <option key={sys.path} value={sys.path}>
                    {sys.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md">
            {isWorkspaceOpen ? (
              <button
                onClick={openWorkspaceDirectory}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 transition"
                title="Open another folder workspace"
              >
                <Folder className="w-3.5 h-3.5 text-brand-500" />
                <span>Open Folder</span>
              </button>
            ) : (
              <button
                onClick={openWorkspaceDirectory}
                className="flex items-center gap-1.5 bg-brand-600/15 border border-brand-500/30 text-brand-400 hover:bg-brand-600/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                title="Open a local directory workspace"
              >
                <Folder className="w-3.5 h-3.5 text-brand-500" />
                <span>Open Folder</span>
              </button>
            )}

            <button
              onClick={handleLoad}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 transition"
              title="Open single YAML from disk"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Open File</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition"
              title={isWorkspaceOpen ? 'Save diagram directly in folder' : 'Save YAML to disk'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isWorkspaceOpen ? 'Save' : 'Save Schema'}</span>
            </button>

            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/30 transition"
              title="Clear canvas"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </Panel>

        <Panel position="top-right" className="m-4">
          <div className="flex items-center shadow-lg shadow-black/40 backdrop-blur-md">
            {validationResult.isValid ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-900/40 text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                <span>Graph Valid</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-900/40 text-red-400 px-3.5 py-2 rounded-xl text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Cycle Detected</span>
              </div>
            )}
          </div>
        </Panel>

        {lastError && (
          <Panel position="top-center" className="m-4 max-w-md w-full animate-bounce-short">
            <div className="flex items-start gap-3 bg-red-950/90 border border-red-900/50 px-4 py-3 rounded-xl shadow-2xl shadow-red-950/40 backdrop-blur-md text-red-200 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-bold text-red-300 mb-0.5">Schema Import Failed</h5>
                <p className="leading-relaxed whitespace-pre-wrap">{lastError}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-200 transition text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0 self-center border border-red-900/40 hover:border-red-900/80 rounded px-1.5 py-0.5 bg-red-950/60"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

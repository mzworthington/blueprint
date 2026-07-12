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
import { useBlueprintStore } from '../../../../../application/store/store';
import { BlueprintNode } from './BlueprintNode';
import { ActionControls } from '../ActionControls/ActionControls';
import { AlertTriangle } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    lastError,
    clearError,
    showTests,
    zoomIntoNode,
    zoomOut,
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
          const hasSub =
            node.data?.c4Ref ||
            (node.data?.entityRef &&
              loadedSystems.some(
                s => s.schema.level === 'component' && s.schema.parentRef === node.data.entityRef
              ));
          if (hasSub) {
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
        <Controls position="top-right" />

        <Panel
          position="bottom-right"
          className="m-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/90 border border-slate-900 px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md"
        >
          {loadedSystems && loadedSystems.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs shrink-0 select-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 hidden sm:inline">
                System:
              </span>
              <select
                value={currentFilePath}
                onChange={e => selectSystem(e.target.value)}
                className="bg-slate-950 border border-slate-850 text-slate-200 hover:text-slate-100 hover:border-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer transition duration-200 max-w-[130px] truncate"
              >
                {loadedSystems.map(sys => (
                  <option key={sys.path} value={sys.path}>
                    {sys.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <ActionControls />
        </Panel>

        <div className="hidden md:block">
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
        </div>

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

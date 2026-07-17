import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { BlueprintNode } from './BlueprintNode';
import { WorkspaceToolbar } from '../WorkspaceToolbar/WorkspaceToolbar';
import { AlertTriangle, CheckCircle2, Info, AlertCircle, X, ZoomOut, Loader2 } from 'lucide-react';
import { getSchemaEntityRef } from '@blueprint/core';
import type { NodeType } from '@blueprint/core';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import {
  applyCouplingHighlights,
  buildCouplingOverlayEdges,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import {
  applyHotspotHeatmap,
  hotspotHeatmapMinimapColor,
} from '../../../../../application/forensics/hotspotHeatmap';

export const Canvas: React.FC = () => {
  const [, setLocation] = useLocation();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectedNodeId,
    lastError,
    clearError,
    showTests,
    showCoupling,
    showHotspotHeatmap,
    focusedCyclePath,
    loadedSystems,
    currentFilePath,
    workspaceName,
    isWorkspaceOpen,
    notification,
    setNotification,
    layoutEngine,
    applyClientLayout,
    undo,
    redo,
    recordHistory,
    addNode,
    isLoading,
  } = useBlueprintStore();

  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;

  const nodeTypes = useMemo(
    () => ({
      blueprintNode: BlueprintNode as any,
    }),
    []
  );

  const parentSystem = useMemo(() => {
    const active = loadedSystems.find(s => s.path === currentFilePath);
    const childRef = active?.schema.entityRef;
    if (!childRef) return null;
    return loadedSystems.find(s => s.schema.nodes.some(n => n.entityRef === childRef)) ?? null;
  }, [loadedSystems, currentFilePath]);

  const zoomOutToParent = useCallback(() => {
    if (!parentSystem) return;
    const parentRef = getSchemaEntityRef(
      parentSystem.schema,
      isWorkspaceOpen ? workspaceName : undefined
    );
    setLocation(`/workspace/${parentRef}`);
  }, [parentSystem, isWorkspaceOpen, workspaceName, setLocation]);

  useKeyboardNavigation({
    onZoomOut: parentSystem ? zoomOutToParent : undefined,
    onUndo: undo,
    onRedo: redo,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fitViewRef.current({ duration: 400 });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentFilePath]);

  // Apply layout engine after diagram switches or mode changes (session positions).
  useEffect(() => {
    if (!layoutEngine) return;
    const controller = new AbortController();
    void applyClientLayout(controller.signal).then(() => {
      if (controller.signal.aborted) return;
      fitViewRef.current({ duration: 400 });
    });
    return () => controller.abort();
  }, [currentFilePath, layoutEngine, applyClientLayout]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  const filteredNodes = useMemo(() => {
    if (showTests) return nodes;
    return nodes.filter(n => !n.data.isTest);
  }, [nodes, showTests]);

  const displayNodes = useMemo(() => {
    let baseNodes = filteredNodes;
    if (focusedCyclePath) {
      const cycleSet = new Set(focusedCyclePath);
      baseNodes = baseNodes.filter(n => cycleSet.has(n.id));
    }
    const focused = filterCouplingFocusNodes(baseNodes, selectedNodeId, showCoupling);
    const withCoupling = applyCouplingHighlights(focused, selectedNodeId, showCoupling);
    return applyHotspotHeatmap(withCoupling, showHotspotHeatmap);
  }, [filteredNodes, selectedNodeId, showCoupling, showHotspotHeatmap, focusedCyclePath]);

  const filteredEdges = useMemo(() => {
    if (showTests) return edges;
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, filteredNodes, showTests]);

  const displayEdges = useMemo(() => {
    if (focusedCyclePath) {
      return filteredEdges.filter(e => {
        for (let i = 0; i < focusedCyclePath.length - 1; i++) {
          if (focusedCyclePath[i] === e.source && focusedCyclePath[i + 1] === e.target) {
            return true;
          }
        }
        return false;
      });
    }
    const couplingEdges = buildCouplingOverlayEdges(selectedNodeId, filteredNodes, showCoupling);
    // Coupling focus: hide schema deps; only show temporal-coupling links.
    if (showCoupling && couplingEdges.length > 0) return couplingEdges;

    const visibleNodeIds = new Set(displayNodes.map(n => n.id));
    return filteredEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [filteredEdges, filteredNodes, displayNodes, selectedNodeId, showCoupling, focusedCyclePath]);

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div className="flex-1 h-full relative" onClick={() => selectNode(null)}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => recordHistory()}
        onNodeDoubleClick={(_, node) => {
          const hasSub =
            node.data?.entityRef &&
            loadedSystems.some(s => s.schema.entityRef === node.data.entityRef);
          if (hasSub && node.data?.entityRef) {
            setLocation(`/workspace/${node.data.entityRef}`);
          }
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        minZoom={0.05}
        maxZoom={4}
        fitView
        className="h-full"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        <Controls position="top-right" />

        {parentSystem && (
          <Panel position="top-left" className="m-4">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                zoomOutToParent();
              }}
              className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 hover:border-brand-500/40 hover:bg-slate-900 text-slate-200 hover:text-brand-300 px-3 py-1.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs font-semibold transition cursor-pointer"
              title="Zoom out to parent diagram (Esc)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Zoom out</span>
              <kbd className="hidden sm:inline ml-1 text-[9px] font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
                Esc
              </kbd>
            </button>
          </Panel>
        )}

        <Panel
          position="bottom-right"
          className="m-4 mb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-slate-950/90 border border-slate-900 px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md"
        >
          <WorkspaceToolbar />
        </Panel>

        <div className="hidden md:block">
          <MiniMap
            position="bottom-left"
            bgColor="#0f172a"
            nodeColor={n => {
              if (showHotspotHeatmap && n.type === 'blueprintNode') {
                const heatColor = hotspotHeatmapMinimapColor(
                  typeof n.data?.hotspotHeat === 'number' ? n.data.hotspotHeat : 0
                );
                if (heatColor) return heatColor;
              }
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

        {notification && (
          <Panel position="top-center" className="m-4 max-w-md w-full animate-slide-in z-50">
            <div
              className={`flex items-start gap-3 border px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs transition-all duration-300 ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                  : notification.type === 'info'
                    ? 'bg-cyan-950/90 border-cyan-900/50 text-cyan-200'
                    : 'bg-red-950/90 border-red-900/50 text-red-200'
              }`}
            >
              {notification.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {notification.type === 'info' && (
                <Info className="w-5 h-5 text-cyan-450 shrink-0 mt-0.5" />
              )}
              {notification.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                {notification.title && (
                  <h5
                    className={`font-bold mb-0.5 ${
                      notification.type === 'success'
                        ? 'text-emerald-300'
                        : notification.type === 'info'
                          ? 'text-cyan-300'
                          : 'text-red-300'
                    }`}
                  >
                    {notification.title}
                  </h5>
                )}
                <p className="leading-relaxed">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-450 hover:text-slate-200 transition shrink-0 p-0.5 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Panel>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-[#040914]/65 backdrop-blur-[4px] z-50 flex flex-col items-center justify-center gap-3 animate-fade-in pointer-events-auto">
            <div className="p-4 rounded-2xl bg-[#061125]/85 border border-[#00f0ff]/20 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col items-center gap-3 min-w-[180px] max-w-[240px] text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#00f0ff]" />
              <span className="text-xs font-mono tracking-wider text-slate-350 uppercase">
                {typeof isLoading === 'string' ? isLoading : 'LOADING SCHEMA...'}
              </span>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};

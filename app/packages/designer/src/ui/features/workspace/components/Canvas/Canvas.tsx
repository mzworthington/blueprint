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
import { useShallow } from 'zustand/react/shallow';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { BlueprintNode } from './BlueprintNode';
import { BlueprintGroupNode } from './BlueprintGroupNode';
import { WorkspaceToolbar } from '../WorkspaceToolbar/WorkspaceToolbar';
import { AlertTriangle, CheckCircle2, Info, AlertCircle, X, ZoomOut } from 'lucide-react';
import { getSchemaEntityRef } from '@blueprint/core';
import type { NodeType } from '@blueprint/core';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import {
  applyCouplingHighlights,
  applyRefactorBoundaryHighlights,
  buildCouplingOverlayEdges,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import { filterSelectedDependencyFocusNodes } from '../../../../../application/forensics/filterSelectedDependencyFocus';
import {
  applyHotspotHeatmap,
  hotspotHeatmapMinimapColor,
} from '../../../../../application/forensics/hotspotHeatmap';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  prefersReducedMotion,
  shouldAnimateDependencyEdge,
  shouldAutoLayoutOnLoad,
} from '../../../../../application/store/layoutUtils';
import {
  hasSessionLayout,
  schemaLayoutFingerprint,
} from '../../../../../application/store/sessionLayoutCache';
import { SubDiagramRefsContext } from './SubDiagramRefsContext';

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
    selectEdge,
    selectedEdgeId,
    lastError,
    clearError,
    showTests,
    showExternals,
    showSelectedDependenciesOnly,
    showCoupling,
    guidedRefactorEntityRefs,
    showHotspotHeatmap,
    liteCanvas,
    focusedCyclePath,
    loadedSystems,
    workspaceCatalog,
    currentFilePath,
    workspaceName,
    isWorkspaceOpen,
    notification,
    setNotification,
    applyClientLayout,
    layoutSessionId,
    undo,
    redo,
    recordHistory,
    addNode,
  } = useBlueprintStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      selectNode: state.selectNode,
      selectedNodeId: state.selectedNodeId,
      selectEdge: state.selectEdge,
      selectedEdgeId: state.selectedEdgeId,
      lastError: state.lastError,
      clearError: state.clearError,
      showTests: state.showTests,
      showExternals: state.showExternals,
      showSelectedDependenciesOnly: state.showSelectedDependenciesOnly,
      showCoupling: state.showCoupling,
      guidedRefactorEntityRefs: state.guidedRefactorEntityRefs,
      showHotspotHeatmap: state.showHotspotHeatmap,
      liteCanvas: state.liteCanvas,
      focusedCyclePath: state.focusedCyclePath,
      loadedSystems: state.loadedSystems,
      workspaceCatalog: state.workspaceCatalog,
      currentFilePath: state.currentFilePath,
      workspaceName: state.workspaceName,
      isWorkspaceOpen: state.isWorkspaceOpen,
      notification: state.notification,
      setNotification: state.setNotification,
      applyClientLayout: state.applyClientLayout,
      layoutSessionId: state.layoutSessionId,
      undo: state.undo,
      redo: state.redo,
      recordHistory: state.recordHistory,
      addNode: state.addNode,
    }))
  );

  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;

  const nodeTypes = useMemo(
    () => ({
      blueprintNode: BlueprintNode as any,
      blueprintGroup: BlueprintGroupNode as any,
    }),
    []
  );

  const subDiagramRefs = useMemo(() => {
    const refs = new Set<string>();
    for (const entry of workspaceCatalog) {
      refs.add(entry.entityRef);
    }
    return refs;
  }, [workspaceCatalog]);

  const parentSystem = useMemo(() => {
    const parentEntityRef = workspaceCatalog.find(e => e.path === currentFilePath)?.parentEntityRef;
    if (!parentEntityRef) return null;
    return (
      loadedSystems.find(s => {
        const ref = getSchemaEntityRef(s.schema, isWorkspaceOpen ? workspaceName : undefined);
        return ref === parentEntityRef;
      }) ?? null
    );
  }, [workspaceCatalog, loadedSystems, currentFilePath, isWorkspaceOpen, workspaceName]);

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
    const controller = new AbortController();
    const run = async () => {
      const { schema, layoutEngine: currentEngine } = useBlueprintStore.getState();
      const fingerprint = schemaLayoutFingerprint(schema);
      const needsLayout =
        shouldAutoLayoutOnLoad(schema) &&
        !hasSessionLayout(useBlueprintStore.getState().currentFilePath, fingerprint);

      if (needsLayout) {
        if (currentEngine !== 'dagre') {
          useBlueprintStore.setState({ layoutEngine: 'dagre' });
        }
        await applyClientLayout({
          signal: controller.signal,
          engine: 'dagre',
          recordHistory: false,
        });
      }

      if (controller.signal.aborted) return;
      // Wait for React Flow to commit node measurements after layout state updates.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitViewRef.current({ padding: 0.12 });
        });
      });
    };

    void run();
    return () => controller.abort();
  }, [currentFilePath, layoutSessionId, applyClientLayout]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  const filteredNodes = useMemo(() => {
    const base = nodes.filter(n => {
      if (!showTests && n.data.isTest) return false;
      if (!showExternals && n.data.external) return false;
      return true;
    });
    const visibleIds = new Set(base.map(n => n.id));
    const baseEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
    return filterSelectedDependencyFocusNodes(
      base,
      baseEdges,
      selectedNodeId,
      showSelectedDependenciesOnly
    );
  }, [nodes, edges, showTests, showExternals, selectedNodeId, showSelectedDependenciesOnly]);

  const displayNodes = useMemo(() => {
    let baseNodes = filteredNodes;
    if (focusedCyclePath) {
      const cycleSet = new Set(focusedCyclePath);
      baseNodes = baseNodes.filter(n => cycleSet.has(n.id));
    }
    const focused = filterCouplingFocusNodes(baseNodes, selectedNodeId, showCoupling);
    const withCoupling = applyCouplingHighlights(focused, selectedNodeId, showCoupling);
    const withBoundary = applyRefactorBoundaryHighlights(withCoupling, guidedRefactorEntityRefs);
    return applyHotspotHeatmap(withBoundary, showHotspotHeatmap);
  }, [
    filteredNodes,
    selectedNodeId,
    showCoupling,
    guidedRefactorEntityRefs,
    showHotspotHeatmap,
    focusedCyclePath,
  ]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, filteredNodes]);

  const reduceMotion = prefersReducedMotion();

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
    if (showCoupling && couplingEdges.length > 0) return couplingEdges;

    const visibleNodeIds = new Set(displayNodes.map(n => n.id));
    let next = filteredEdges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    if (selectedEdgeId && !next.some(e => e.id === selectedEdgeId)) {
      const selected = edges.find(e => e.id === selectedEdgeId);
      if (selected) next = [...next, selected];
    }

    const animationOpts = { liteCanvas, preferReducedMotion: reduceMotion };

    return next.map(e => {
      const isSelected = e.id === selectedEdgeId;
      const stroke = isSelected
        ? '#00f0ff'
        : ((e.style?.stroke as string | undefined) ?? DEPENDENCY_EDGE_STROKE);
      return {
        ...e,
        selected: isSelected,
        animated: shouldAnimateDependencyEdge(
          e,
          selectedNodeId,
          showSelectedDependenciesOnly,
          animationOpts
        ),
        markerEnd: dependencyArrowMarker(stroke),
        style: {
          ...e.style,
          stroke,
          strokeWidth: isSelected ? 3 : ((e.style?.strokeWidth as number | undefined) ?? 2),
        },
      };
    });
  }, [
    filteredEdges,
    filteredNodes,
    displayNodes,
    selectedNodeId,
    selectedEdgeId,
    showCoupling,
    showSelectedDependenciesOnly,
    focusedCyclePath,
    edges,
    liteCanvas,
    reduceMotion,
  ]);

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
    <div
      className="flex-1 h-full relative"
      onClick={() => {
        selectNode(null);
        selectEdge(null);
      }}
    >
      <SubDiagramRefsContext.Provider value={subDiagramRefs}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(event, node) => {
            event.stopPropagation();
            selectNode(node.id);
          }}
          onEdgeClick={(event, edge) => {
            event.stopPropagation();
            selectEdge(edge.id);
          }}
          onPaneClick={() => {
            selectNode(null);
            selectEdge(null);
          }}
          onNodeDragStart={() => recordHistory()}
          onNodeDoubleClick={(_, node) => {
            const hasSub =
              node.data?.entityRef && subDiagramRefs.has(node.data.entityRef as string);
            if (hasSub && node.data?.entityRef) {
              setLocation(`/workspace/${node.data.entityRef}`);
            }
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgesFocusable
          elementsSelectable
          onlyRenderVisibleElements
          minZoom={0.05}
          maxZoom={4}
          fitView
          className="h-full"
        >
          {!liteCanvas && (
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
          )}
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
            position="bottom-center"
            style={{ zIndex: 100 }}
            className="mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:mb-[max(1rem,env(safe-area-inset-bottom,0px))] !w-[calc(100%-1.5rem)] sm:!w-auto sm:!max-w-[min(56rem,calc(100%-1.5rem))] overflow-visible bg-slate-950/90 border border-slate-900 px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md pointer-events-auto"
          >
            <WorkspaceToolbar />
          </Panel>

          {!liteCanvas && (
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
          )}

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
                      : notification.type === 'warning'
                        ? 'bg-amber-950/90 border-amber-900/50 text-amber-200'
                        : 'bg-red-950/90 border-red-900/50 text-red-200'
                }`}
              >
                {notification.type === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {notification.type === 'info' && (
                  <Info className="w-5 h-5 text-cyan-450 shrink-0 mt-0.5" />
                )}
                {notification.type === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
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
                            : notification.type === 'warning'
                              ? 'text-amber-300'
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
        </ReactFlow>
      </SubDiagramRefsContext.Provider>
    </div>
  );
};

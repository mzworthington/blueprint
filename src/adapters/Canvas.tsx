import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import { useBlueprintStore } from './store';
import { BlueprintNode } from './BlueprintNode';
import { Download, Upload, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

export const Canvas: React.FC = () => {
  const {
    nodes,
    edges,
    schema,
    validationResult,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    initSchema,
    saveSchema,
    loadSchema,
  } = useBlueprintStore();

  // Map custom node types
  const nodeTypes = useMemo(
    () => ({
      blueprintNode: BlueprintNode as any,
    }),
    []
  );

  const handleSave = async () => {
    await saveSchema();
  };

  const handleLoad = async () => {
    await loadSchema();
  };

  const handleClear = () => {
    if (confirm('Clear the workspace and create a blank canvas?')) {
      initSchema({
        name: 'Empty Workspace',
        version: '1.0.0',
        nodes: [],
        dependencies: [],
      });
    }
  };

  return (
    <div className="flex-1 h-full relative" onClick={() => selectNode(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
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

        {/* Floating Top Header Panel */}
        <Panel position="top-left" className="m-4 flex items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-850 px-4 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md">
            <div>
              <h1 className="text-sm font-semibold text-slate-100 m-0">
                {schema.name}
              </h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                Workspace
              </p>
            </div>

            <div className="w-px h-6 bg-slate-800/80 self-center mx-1" />

            {/* Disk IO Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoad}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 transition"
                title="Open YAML from disk"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open File</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition"
                title="Save YAML to disk"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Schema</span>
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/30 transition"
                title="Clear canvas"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Panel>

        {/* Floating Top Right Validation Badge */}
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
      </ReactFlow>
    </div>
  );
};

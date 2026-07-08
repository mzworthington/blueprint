import React, { useState } from 'react';
import {
  Database,
  Globe,
  Zap,
  Cpu,
  Layers,
  Share2,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { useBlueprintStore } from './store';
import type { NodeType, PropertyMap } from '../domain/schema';

const NODE_TYPES: { type: NodeType; label: string; icon: any }[] = [
  { type: 'rest-api', label: 'REST API', icon: Globe },
  { type: 'grpc-service', label: 'gRPC Service', icon: Cpu },
  { type: 'event-broker', label: 'Event Broker', icon: Share2 },
  { type: 'relational-database', label: 'Relational DB', icon: Database },
  { type: 'cache-store', label: 'Cache Store', icon: Layers },
  { type: 'serverless-function', label: 'Serverless Fn', icon: Zap },
];

export const PropertyPanel: React.FC = () => {
  const {
    schema,
    selectedNodeId,
    nodes,
    edges,
    validationResult,
    updateSchemaName,
    addNode,
    updateNode,
    deleteNode,
    selectNode,
    updateDependency,
    deleteDependency,
  } = useBlueprintStore();

  const selectedRFNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNode = selectedRFNode
    ? schema.nodes.find(sn => sn.id === selectedNodeId)
    : null;

  // Local state for properties editor
  const [propKey, setPropKey] = useState('');
  const [propVal, setPropVal] = useState('');

  // Handle updates to selected node fields
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { name: e.target.value });
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNodeId) return;
    const newId = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (newId && newId !== selectedNodeId) {
      // Prevent duplicate IDs
      if (schema.nodes.some(n => n.id === newId)) return;
      updateNode(selectedNodeId, { id: newId });
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedNodeId) return;
    updateNode(selectedNodeId, { type: e.target.value as NodeType });
  };

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !selectedNode || !propKey.trim()) return;
    
    const nextProps: PropertyMap = {
      ...(selectedNode.properties || {}),
      [propKey.trim()]: propVal,
    };
    
    updateNode(selectedNodeId, { properties: nextProps });
    setPropKey('');
    setPropVal('');
  };

  const handleDeleteProperty = (key: string) => {
    if (!selectedNodeId || !selectedNode || !selectedNode.properties) return;
    const nextProps = { ...selectedNode.properties };
    delete nextProps[key];
    updateNode(selectedNodeId, { properties: nextProps });
  };

  // Find connections related to this node
  const nodeConnections = edges.filter(
    e => e.source === selectedNodeId || e.target === selectedNodeId
  );

  return (
    <div className="w-80 h-full flex flex-col border-l border-slate-900 bg-slate-950/80 glass-panel">
      {/* Upper header */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <h3 className="font-semibold text-slate-100 tracking-tight text-base">
          Properties Panel
        </h3>
        {selectedNodeId && (
          <button
            onClick={() => selectNode(null)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {selectedNode ? (
          // NODE IS SELECTED
          <div className="space-y-6">
            {/* Core Info */}
            <div className="space-y-4">
              <div>
                <label htmlFor="component-name-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Component Name
                </label>
                <input
                  id="component-name-input"
                  type="text"
                  value={selectedNode.name}
                  onChange={handleNameChange}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label htmlFor="component-id-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Component ID (Schema Key)
                </label>
                <input
                  id="component-id-input"
                  type="text"
                  value={selectedNode.id}
                  onChange={handleIdChange}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Component Type
                </label>
                <select
                  value={selectedNode.type}
                  onChange={handleTypeChange}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
                >
                  {NODE_TYPES.map(nt => (
                    <option key={nt.type} value={nt.type}>
                      {nt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Properties (Key-Value Metadata) */}
            <div className="border-t border-slate-900 pt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Metadata Attributes
              </h4>

              {/* Existing Metadata */}
              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 ? (
                <div className="space-y-2 mb-3">
                  {Object.entries(selectedNode.properties).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-1.5 border border-slate-900/60"
                    >
                      <div className="text-xs truncate mr-2">
                        <span className="font-mono text-brand-100/70">{key}:</span>{' '}
                        <span className="text-slate-300 font-semibold">{val}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteProperty(key)}
                        className="text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic mb-3">No metadata attributes added.</p>
              )}

              {/* Add attribute form */}
              <form onSubmit={handleAddProperty} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key (e.g. port)"
                  value={propKey}
                  onChange={e => setPropKey(e.target.value)}
                  className="w-1/2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500 transition"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={propVal}
                  onChange={e => setPropVal(e.target.value)}
                  className="w-1/2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500 transition"
                />
                <button
                  type="submit"
                  aria-label="Add attribute"
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg p-1.5 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Inbound & Outbound Connections */}
            <div className="border-t border-slate-900 pt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Active Connections
              </h4>
              {nodeConnections.length > 0 ? (
                <div className="space-y-3">
                  {nodeConnections.map(edge => {
                    const isSource = edge.source === selectedNodeId;
                    const partnerId = isSource ? edge.target : edge.source;
                    const partnerNode = schema.nodes.find(n => n.id === partnerId);
                    
                    return (
                      <div
                        key={edge.id}
                        className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-900 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300">
                            {isSource ? '➔ Output to' : '📥 Input from'}{' '}
                            <span className="text-brand-100">
                              {partnerNode?.name || partnerId}
                            </span>
                          </span>
                          <button
                            onClick={() => deleteDependency(edge.source, edge.target)}
                            className="text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Connection type selection */}
                        <div className="flex gap-2">
                          <select
                            value={(edge.data as any)?.type || 'direct-call'}
                            onChange={e =>
                              updateDependency(edge.source, edge.target, {
                                type: e.target.value as any,
                              })
                            }
                            className="bg-slate-950 border border-slate-900 rounded px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none"
                          >
                            <option value="direct-call">Direct Call</option>
                            <option value="publish-subscribe">Pub/Sub (Async)</option>
                            <option value="read-write">Read/Write</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No connections established.</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="border-t border-slate-900 pt-4">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this component?')) {
                    deleteNode(selectedNode.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-950/20 border border-red-900/30 hover:border-red-900/60 text-red-400 rounded-lg py-2 text-xs font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete Component
              </button>
            </div>
          </div>
        ) : (
          // NO NODE SELECTED - WORKSPACE CONFIG
          <div className="space-y-6">
            {/* Project/Workspace properties */}
            <div>
              <label htmlFor="workspace-name-input" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Workspace Name
              </label>
              <input
                id="workspace-name-input"
                type="text"
                value={schema.name}
                onChange={e => updateSchemaName(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            {/* Quick-add Toolbox */}
            <div className="border-t border-slate-900 pt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Component Catalog
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Click any component below to instantiate it on the canvas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {NODE_TYPES.map(nt => {
                  const Icon = nt.icon;
                  return (
                    <button
                      key={nt.type}
                      onClick={() => addNode(nt.type)}
                      className="flex flex-col items-center gap-2 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition text-center"
                    >
                      <Icon className="w-5 h-5 text-brand-500" />
                      <span className="text-xs font-semibold text-slate-200">{nt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Validation Overview */}
            <div className="border-t border-slate-900 pt-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Graph Validation
              </h4>
              {validationResult.isValid ? (
                <div className="flex items-start gap-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3.5 text-emerald-400 text-xs">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h5 className="font-semibold leading-none mb-1">Architecture Valid</h5>
                    <p className="text-[11px] text-emerald-500/80 leading-normal">
                      No cyclic loops or invalid boundaries detected.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {validationResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 rounded-xl p-3.5 text-red-400 text-xs"
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <h5 className="font-semibold leading-none mb-1">
                          {issue.type === 'cycle' ? 'Circular Dependency' : 'Validation Alert'}
                        </h5>
                        <p className="text-[11px] text-red-400/80 leading-normal">
                          {issue.message}
                        </p>
                        {issue.path && (
                          <div className="mt-2 font-mono text-[10px] bg-red-950/40 px-2 py-1 rounded border border-red-900/40 text-red-300">
                            {issue.path.join(' ➔ ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer credits */}
      <div className="p-4 border-t border-slate-900 text-center">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Blueprint Engine v0.1.0
        </span>
      </div>
    </div>
  );
};

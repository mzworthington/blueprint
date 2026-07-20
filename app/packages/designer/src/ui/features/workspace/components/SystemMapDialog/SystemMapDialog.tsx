import React, { useMemo } from 'react';
import { Link } from 'wouter';
import { Compass, X, Network, GitBranch } from 'lucide-react';
import { getSchemaEntityRef } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

interface SystemMapDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Context-level mini-overview — thumbnail grid of top-level systems in the workspace.
 */
export const SystemMapDialog: React.FC<SystemMapDialogProps> = ({ isOpen, onClose }) => {
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const currentFilePath = useBlueprintStore(s => s.currentFilePath);
  const workspaceName = useBlueprintStore(s => s.workspaceName);
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);

  const contextSystems = useMemo(
    () => loadedSystems.filter(s => (s.schema.level || 'container') === 'context'),
    [loadedSystems]
  );

  const systemsToShow = contextSystems.length > 0 ? contextSystems : loadedSystems;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-map-title"
      data-testid="system-map-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl max-h-[min(85vh,640px)] flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-1">
                Navigation
              </p>
              <h2 id="system-map-title" className="text-base font-bold text-white">
                System map
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {contextSystems.length > 0
                  ? 'Context-level diagrams in this workspace'
                  : 'All loaded diagrams (no context-level systems found)'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close system map"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {systemsToShow.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No systems loaded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {systemsToShow.map(sys => {
                  const entityRef = getSchemaEntityRef(
                    sys.schema,
                    isWorkspaceOpen ? workspaceName : undefined
                  );
                  const isActive = sys.path === currentFilePath;
                  const nodeCount = sys.schema.nodes.length;
                  const depCount = sys.schema.dependencies.length;

                  return (
                    <Link
                      key={sys.path}
                      to={`/workspace/${entityRef}`}
                      onClick={onClose}
                      data-testid={`system-map-card-${sys.path}`}
                      className={`group rounded-xl border p-4 text-left transition cursor-pointer ${
                        isActive
                          ? 'border-[#00f0ff]/40 bg-cyan-950/20'
                          : 'border-slate-800 bg-slate-950/60 hover:border-[#00f0ff]/25 hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${
                            isActive
                              ? 'bg-emerald-950/40 border-emerald-500/30'
                              : 'bg-slate-900 border-slate-800 group-hover:border-emerald-500/20'
                          }`}
                        >
                          <Compass className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100 truncate">
                            {sys.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                            {sys.path}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Network className="w-3 h-3" />
                              {nodeCount} nodes
                            </span>
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              {depCount} deps
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {sys.schema.nodes.slice(0, 8).map(node => (
                          <span
                            key={node.entityRef}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 truncate max-w-[80px]"
                            title={node.name}
                          >
                            {node.name}
                          </span>
                        ))}
                        {nodeCount > 8 ? (
                          <span className="text-[9px] text-slate-600 px-1">+{nodeCount - 8}</span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

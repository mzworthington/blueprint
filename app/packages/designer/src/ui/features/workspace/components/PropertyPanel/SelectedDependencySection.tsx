import React from 'react';
import { Trash2 } from 'lucide-react';
import type { SystemDependency, SystemNode } from '@blueprint/core';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';

interface SelectedDependencySectionProps {
  edge: BlueprintRFEdge;
  schemaNodes: SystemNode[];
  /** True when either endpoint is missing from the current canvas node list. */
  isDangling: boolean;
  onUpdateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  onDeleteDependency: (from: string, to: string) => void;
  onSelectNode: (id: string) => void;
}

function resolveEndpoint(schemaNodes: SystemNode[], ref: string) {
  const node = schemaNodes.find(n => n.entityRef === ref);
  return {
    name: node?.name || ref,
    entityRef: ref,
    found: !!node,
    external: !!node?.external,
  };
}

export const SelectedDependencySection: React.FC<SelectedDependencySectionProps> = ({
  edge,
  schemaNodes,
  isDangling,
  onUpdateDependency,
  onDeleteDependency,
  onSelectNode,
}) => {
  const from = resolveEndpoint(schemaNodes, edge.source);
  const to = resolveEndpoint(schemaNodes, edge.target);

  return (
    <div className="space-y-4" data-testid="selected-dependency-section">
      <div className="border-t border-slate-900 pt-4 space-y-3">
        <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
          Dependency
        </h4>

        {isDangling ? (
          <p
            className="text-[10px] leading-snug text-amber-400/90 bg-amber-950/20 border border-amber-900/40 rounded-lg px-2.5 py-2"
            data-testid="dangling-dependency-warning"
          >
            One or both endpoints are hidden or missing on this diagram. The edge still exists in
            the schema.
          </p>
        ) : null}

        <EndpointCard
          label="From"
          name={from.name}
          entityRef={from.entityRef}
          found={from.found}
          external={from.external}
          onSelect={() => onSelectNode(from.entityRef)}
        />
        <EndpointCard
          label="To"
          name={to.name}
          entityRef={to.entityRef}
          found={to.found}
          external={to.external}
          onSelect={() => onSelectNode(to.entityRef)}
        />
      </div>

      <div className="border-t border-slate-900 pt-4 space-y-2">
        <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
          Details
        </h4>
        <select
          aria-label="Dependency type"
          value={edge.data?.type || 'direct-call'}
          onChange={e =>
            onUpdateDependency(edge.source, edge.target, {
              type: e.target.value as SystemDependency['type'],
            })
          }
          className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none transition"
        >
          <option value="direct-call">Direct Call</option>
          <option value="publish-subscribe">Pub/Sub (Async)</option>
          <option value="read-write">Read/Write</option>
          <option value="inter-container">Inter-container</option>
        </select>
        <input
          type="text"
          aria-label="Dependency description"
          placeholder="Description (e.g. Calls module / service)"
          value={edge.data?.description || ''}
          onChange={e =>
            onUpdateDependency(edge.source, edge.target, {
              description: e.target.value,
            })
          }
          className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200 focus:outline-none transition focus:shadow-[0_0_8px_rgba(139,92,246,0.15)]"
        />
      </div>

      <div className="border-t border-slate-900 pt-4">
        <button
          type="button"
          onClick={() => {
            if (confirm('Delete this dependency?')) {
              onDeleteDependency(edge.source, edge.target);
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-red-950/15 border border-red-900/30 hover:border-red-900/60 hover:bg-red-950/30 text-red-400 rounded-lg py-2 text-xs font-semibold transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Delete Dependency
        </button>
      </div>
    </div>
  );
};

function EndpointCard({
  label,
  name,
  entityRef,
  found,
  external,
  onSelect,
}: {
  label: string;
  name: string;
  entityRef: string;
  found: boolean;
  external: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-900 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {found ? (
          <button
            type="button"
            onClick={onSelect}
            className="text-[10px] font-mono text-brand-400 hover:text-brand-300 cursor-pointer"
          >
            Select node
          </button>
        ) : (
          <span className="text-[10px] font-mono text-amber-500/80">Missing</span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-100 truncate" title={name}>
        {name}
        {external ? (
          <span className="text-[10px] text-cyan-400/90 font-normal ml-1.5">(External)</span>
        ) : null}
      </p>
      <p className="text-[10px] font-mono text-slate-500 truncate" title={entityRef}>
        {entityRef}
      </p>
    </div>
  );
}

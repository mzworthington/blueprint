import React from 'react';
import { Trash2 } from 'lucide-react';
import type { SystemDependency, SystemNode } from '@blueprint/core';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';

interface ConnectionsSectionProps {
  selectedNodeId: string;
  schemaNodes: SystemNode[];
  connections: BlueprintRFEdge[];
  onUpdateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => void;
  onDeleteDependency: (from: string, to: string) => void;
}

export const ConnectionsSection: React.FC<ConnectionsSectionProps> = ({
  selectedNodeId,
  schemaNodes,
  connections,
  onUpdateDependency,
  onDeleteDependency,
}) => (
  <div className="border-t border-slate-900 pt-4">
    <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider mb-3">
      Active Connections
    </h4>
    {connections.length > 0 ? (
      <div className="space-y-3">
        {connections.map(edge => {
          const isSource = edge.source === selectedNodeId;
          const partnerId = isSource ? edge.target : edge.source;
          const partnerNode = schemaNodes.find(n => n.entityRef === partnerId);

          return (
            <div
              key={edge.id}
              className="bg-slate-950/40 rounded-xl p-2.5 border border-slate-900 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 font-sans">
                  {isSource ? '➔ Output to' : '📥 Input from'}{' '}
                  <span className="text-brand-400">{partnerNode?.name || partnerId}</span>
                </span>
                <button
                  onClick={() => onDeleteDependency(edge.source, edge.target)}
                  className="text-slate-500 hover:text-red-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={edge.data?.type || 'direct-call'}
                    onChange={e =>
                      onUpdateDependency(edge.source, edge.target, {
                        type: e.target.value as SystemDependency['type'],
                      })
                    }
                    className="flex-1 bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded px-1.5 py-1 text-[10px] font-mono text-slate-200 focus:outline-none transition duration-200"
                  >
                    <option value="direct-call">Direct Call</option>
                    <option value="publish-subscribe">Pub/Sub (Async)</option>
                    <option value="read-write">Read/Write</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Add description (e.g. JSON/HTTPS)"
                  value={edge.data?.description || ''}
                  onChange={e =>
                    onUpdateDependency(edge.source, edge.target, {
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-brand-500 rounded px-2 py-1 text-[10px] font-mono text-slate-200 focus:outline-none transition duration-200 focus:shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-xs text-slate-500 italic">No connections established.</p>
    )}
  </div>
);

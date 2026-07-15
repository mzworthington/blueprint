import React from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import type { SchemaDiff } from '../../../../../infrastructure/db/db';

interface DiffNodesSectionProps {
  diff: SchemaDiff;
}

export const DiffNodesSection: React.FC<DiffNodesSectionProps> = ({ diff }) => {
  if (
    diff.nodes.added.length === 0 &&
    diff.nodes.modified.length === 0 &&
    diff.nodes.deleted.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
        <span className="w-1 h-1 bg-brand-500 rounded-full inline-block"></span>
        Component Operations
      </h3>
      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
        {diff.nodes.added.map(node => (
          <div
            key={node.entityRef}
            className="flex items-center justify-between bg-emerald-950/10 border border-emerald-500/10 hover:border-emerald-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-200">{node.name}</span>
              <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                {node.entityRef}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider font-mono shrink-0">
              <Plus className="w-3 h-3" /> Added
            </span>
          </div>
        ))}

        {diff.nodes.modified.map(({ original, current }) => (
          <div
            key={current.entityRef}
            className="bg-amber-950/5 border border-amber-500/10 hover:border-amber-500/20 px-4 py-3.5 rounded-xl text-xs space-y-3 transition duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="font-semibold text-slate-200">{current.name}</span>
                <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {current.entityRef}
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 uppercase tracking-wider font-mono shrink-0">
                <Edit className="w-3 h-3" /> Modified
              </span>
            </div>

            <div className="pl-3.5 border-l-2 border-amber-500/35 space-y-2 text-[11px] font-mono text-slate-400 bg-[#040914] p-3 rounded-lg border border-slate-900">
              {original.name !== current.name && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500 font-semibold">Name:</span>
                  <span className="text-rose-400/80 line-through">{original.name}</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="text-emerald-400 font-semibold">{current.name}</span>
                </div>
              )}
              {original.type !== current.type && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500 font-semibold">Type:</span>
                  <span className="text-rose-400/80 line-through">{original.type}</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="text-emerald-400 font-semibold">{current.type}</span>
                </div>
              )}
              {(original.x !== current.x || original.y !== current.y) && (
                <div className="flex flex-wrap gap-x-2">
                  <span className="text-slate-500 font-semibold">Position:</span>
                  <span className="text-rose-400/80 line-through">
                    ({original.x ?? 0}, {original.y ?? 0})
                  </span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="text-emerald-400 font-semibold">
                    ({current.x ?? 0}, {current.y ?? 0})
                  </span>
                </div>
              )}
              {JSON.stringify(original.properties) !== JSON.stringify(current.properties) && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block mb-1">Property updates:</span>
                  {Object.keys({
                    ...original.properties,
                    ...current.properties,
                  }).map(k => {
                    const origVal = original.properties?.[k];
                    const currVal = current.properties?.[k];
                    if (origVal !== currVal) {
                      return (
                        <div
                          key={k}
                          className="pl-3 border-l border-slate-800 flex flex-wrap gap-x-1.5"
                        >
                          <span className="text-slate-500">{k}:</span>
                          {origVal !== undefined ? (
                            <span className="text-rose-450 line-through">
                              {JSON.stringify(origVal)}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">[unset]</span>
                          )}
                          <span className="text-slate-500">&rarr;</span>
                          <span className="text-emerald-400 font-semibold">
                            {currVal !== undefined ? JSON.stringify(currVal) : '[deleted]'}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {diff.nodes.deleted.map(node => (
          <div
            key={node.entityRef}
            className="flex items-center justify-between bg-rose-950/5 border border-rose-500/10 hover:border-rose-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-350">{node.name}</span>
              <span className="block text-[10px] text-slate-550 font-mono mt-0.5 truncate">
                {node.entityRef}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-wider font-mono shrink-0">
              <Trash2 className="w-3 h-3" /> Deleted
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

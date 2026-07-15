import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SchemaDiff } from '../../../../../infrastructure/db/db';

interface DiffDepsSectionProps {
  diff: SchemaDiff;
}

export const DiffDepsSection: React.FC<DiffDepsSectionProps> = ({ diff }) => {
  if (diff.dependencies.added.length === 0 && diff.dependencies.deleted.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
        <span className="w-1 h-1 bg-brand-500 rounded-full inline-block"></span>
        Connection Operations
      </h3>
      <div className="space-y-2.5">
        {diff.dependencies.added.map(dep => (
          <div
            key={dep.id}
            className="flex items-center justify-between bg-emerald-955/10 border border-emerald-500/10 hover:border-emerald-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
          >
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <span
                className="font-mono text-[11px] text-slate-300 truncate max-w-[150px]"
                title={dep.fromRef.split('/').pop()}
              >
                {dep.fromRef.split('/').pop()}
              </span>
              <span className="text-slate-500 font-bold">&rarr;</span>
              <span
                className="font-mono text-[11px] text-slate-300 truncate max-w-[150px]"
                title={dep.toRef.split('/').pop()}
              >
                {dep.toRef.split('/').pop()}
              </span>
              {dep.type && (
                <span className="text-[9px] text-[#00f0ff] bg-[#00f0ff]/5 border border-[#00f0ff]/15 px-2 py-0.5 rounded-md ml-2 font-mono uppercase tracking-wider">
                  {dep.type}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider font-mono shrink-0">
              <Plus className="w-3 h-3" /> Added Conn
            </span>
          </div>
        ))}

        {diff.dependencies.deleted.map(dep => (
          <div
            key={dep.id}
            className="flex items-center justify-between bg-rose-955/5 border border-rose-500/10 hover:border-rose-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
          >
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[150px] line-through">
                {dep.fromRef.split('/').pop()}
              </span>
              <span className="text-slate-600 font-bold">&rarr;</span>
              <span className="font-mono text-[11px] text-slate-400 truncate max-w-[150px] line-through">
                {dep.toRef.split('/').pop()}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-wider font-mono shrink-0">
              <Trash2 className="w-3 h-3" /> Deleted Conn
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

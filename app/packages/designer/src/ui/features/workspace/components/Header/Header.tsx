import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { Searchbar } from '../Searchbar/Searchbar';

export const Header: React.FC = () => {
  const { schema, validationResult } = useBlueprintStore();

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-4 shrink-0 z-40 relative">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-850 px-2.5 py-1.5 rounded-xl shrink-0">
          <img src="/favicon.svg" className="w-4 h-4 shrink-0" alt="Blueprint Logo" />
          <span className="font-bold text-slate-100 tracking-wider text-[10px] uppercase font-mono hidden sm:inline">
            blueprint
          </span>
        </div>

        <div className="min-w-0">
          <Breadcrumbs />
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 border-l border-slate-850 pl-3">
          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
            {schema.level || 'Container'}
          </span>
          {validationResult.isValid ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-955/20 px-2 py-0.5 rounded border border-emerald-900/30">
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span>Valid</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-955/20 px-2 py-0.5 rounded border border-red-900/30 animate-pulse">
              <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
              <span>Cycle Detected</span>
            </span>
          )}
        </div>
      </div>
      <Searchbar />
    </header>
  );
};

import React from 'react';
import { CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { Searchbar } from '../Searchbar/Searchbar';

export const Header: React.FC = () => {
  const { schema, validationResult, workspaceManifest, loadedSystems } = useBlueprintStore();
  const [location, setLocation] = useLocation();

  const manifestOverviewEnabled = workspaceManifest?.overview?.enabled === true;
  const containerSystemCount = loadedSystems.filter(s => s.schema.level === 'container').length;
  const overviewEnabled = manifestOverviewEnabled || containerSystemCount >= 2;
  const isOnOverview = location === '/overview' || location === '/workspace' || location === '/';

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

        {overviewEnabled && (
          <button
            onClick={() => setLocation(isOnOverview ? '/workspace' : '/overview')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
              isOnOverview
                ? 'bg-brand-950/60 border-brand-500/40 text-brand-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-brand-500/40 hover:text-brand-300 hover:bg-brand-950/30'
            }`}
            title={isOnOverview ? 'Back to diagram' : 'System Overview'}
          >
            <Layers className="w-3 h-3" />
            <span>{isOnOverview ? 'Back' : 'Overview'}</span>
          </button>
        )}
      </div>
      <Searchbar />
    </header>
  );
};

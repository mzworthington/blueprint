import React from 'react';
import { Layers } from 'lucide-react';
import { OverviewCanvas } from './components/OverviewCanvas/OverviewCanvas';
import { useSystemOverview } from './hooks/useSystemOverview';

/**
 * SystemOverviewPage — displayed at the workspace root ("/workspace") when a workspace
 * with `overview.enabled: true` is open and no specific diagram slug is active.
 * Shows every container-level diagram as a navigable mini-canvas card.
 */
export const SystemOverviewPage: React.FC = () => {
  const { containerSystems, crossSystemEdges, overviewLabel, navigateToSystem, hasContent } =
    useSystemOverview();

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 selection:bg-brand-600/30">
      {/* Page header */}
      <header className="h-14 bg-slate-950 border-b border-slate-900 flex items-center gap-3 px-4 shrink-0 z-40">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-850 px-2.5 py-1.5 rounded-xl shrink-0">
          <img src="/favicon.svg" className="w-4 h-4 shrink-0" alt="Blueprint Logo" />
          <span className="font-bold text-slate-100 tracking-wider text-[10px] uppercase font-mono hidden sm:inline">
            blueprint
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-brand-400 shrink-0" />
          <h1 className="font-bold text-slate-100 text-sm truncate">{overviewLabel}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {hasContent && (
            <span className="px-2 py-0.5 rounded bg-brand-950/60 border border-brand-500/20 text-brand-400 text-[10px] font-semibold font-mono">
              {containerSystems.length} system{containerSystems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Overview canvas */}
      <OverviewCanvas
        systems={containerSystems}
        crossSystemEdges={crossSystemEdges}
        onSystemClick={navigateToSystem}
      />
    </div>
  );
};

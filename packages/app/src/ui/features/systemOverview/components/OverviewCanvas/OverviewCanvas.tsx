import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { SystemCard } from '../SystemCard/SystemCard';
import type { ContainerSystem, CrossSystemEdge } from '../../hooks/useSystemOverview';

interface OverviewCanvasProps {
  systems: ContainerSystem[];
  crossSystemEdges: CrossSystemEdge[];
  onSystemClick: (path: string) => void;
}

export const OverviewCanvas: React.FC<OverviewCanvasProps> = ({
  systems,
  crossSystemEdges,
  onSystemClick,
}) => {
  if (systems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
        <Layers className="w-12 h-12 opacity-30" />
        <div className="text-center">
          <p className="text-sm font-semibold">No container-level diagrams found</p>
          <p className="text-xs mt-1 opacity-70">
            Open a workspace that contains container-level blueprint schemas.
          </p>
        </div>
      </div>
    );
  }

  // Build a set of paths that have at least one outgoing cross-system dep
  const systemsWithOutboundDeps = new Set(crossSystemEdges.map(e => e.fromSystemPath));

  return (
    <div data-testid="overview-canvas" className="flex-1 overflow-y-auto p-6">
      {/* Cross-system dependency summary banner */}
      {crossSystemEdges.length > 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-brand-950/30 border border-brand-500/20 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0 animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-brand-300">
              {crossSystemEdges.length} cross-system{' '}
              {crossSystemEdges.length === 1 ? 'dependency' : 'dependencies'} detected
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
              {crossSystemEdges.map(edge => {
                const fromSys = systems.find(s => s.path === edge.fromSystemPath);
                const toSys = systems.find(s => s.path === edge.toSystemPath);
                return (
                  <span key={edge.id} className="text-[10px] text-slate-400 font-mono">
                    {fromSys?.name ?? edge.fromSystemPath}
                    <span className="text-brand-500 mx-1">→</span>
                    {toSys?.name ?? edge.toSystemPath}
                    {edge.description && (
                      <span className="text-slate-500 ml-1">({edge.description})</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Responsive grid of system cards */}
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, 380px), 1fr))`,
        }}
      >
        {systems.map(sys => (
          <ReactFlowProvider key={sys.path}>
            <SystemCard
              schema={sys.schema}
              name={sys.name}
              hasCrossSystemDeps={systemsWithOutboundDeps.has(sys.path)}
              onClick={() => onSystemClick(sys.path)}
            />
          </ReactFlowProvider>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import type { OwnershipBreakdown, RefactorBoundary } from '@blueprint/core';
import type { RankedOffender } from '../../../application/forensics/rankOffenders';

function signalChipClass(signal: string): string {
  switch (signal) {
    case 'hotspot':
      return 'bg-red-950/50 text-red-300 border-red-900/50';
    case 'knowledge-silo':
      return 'bg-amber-950/50 text-amber-300 border-amber-900/50';
    case 'cross-container':
      return 'bg-orange-950/50 text-orange-300 border-orange-900/50';
    case 'high-coupling':
      return 'bg-amber-950/40 text-amber-200 border-amber-800/40';
    default:
      return 'bg-violet-950/50 text-violet-300 border-violet-900/50';
  }
}

function concentrationLabel(concentration: OwnershipBreakdown['concentration']): string {
  switch (concentration) {
    case 'solo':
      return 'Solo ownership';
    case 'shared':
      return 'Shared ownership';
    default:
      return 'Distributed ownership';
  }
}

export interface RefactorPlanSlideOverProps {
  offender: RankedOffender;
  boundary: RefactorBoundary;
  ownership?: OwnershipBreakdown;
  onClose: () => void;
  onOpenCanvas: () => void;
}

export const RefactorPlanSlideOver: React.FC<RefactorPlanSlideOverProps> = ({
  offender,
  boundary,
  ownership,
  onClose,
  onOpenCanvas,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      data-testid="refactor-plan-slide-over"
      role="dialog"
      aria-modal="true"
      aria-label="Refactor plan"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close refactor plan"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full overflow-y-auto border-l border-[#00f0ff]/15 bg-[#040914] shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-[#00f0ff]/10 bg-[#040914]/95 backdrop-blur px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff]">
              Refactor plan
            </p>
            <h2 className="text-lg font-bold text-white truncate">{offender.name}</h2>
            <p className="text-xs text-slate-500 truncate">{offender.parentLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Summary
            </h3>
            <div className="rounded-xl border border-[#00f0ff]/10 bg-[#061125]/60 p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {boundary.signals.map(signal => (
                  <span
                    key={signal}
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${signalChipClass(signal)}`}
                  >
                    {signal.toUpperCase()}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-300">
                Aggregate refactor score:{' '}
                <span className="font-mono text-white">
                  {Math.round(boundary.aggregateRefactorScore)}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {boundary.members.length} member{boundary.members.length === 1 ? '' : 's'} in this
                boundary
                {boundary.spansContainers ? ' · spans containers' : ''}
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Why refactor
            </h3>
            <ul className="space-y-2">
              {boundary.rationale.map(reason => (
                <li
                  key={reason}
                  className="rounded-lg border border-slate-900 bg-slate-950/40 px-3 py-2 text-xs text-slate-300 leading-relaxed"
                >
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Boundary members
            </h3>
            <div className="space-y-2" data-testid="refactor-boundary-members">
              {boundary.members.map(member => (
                <div
                  key={member.entityRef}
                  className="rounded-lg border border-slate-900 bg-slate-950/40 px-3 py-2"
                >
                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                  <p className="font-mono text-[10px] text-slate-500 truncate">
                    {member.entityRef}
                  </p>
                  {member.filepath ? (
                    <p className="font-mono text-[10px] text-slate-600 truncate mt-1">
                      {member.filepath}
                    </p>
                  ) : null}
                  <p className="font-mono text-[10px] text-violet-300 mt-1">
                    score {Math.round(member.refactorScore)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {ownership ? (
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Ownership
              </h3>
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 space-y-3">
                <p className="text-xs text-slate-400">
                  {concentrationLabel(ownership.concentration)}
                </p>
                <div className="space-y-2" data-testid="ownership-breakdown">
                  {ownership.authors.map(author => (
                    <div key={author.email} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-slate-300 truncate">{author.email}</span>
                        <span className="text-slate-500 tabular-nums">
                          {Math.round(author.percent * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00f0ff]/70"
                          style={{ width: `${Math.round(author.percent * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenCanvas}
              className="w-full rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20 px-4 py-2.5 text-sm font-semibold transition-colors"
              data-testid="open-refactor-on-canvas"
            >
              Open on canvas
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 px-4 py-2 text-sm transition-colors"
            >
              Keep browsing rankings
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

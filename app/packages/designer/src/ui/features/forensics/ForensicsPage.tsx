import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { AppHeader } from '../../components/AppHeader';
import { useBlueprintStore } from '../../../application/store/store';
import {
  rankForensicsOffenders,
  resolveLookbackDays,
  type OffenderScope,
  type OffenderSignalFilter,
  type RankedOffender,
} from '../../../application/forensics/rankOffenders';
import type { ConcernLevel } from '../../../application/forensics/concern';
import { ForensicsSearchbar } from './ForensicsSearchbar';

function scoreBarColor(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-400';
    case 'warning':
      return 'bg-amber-400';
    case 'info':
      return 'bg-slate-400';
    default:
      return 'bg-[#00f0ff]/70';
  }
}

function rowBorder(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'border-red-900/40 hover:border-red-700/50';
    case 'warning':
      return 'border-amber-900/40 hover:border-amber-700/50';
    default:
      return 'border-[#00f0ff]/10 hover:border-[#00f0ff]/25';
  }
}

function formatScore(score: number): string {
  return score.toFixed(2);
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#00f0ff]/15 bg-[#040914]/80 p-0.5">
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-100 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function OffenderRow({
  offender,
  rank,
  filter,
  maxRefactorScore,
  onOpen,
}: {
  offender: RankedOffender;
  rank: number;
  filter: OffenderSignalFilter;
  maxRefactorScore: number;
  onOpen: (offender: RankedOffender) => void;
}) {
  const displayScore = filter === 'refactor' ? offender.refactorScore : offender.hotspotScore;
  const scoreLabel = filter === 'refactor' ? 'refactor' : 'score';
  const scoreMax = filter === 'refactor' ? Math.max(maxRefactorScore, 1) : 1;
  const scorePct = Math.max(0, Math.min(100, Math.round((displayScore / scoreMax) * 100)));
  const signals = [
    filter === 'refactor' ? 'REFACTOR' : null,
    offender.classifications.includes('hotspot') ? 'HOT' : null,
    offender.classifications.includes('knowledge-silo') ? 'SILO' : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => onOpen(offender)}
      className={`w-full text-left grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)] gap-3 items-center rounded-xl border bg-[#040914]/60 px-3 py-3 transition-colors ${rowBorder(offender.concern.level)}`}
      data-testid={`offender-row-${offender.entityRef}`}
    >
      <span className="font-mono text-xs text-slate-500 tabular-nums">#{rank}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{offender.name}</p>
        <p className="truncate font-mono text-[10px] text-slate-500">{offender.type}</p>
      </div>
      <p className="min-w-0 truncate text-xs text-slate-400">{offender.parentLabel}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-slate-500">{scoreLabel}</span>
          <span className="font-mono text-[10px] text-slate-300">
            {filter === 'refactor' ? Math.round(displayScore) : formatScore(displayScore)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
          <div
            className={`h-full rounded-full ${scoreBarColor(offender.concern.level)}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>
      <div className="min-w-0 flex flex-wrap items-center gap-1.5 justify-end">
        {signals.map(signal => (
          <span
            key={signal}
            className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${
              signal === 'HOT'
                ? 'bg-red-950/50 text-red-300 border-red-900/50'
                : signal === 'REFACTOR'
                  ? 'bg-violet-950/50 text-violet-300 border-violet-900/50'
                  : 'bg-amber-950/50 text-amber-300 border-amber-900/50'
            }`}
          >
            {signal}
          </span>
        ))}
        <span className="font-mono text-[10px] text-slate-500 truncate">
          {[
            offender.dependencyCount > 0 ? `deps ${offender.dependencyCount}` : null,
            offender.complexity != null ? `cx ${offender.complexity}` : null,
            offender.churn != null ? `churn ${offender.churn}` : null,
            offender.authorCount != null ? `authors ${offender.authorCount}` : null,
            offender.hotspotCount != null ? `hots ${offender.hotspotCount}` : null,
            offender.knowledgeSiloCount != null ? `silos ${offender.knowledgeSiloCount}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </button>
  );
}

export const ForensicsPage: React.FC = () => {
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const selectSystem = useBlueprintStore(s => s.selectSystem);
  const selectNode = useBlueprintStore(s => s.selectNode);
  const [, setLocation] = useLocation();
  const [scope, setScope] = useState<OffenderScope>('components');
  const [filter, setFilter] = useState<OffenderSignalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const ranked = useMemo(
    () => rankForensicsOffenders(loadedSystems, scope, filter),
    [loadedSystems, scope, filter]
  );

  const offenders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(
      o =>
        o.name.toLowerCase().includes(q) ||
        o.entityRef.toLowerCase().includes(q) ||
        o.parentLabel.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q)
    );
  }, [ranked, searchQuery]);

  const lookback = useMemo(() => resolveLookbackDays(ranked), [ranked]);
  const maxRefactorScore = useMemo(
    () => Math.max(...ranked.map(o => o.refactorScore), 0),
    [ranked]
  );

  const openOffender = (offender: RankedOffender) => {
    selectSystem(offender.schemaPath);
    selectNode(offender.entityRef);
    setLocation(`/workspace/${offender.diagramEntityRef}`);
  };

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-slate-100 pb-safe">
      <AppHeader
        sticky
        badge="FORENSICS"
        subtitle={
          lookback != null
            ? `Worst offenders · lookback ${lookback}d`
            : 'Worst offenders across loaded blueprints'
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <section className="relative overflow-hidden mb-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.08),transparent)]" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-3">
                Risk ranking
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
                Worst offenders
              </h1>
              <p className="mt-3 max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
                Components and containers ranked by hotspot score, refactor candidates, knowledge
                silos, and complexity — open any row on the canvas.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { id: 'components', label: 'Components' },
                { id: 'containers', label: 'Containers' },
              ]}
            />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'All' },
                { id: 'hotspots', label: 'Hotspots' },
                { id: 'silos', label: 'Silos' },
                { id: 'refactor', label: 'Refactor' },
              ]}
            />
            <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-3">
              <ForensicsSearchbar value={searchQuery} onChange={setSearchQuery} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
                {offenders.length} ranked
              </span>
            </div>
          </div>

          {offenders.length === 0 ? (
            <div className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 px-5 py-10 text-center">
              <p className="text-sm text-slate-300">
                {searchQuery.trim()
                  ? 'No offenders match this search.'
                  : 'No forensics offenders in this view.'}
              </p>
              <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery.trim()
                  ? 'Try another name, entity ref, parent, or type.'
                  : 'Open a workspace with CLI-enriched blueprints (`--git`), or clear Hotspots/Silos filters. Bundled app blueprints include sample hotspots when loaded.'}
              </p>
              {!searchQuery.trim() ? (
                <Link
                  href="/workspace"
                  className="inline-block mt-5 rounded-xl border border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/10 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Open workspace
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2" data-testid="offender-list">
              <div className="hidden md:grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)] gap-3 px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>#</span>
                <span>Name</span>
                <span>Parent</span>
                <span>Score</span>
                <span className="text-right">Signals</span>
              </div>
              {offenders.map((offender, index) => (
                <OffenderRow
                  key={offender.entityRef}
                  offender={offender}
                  rank={index + 1}
                  filter={filter}
                  maxRefactorScore={maxRefactorScore}
                  onOpen={openOffender}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { NodeForensics } from '@blueprint/core';
import {
  evaluateForensicsConcern,
  type ConcernLevel,
} from '../../../../../application/forensics/concern';

interface ForensicsSectionProps {
  forensics: NodeForensics;
  showCoupling?: boolean;
  onToggleShowCoupling?: () => void;
  /** How many coupled files resolve to nodes on the current canvas. */
  linkedCouplingCount?: number;
}

function concernBadgeClasses(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-950/40 text-red-300 border-red-900/50';
    case 'warning':
      return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
    case 'info':
      return 'bg-slate-900 text-slate-300 border-slate-700';
    default:
      return 'bg-slate-950/40 text-slate-400 border-slate-800';
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'warning' | 'none';
}) {
  const valueClass =
    tone === 'danger' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : 'text-slate-300';

  return (
    <div className="flex items-start justify-between gap-2 bg-slate-950/40 rounded-xl px-3 py-1.5 border border-slate-900">
      <span className="font-mono text-brand-400/80 text-xs shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right break-all ${valueClass}`}>{value}</span>
    </div>
  );
}

export const ForensicsSection: React.FC<ForensicsSectionProps> = ({
  forensics,
  showCoupling = false,
  onToggleShowCoupling,
  linkedCouplingCount = 0,
}) => {
  const concern = evaluateForensicsConcern(forensics);
  const badgeLabel =
    concern.reasons[0] ??
    (concern.level === 'none' ? 'Healthy' : concern.level === 'info' ? 'Mild' : 'Concern');

  const rows: Array<{ label: string; value: string; tone?: 'danger' | 'warning' | 'none' }> = [];

  if (forensics.complexity !== undefined) {
    rows.push({
      label: 'complexity',
      value: String(forensics.complexity),
      tone:
        (forensics.complexity ?? 0) >= 10 && forensics.authorCount === 1
          ? 'warning'
          : (forensics.complexity ?? 0) >= 10
            ? 'warning'
            : 'none',
    });
  }
  if (forensics.loc !== undefined) {
    rows.push({ label: 'loc', value: String(forensics.loc) });
  }
  if (forensics.sloc !== undefined) {
    rows.push({ label: 'sloc', value: String(forensics.sloc) });
  }
  if (forensics.churn !== undefined) {
    rows.push({ label: 'churn', value: String(forensics.churn) });
  }
  if (forensics.authorCount !== undefined) {
    rows.push({
      label: 'authors',
      value: String(forensics.authorCount),
      tone: forensics.authorCount === 1 && (forensics.complexity ?? 0) >= 10 ? 'warning' : 'none',
    });
  }
  if (forensics.topAuthorPercent !== undefined) {
    rows.push({ label: 'ownership', value: formatPercent(forensics.topAuthorPercent) });
  }
  if (forensics.hotspotScore !== undefined) {
    rows.push({
      label: 'hotspotScore',
      value: forensics.hotspotScore.toFixed(2),
      tone: forensics.hotspotScore >= 0.5 ? 'danger' : 'none',
    });
  }
  if (forensics.fileCount !== undefined) {
    rows.push({ label: 'fileCount', value: String(forensics.fileCount) });
  }
  if (forensics.hotspotCount !== undefined) {
    rows.push({
      label: 'hotspotCount',
      value: String(forensics.hotspotCount),
      tone: forensics.hotspotCount > 0 ? 'danger' : 'none',
    });
  }
  if (forensics.knowledgeSiloCount !== undefined) {
    rows.push({
      label: 'siloCount',
      value: String(forensics.knowledgeSiloCount),
      tone: forensics.knowledgeSiloCount > 0 ? 'warning' : 'none',
    });
  }

  const coupled = (forensics.coupledFiles ?? []).slice(0, 5);

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="forensics-section">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider">
          Git forensics
        </h4>
        <span
          data-testid="forensics-concern-badge"
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${concernBadgeClasses(concern.level)}`}
        >
          {badgeLabel}
        </span>
      </div>

      {concern.reasons.length > 1 && (
        <p className="text-[10px] font-mono text-slate-400 mb-2">{concern.reasons.join(' · ')}</p>
      )}

      <div className="space-y-2 mb-3">
        {rows.map(row => (
          <MetricRow key={row.label} label={row.label} value={row.value} tone={row.tone} />
        ))}
      </div>

      {coupled.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              Coupled files
            </p>
            {onToggleShowCoupling && (
              <button
                type="button"
                data-testid="toggle-show-coupling"
                aria-pressed={showCoupling}
                onClick={onToggleShowCoupling}
                disabled={linkedCouplingCount === 0}
                title={
                  linkedCouplingCount === 0
                    ? 'No coupled peers on this diagram'
                    : showCoupling
                      ? 'Hide coupling on canvas'
                      : 'Show coupling on canvas'
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                  showCoupling ? 'bg-amber-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showCoupling ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>
          {onToggleShowCoupling && (
            <p className="text-[10px] text-slate-500">
              {linkedCouplingCount === 0
                ? 'Coupled peers are not on this diagram'
                : showCoupling
                  ? `Showing ${linkedCouplingCount} coupling link${linkedCouplingCount === 1 ? '' : 's'} on canvas`
                  : `Show ${linkedCouplingCount} coupling link${linkedCouplingCount === 1 ? '' : 's'} on canvas`}
            </p>
          )}
          {coupled.map(c => (
            <div
              key={c.path}
              className="text-[11px] font-mono text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1 border border-slate-900 truncate"
              title={`${c.path} (${c.score.toFixed(2)}, ${c.sharedCommits} shared)`}
            >
              {c.path}{' '}
              <span className="text-slate-500">
                {c.score.toFixed(2)} · {c.sharedCommits}
              </span>
            </div>
          ))}
          {(forensics.coupledFiles?.length ?? 0) > 5 && (
            <p className="text-[10px] text-slate-500 italic">
              +{(forensics.coupledFiles?.length ?? 0) - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import type { NodeForensics } from '@blueprint/core';
import type { ForensicsTrendDashboard } from '../../../../../application/forensics/buildForensicsTrendDashboard';
import {
  evaluateForensicsConcern,
  type ConcernLevel,
} from '../../../../../application/forensics/concern';
import { CouplingMiniGraph } from './CouplingMiniGraph';
import { ForensicsTrendPanel } from './ForensicsTrendPanel';

interface ForensicsSectionProps {
  forensics: NodeForensics;
  trendDashboard?: ForensicsTrendDashboard;
  centerLabel?: string;
  linkedCouplingPaths?: ReadonlySet<string>;
  showCoupling?: boolean;
  onToggleShowCoupling?: () => void;
  /** How many coupled files resolve to nodes on the current canvas. */
  linkedCouplingCount?: number;
}

/** User-facing explanations for each forensics metric key. */
const FORENSICS_METRIC_HELP: Record<string, string> = {
  complexity: 'Cyclomatic complexity from the AST — higher means more branching and harder review.',
  loc: 'Total lines of code in the file, including blanks and comments.',
  sloc: 'Source lines of code — non-blank, non-comment lines.',
  churn: 'How many times this file changed in the git lookback window.',
  churnTrend: 'Weekly commit count over the lookback window (oldest week on the left).',
  authors: 'Distinct git authors who edited this file in the lookback window.',
  ownership: 'Share of recent commits by the top author — high means concentrated ownership.',
  hotspotScore:
    'Relative risk from complexity × churn (0–1 across the analyzed set). Higher needs attention.',
  lookback: 'Git history window used when these metrics were collected (from CLI --git-since).',
  fileCount: 'Number of source files rolled up into this container or system.',
  hotspotCount: 'How many files under this node are classified as hotspots.',
  siloCount: 'How many files under this node look like knowledge silos (complex, single author).',
};

const COUPLED_FILES_HELP =
  'Files that often change in the same commits (temporal coupling). Score is Jaccard similarity of commit sets. Enabling focus hides other nodes and schema links.';

const SECTION_HELP =
  'Readonly signals from AST complexity and recent git history. Used to spot hotspots, silos, and change coupling.';

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
  help,
  tone,
}: {
  label: string;
  value: string;
  help?: string;
  tone?: 'danger' | 'warning' | 'none';
}) {
  const valueClass =
    tone === 'danger' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : 'text-slate-300';

  return (
    <div
      className="bg-slate-950/40 rounded-xl px-3 py-2 border border-slate-900"
      data-testid={`forensics-metric-${label}`}
      title={help}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-brand-400/80 text-xs shrink-0">{label}</span>
        <span className={`text-xs font-semibold text-right break-all ${valueClass}`}>{value}</span>
      </div>
      {help && (
        <p
          className="mt-1 text-[10px] leading-snug text-slate-500"
          data-testid={`forensics-help-${label}`}
        >
          {help}
        </p>
      )}
    </div>
  );
}

export const ForensicsSection: React.FC<ForensicsSectionProps> = ({
  forensics,
  trendDashboard,
  centerLabel = 'this',
  linkedCouplingPaths,
  showCoupling = false,
  onToggleShowCoupling,
  linkedCouplingCount = 0,
}) => {
  const concern = evaluateForensicsConcern(forensics);
  const badgeLabel =
    concern.reasons[0] ??
    (concern.level === 'none' ? 'Healthy' : concern.level === 'info' ? 'Mild' : 'Concern');

  const rows: Array<{
    label: string;
    value: string;
    help?: string;
    tone?: 'danger' | 'warning' | 'none';
  }> = [];

  if (forensics.sinceDays !== undefined) {
    rows.push({
      label: 'lookback',
      value: `${forensics.sinceDays}d`,
      help: FORENSICS_METRIC_HELP.lookback,
    });
  }
  if (forensics.complexity !== undefined) {
    rows.push({
      label: 'complexity',
      value: String(forensics.complexity),
      help: FORENSICS_METRIC_HELP.complexity,
      tone:
        (forensics.complexity ?? 0) >= 10 && forensics.authorCount === 1
          ? 'warning'
          : (forensics.complexity ?? 0) >= 10
            ? 'warning'
            : 'none',
    });
  }
  if (forensics.loc !== undefined) {
    rows.push({
      label: 'loc',
      value: String(forensics.loc),
      help: FORENSICS_METRIC_HELP.loc,
    });
  }
  if (forensics.sloc !== undefined) {
    rows.push({
      label: 'sloc',
      value: String(forensics.sloc),
      help: FORENSICS_METRIC_HELP.sloc,
    });
  }
  if (forensics.churn !== undefined) {
    rows.push({
      label: 'churn',
      value: String(forensics.churn),
      help: FORENSICS_METRIC_HELP.churn,
    });
  }
  if (forensics.churnByWeek && forensics.churnByWeek.length > 0) {
    rows.push({
      label: 'churnTrend',
      value: `${forensics.churnByWeek.reduce((sum, n) => sum + n, 0)} commits`,
      help: FORENSICS_METRIC_HELP.churnTrend,
    });
  }
  if (forensics.authorCount !== undefined) {
    rows.push({
      label: 'authors',
      value: String(forensics.authorCount),
      help: FORENSICS_METRIC_HELP.authors,
      tone: forensics.authorCount === 1 && (forensics.complexity ?? 0) >= 10 ? 'warning' : 'none',
    });
  }
  if (forensics.topAuthorPercent !== undefined) {
    rows.push({
      label: 'ownership',
      value: formatPercent(forensics.topAuthorPercent),
      help: FORENSICS_METRIC_HELP.ownership,
    });
  }
  if (forensics.hotspotScore !== undefined) {
    rows.push({
      label: 'hotspotScore',
      value: forensics.hotspotScore.toFixed(2),
      help: FORENSICS_METRIC_HELP.hotspotScore,
      tone: forensics.hotspotScore >= 0.5 ? 'danger' : 'none',
    });
  }
  if (forensics.fileCount !== undefined) {
    rows.push({
      label: 'fileCount',
      value: String(forensics.fileCount),
      help: FORENSICS_METRIC_HELP.fileCount,
    });
  }
  if (forensics.hotspotCount !== undefined) {
    rows.push({
      label: 'hotspotCount',
      value: String(forensics.hotspotCount),
      help: FORENSICS_METRIC_HELP.hotspotCount,
      tone: forensics.hotspotCount > 0 ? 'danger' : 'none',
    });
  }
  if (forensics.knowledgeSiloCount !== undefined) {
    rows.push({
      label: 'siloCount',
      value: String(forensics.knowledgeSiloCount),
      help: FORENSICS_METRIC_HELP.siloCount,
      tone: forensics.knowledgeSiloCount > 0 ? 'warning' : 'none',
    });
  }

  const coupled = (forensics.coupledFiles ?? []).slice(0, 5);

  return (
    <div className="border-t border-slate-900 pt-4" data-testid="forensics-section">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider">
          Forensics
        </h4>
        <span
          data-testid="forensics-concern-badge"
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${concernBadgeClasses(concern.level)}`}
        >
          {badgeLabel}
        </span>
      </div>

      <p
        className="text-[10px] leading-snug text-slate-500 mb-3"
        data-testid="forensics-section-help"
      >
        {SECTION_HELP}
      </p>

      {concern.reasons.length > 1 && (
        <p className="text-[10px] font-mono text-slate-400 mb-2">{concern.reasons.join(' · ')}</p>
      )}

      {trendDashboard ? <ForensicsTrendPanel dashboard={trendDashboard} /> : null}

      <div className="space-y-2 mb-3">
        {rows.map(row => (
          <MetricRow
            key={row.label}
            label={row.label}
            value={row.value}
            help={row.help}
            tone={row.tone}
          />
        ))}
      </div>

      {coupled.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
            Coupling graph
          </p>
          <CouplingMiniGraph
            centerLabel={centerLabel}
            coupled={forensics.coupledFiles ?? []}
            linkedPaths={linkedCouplingPaths}
          />
        </div>
      )}

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
                      ? 'Show full diagram again'
                      : 'Focus canvas on this node and coupled peers'
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
          <p
            className="text-[10px] leading-snug text-slate-500"
            data-testid="forensics-help-coupled"
          >
            {COUPLED_FILES_HELP}
          </p>
          {onToggleShowCoupling && (
            <p className="text-[10px] text-slate-500">
              {linkedCouplingCount === 0
                ? 'Coupled peers are not on this diagram'
                : showCoupling
                  ? `Focusing ${linkedCouplingCount} coupled peer${linkedCouplingCount === 1 ? '' : 's'} — other nodes and links are hidden`
                  : `Focus ${linkedCouplingCount} coupled peer${linkedCouplingCount === 1 ? '' : 's'} (hides other nodes and links)`}
            </p>
          )}
          {coupled.map(c => (
            <div
              key={c.path}
              className="text-[11px] font-mono text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1 border border-slate-900 truncate"
              title={`${c.path} — coupling score ${c.score.toFixed(2)}, ${c.sharedCommits} shared commits`}
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

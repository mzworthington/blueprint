import React from 'react';
import type { ConflictResolution, ImportMergePlan } from '@blueprint/core';

const RESOLUTION_OPTIONS: Array<{ value: ConflictResolution; label: string }> = [
  { value: 'skip', label: 'Keep existing' },
  { value: 'rename', label: 'Rename import' },
  { value: 'overwrite', label: 'Overwrite' },
];

interface ImportMergePreviewProps {
  mergePlan: ImportMergePlan;
  resolutions: Record<string, ConflictResolution>;
  onResolutionChange: (entityRef: string, resolution: ConflictResolution) => void;
  footerNote: string;
}

export const ImportMergePreview: React.FC<ImportMergePreviewProps> = ({
  mergePlan,
  resolutions,
  onResolutionChange,
  footerNote,
}) => (
  <div className="space-y-3">
    <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
      Merge preview (into active diagram)
    </p>

    {mergePlan.additions.nodes.length > 0 && (
      <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
        <p className="text-[10px] font-mono text-emerald-400 mb-2">
          Additions ({mergePlan.additions.nodes.length} nodes,{' '}
          {mergePlan.additions.dependencies.length} edges)
        </p>
        <ul className="text-xs text-slate-300 space-y-1">
          {mergePlan.additions.nodes.map(n => (
            <li key={n.entityRef} className="font-mono">
              + {n.name} <span className="text-slate-500">({n.entityRef})</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {mergePlan.conflicts.length > 0 && (
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 space-y-2">
        <p className="text-[10px] font-mono text-amber-400">
          Conflicts ({mergePlan.conflicts.length})
        </p>
        {mergePlan.conflicts.map(c => (
          <div
            key={c.entityRef}
            className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs border-t border-amber-900/20 pt-2 first:border-0 first:pt-0"
          >
            <div className="flex-1 min-w-0">
              <span className="font-mono text-slate-200">{c.entityRef}</span>
              <span className="text-slate-500 mx-1">·</span>
              <span className="text-slate-400">
                existing: {c.existing.name} → import: {c.imported.name}
              </span>
            </div>
            <select
              value={resolutions[c.entityRef] ?? 'skip'}
              onChange={e => onResolutionChange(c.entityRef, e.target.value as ConflictResolution)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              {RESOLUTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )}

    {mergePlan.skippedEdges.length > 0 && (
      <div
        className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3"
        data-testid="import-skipped-edges"
      >
        <p className="text-[10px] font-mono text-slate-400 mb-2">
          Skipped edges ({mergePlan.skippedEdges.length})
        </p>
        <p className="text-[11px] text-slate-500 mb-2">
          These edges reference unresolved or conflicted nodes and will not be imported until
          conflicts are resolved (overwrite/rename) or endpoints exist.
        </p>
        <ul className="text-xs text-slate-400 space-y-1 font-mono">
          {mergePlan.skippedEdges.map((d, i) => (
            <li key={`${d.from}-${d.to}-${i}`}>
              {d.from} → {d.to}
              {d.type ? ` (${d.type})` : ''}
            </li>
          ))}
        </ul>
      </div>
    )}

    {mergePlan.additions.nodes.length === 0 &&
      mergePlan.conflicts.length === 0 &&
      mergePlan.skippedEdges.length === 0 && (
        <p className="text-xs text-slate-500 italic">
          No new nodes or conflicts — diagram content already matches the active schema.
        </p>
      )}

    <p className="text-[10px] text-slate-600">{footerNote}</p>
  </div>
);

import React, { Suspense, lazy } from 'react';
import { FileUp, GitMerge, X } from 'lucide-react';
import { extractMermaidFromMarkdown, type ConflictResolution } from '@blueprint/core';
import { useImportMermaidDialog } from './useImportMermaidDialog';

const MermaidPreview = lazy(() =>
  import('../../../../components/MermaidPreview/MermaidPreview').then(m => ({
    default: m.MermaidPreview,
  }))
);

interface ImportMermaidDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESOLUTION_OPTIONS: Array<{ value: ConflictResolution; label: string }> = [
  { value: 'skip', label: 'Keep existing' },
  { value: 'rename', label: 'Rename import' },
  { value: 'overwrite', label: 'Overwrite' },
];

export const ImportMermaidDialog: React.FC<ImportMermaidDialogProps> = ({ isOpen, onClose }) => {
  const {
    mermaidText,
    setMermaidText,
    parseError,
    preview,
    formatLabel,
    resolutions,
    setConflictResolution,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
  } = useImportMermaidDialog(isOpen, onClose);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-mermaid-title"
    >
      <div
        className={`fixed inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-[#00f0ff]" />
              <h2
                id="import-mermaid-title"
                className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs"
              >
                Import Mermaid
              </h2>
              {formatLabel && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-600/20 text-brand-400 border border-brand-500/30">
                  {formatLabel}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
                  Mermaid source
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  Upload .mmd / .md
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mmd,.md,.txt,text/plain,text/markdown"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <textarea
                value={mermaidText}
                onChange={e => setMermaidText(e.target.value)}
                placeholder={`Paste Mermaid diagram (flowchart or C4)...\n\ngraph TD\n  A["Service"] --> B[("DB")]`}
                className="w-full h-36 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40 resize-y"
                spellCheck={false}
              />
            </div>

            {parseError && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                {parseError}
              </div>
            )}

            {preview && mermaidText.trim() && (
              <>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Preview</p>
                  <Suspense
                    fallback={
                      <div className="text-xs text-slate-500 py-8 text-center">
                        Loading preview…
                      </div>
                    }
                  >
                    <MermaidPreview code={extractMermaidFromMarkdown(mermaidText)} />
                  </Suspense>
                </div>

                {preview.parseResult.warnings.length > 0 && (
                  <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-amber-300">Warnings</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {preview.parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                    Merge preview (into active diagram)
                  </p>

                  {preview.mergePlan.additions.nodes.length > 0 && (
                    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                      <p className="text-[10px] font-mono text-emerald-400 mb-2">
                        Additions ({preview.mergePlan.additions.nodes.length} nodes,{' '}
                        {preview.mergePlan.additions.dependencies.length} edges)
                      </p>
                      <ul className="text-xs text-slate-300 space-y-1">
                        {preview.mergePlan.additions.nodes.map(n => (
                          <li key={n.entityRef} className="font-mono">
                            + {n.name} <span className="text-slate-500">({n.entityRef})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.mergePlan.conflicts.length > 0 && (
                    <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 space-y-2">
                      <p className="text-[10px] font-mono text-amber-400">
                        Conflicts ({preview.mergePlan.conflicts.length})
                      </p>
                      {preview.mergePlan.conflicts.map(c => (
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
                            onChange={e =>
                              setConflictResolution(
                                c.entityRef,
                                e.target.value as ConflictResolution
                              )
                            }
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

                  {preview.mergePlan.additions.nodes.length === 0 &&
                    preview.mergePlan.conflicts.length === 0 && (
                      <p className="text-xs text-slate-500 italic">
                        No new nodes or conflicts — diagram content already matches the active
                        schema.
                      </p>
                    )}

                  <p className="text-[10px] text-slate-600">
                    Import is lossy: forensics, properties, and styling are not preserved. Changes
                    stay in your draft until you commit via Pending Changes.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-slate-800 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply || applying}
              className="px-4 py-2 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {applying ? 'Applying…' : 'Merge into diagram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

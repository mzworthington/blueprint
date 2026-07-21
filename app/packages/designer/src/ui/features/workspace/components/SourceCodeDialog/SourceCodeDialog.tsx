import React from 'react';
import { Code2, ExternalLink, RefreshCw, X } from 'lucide-react';
import type { SourceProvenance } from '@blueprint/core';
import { useSourceCodeDialog } from './useSourceCodeDialog';

interface SourceCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filepath?: string;
  source?: SourceProvenance;
  isWorkspaceOpen: boolean;
  readLocalFile?: (relativePath: string) => Promise<string>;
}

export const SourceCodeDialog: React.FC<SourceCodeDialogProps> = ({
  isOpen,
  onClose,
  filepath,
  source,
  isWorkspaceOpen,
  readLocalFile,
}) => {
  const { result, loading, reload } = useSourceCodeDialog({
    isOpen,
    filepath,
    source,
    isWorkspaceOpen,
    readLocalFile,
  });

  if (!isOpen) return null;

  const viewerUrl =
    result && !result.ok ? result.viewerUrl : result?.ok ? result.viewerUrl : undefined;
  const displayPath =
    result?.ok && 'filepath' in result
      ? result.filepath
      : filepath?.replace(/\\/g, '/').replace(/^\.\//, '');

  return (
    <div
      className="fixed inset-0 z-[110]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-code-dialog-title"
      data-testid="source-code-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl h-[min(90vh,860px)] flex flex-col"
          onWheel={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2 min-w-0">
              <Code2 className="w-4 h-4 text-[#00f0ff] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h2 id="source-code-dialog-title" className="text-base font-bold text-white">
                  Source code
                </h2>
                {displayPath ? (
                  <p className="text-xs text-slate-500 mt-0.5 font-mono break-all">{displayPath}</p>
                ) : null}
                {result?.ok ? (
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                    Loaded from {result.origin === 'local' ? 'workspace folder' : 'git raw URL'}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void reload()}
                disabled={loading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer disabled:opacity-50"
                aria-label="Reload source"
                title="Reload"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {viewerUrl ? (
                <a
                  href={viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-[#00f0ff] hover:bg-slate-900 transition"
                  aria-label="Open in repository browser"
                  title="Open in browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                aria-label="Close source code dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4 pt-0 min-h-0 flex flex-col gap-2">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-500 font-mono">
                Loading source…
              </div>
            ) : result && !result.ok ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
                <p className="text-sm text-red-400">{result.error}</p>
                {viewerUrl ? (
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#00f0ff] hover:text-cyan-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in repository browser
                  </a>
                ) : null}
              </div>
            ) : result?.ok ? (
              <pre
                className="flex-1 min-h-0 overflow-auto overscroll-contain bg-[#040914]/60 border border-[#00f0ff]/10 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre"
                data-testid="source-code-content"
                tabIndex={0}
                aria-label="Source code content"
              >
                <code>{result.content}</code>
              </pre>
            ) : null}

            {result?.ok ? (
              <p className="text-[10px] text-slate-500 text-center shrink-0">
                Scroll with trackpad or mouse wheel inside the code panel. Use{' '}
                <kbd className="font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded px-1">
                  ↑
                </kbd>{' '}
                <kbd className="font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded px-1">
                  ↓
                </kbd>{' '}
                when the panel is focused.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

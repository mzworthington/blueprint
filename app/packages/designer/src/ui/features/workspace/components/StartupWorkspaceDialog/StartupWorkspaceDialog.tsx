import React from 'react';
import { Box, FolderOpen, GitMerge } from 'lucide-react';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onLoadSandbox: () => void;
  onOpenDirectory: () => void;
  onImportMermaid: () => void;
}

const optionClass =
  'w-full flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-left transition hover:border-[#00f0ff]/35 hover:bg-slate-900/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f0ff]/40';

/**
 * First-run gate for `/workspace`: choose sandbox, a local folder, or Mermaid import.
 */
export const StartupWorkspaceDialog: React.FC<StartupWorkspaceDialogProps> = ({
  isOpen,
  onLoadSandbox,
  onOpenDirectory,
  onImportMermaid,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-workspace-title"
      data-testid="startup-workspace-dialog"
    >
      <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-5 border-b border-slate-800">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-2">
              Workspace
            </p>
            <h2
              id="startup-workspace-title"
              className="text-lg font-bold text-white tracking-tight"
            >
              Open workspace
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Start with the bundled sandbox, open a local blueprint folder, or import a Mermaid
              diagram into the active canvas.
            </p>
          </div>

          <div className="p-4 space-y-2.5">
            <button
              type="button"
              data-testid="startup-load-sandbox"
              onClick={onLoadSandbox}
              className={optionClass}
            >
              <Box className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">Load sandbox</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Explore the bundled Blueprint demo diagrams
                </span>
              </span>
            </button>

            <button
              type="button"
              data-testid="startup-open-directory"
              onClick={onOpenDirectory}
              className={optionClass}
            >
              <FolderOpen className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  Open workspace from directory
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Pick a local folder of YAML blueprints
                </span>
              </span>
            </button>

            <button
              type="button"
              data-testid="startup-import-mermaid"
              onClick={onImportMermaid}
              className={optionClass}
            >
              <GitMerge className="w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  Import Mermaid diagram
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Start from a blank canvas, then paste or upload Mermaid
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

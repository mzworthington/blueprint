import React from 'react';
import {
  Box,
  Cloud,
  FolderOpen,
  GitMerge,
  Terminal,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { CLI_RELEASES_URL, CLI_SCAN_COMMAND } from '../../../../../constants/cli';

interface StartupWorkspaceDialogProps {
  isOpen: boolean;
  onLoadSandbox: () => void;
  onOpenDirectory: () => void;
  onImportMermaid: () => void;
  onImportIac: () => void;
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
  onImportIac,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(CLI_SCAN_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some contexts
    }
  };

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

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        <div className="pointer-events-auto w-full max-w-lg my-auto bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
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
              Start with the bundled sandbox, open a local blueprint folder, or import Mermaid or
              infrastructure (Terraform / Pulumi) into the active canvas.
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

            <button
              type="button"
              data-testid="startup-import-iac"
              onClick={onImportIac}
              className={optionClass}
            >
              <Cloud className="w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5" />
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  Import infrastructure
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Terraform or Pulumi — paste or upload IaC files
                </span>
              </span>
            </button>
          </div>

          <div
            className="mx-4 mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            data-testid="startup-cli-scan"
          >
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-slate-100">Scan with CLI</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generate diagrams from your codebase, then open the output folder here. A future
                  watch-folder mode may automate this step.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#040914] px-3 py-2">
                  <code className="flex-1 min-w-0 text-[11px] font-mono text-emerald-300 truncate">
                    {CLI_SCAN_COMMAND}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopyCommand()}
                    className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
                    aria-label="Copy CLI command"
                    title="Copy command"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <a
                  href={CLI_RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00f0ff] hover:text-cyan-300 transition"
                  data-testid="startup-cli-download"
                >
                  Download CLI
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

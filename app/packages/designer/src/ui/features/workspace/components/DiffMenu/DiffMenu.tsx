import React from 'react';
import { GitCompare, Check } from 'lucide-react';
import { useDiffMenu } from './useDiffMenu';
import { DiffNodesSection } from './DiffNodesSection';
import { DiffDepsSection } from './DiffDepsSection';

interface DiffMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiffMenu: React.FC<DiffMenuProps> = ({ isOpen, onClose }) => {
  const { diff, loading, hasChanges, handleRevert, handleCommit } = useDiffMenu(isOpen, onClose);

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none ${isOpen ? 'visible' : 'invisible transition-all delay-300'}`}
    >
      <div
        className={`fixed inset-0 bg-[#020617]/80 backdrop-blur-sm transition-all duration-300 ease-in-out cursor-pointer ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
          <div className="pointer-events-auto w-screen max-w-2xl">
            <div
              className={`flex h-full flex-col bg-slate-950/80 glass-panel backdrop-blur-md border-l border-slate-900 shadow-2xl transition-all duration-300 ease-in-out transform ${
                isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}
            >
              <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-950/40 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-[#00f0ff] filter drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" />
                  <h2 className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs">
                    Pending Draft Changes
                  </h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">
                      Computing differences...
                    </span>
                  </div>
                ) : !hasChanges ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3.5 border border-dashed border-slate-800/60 rounded-xl bg-slate-950/20">
                    <Check className="w-9 h-9 text-emerald-400 bg-emerald-950/30 p-2 rounded-full border border-emerald-500/20 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.2)] animate-pulse" />
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-200 tracking-wide">
                        Workspace is Up to Date
                      </p>
                      <p className="text-[11px] text-slate-500">
                        No unsaved draft changes detected in this blueprint diagram.
                      </p>
                    </div>
                  </div>
                ) : (
                  diff && (
                    <>
                      <DiffNodesSection diff={diff} />
                      <DiffDepsSection diff={diff} />
                    </>
                  )
                )}
              </div>

              <div className="p-4 border-t border-slate-900 bg-slate-950/40 sticky bottom-0 z-10 flex items-center justify-between shrink-0">
                <div>
                  {hasChanges && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRevert}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-rose-950/15 hover:bg-rose-950/30 text-rose-400 hover:text-rose-250 border border-rose-900/30 hover:border-rose-900/60 px-4.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Revert Changes
                      </button>
                      <button
                        onClick={handleCommit}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 hover:text-white border border-emerald-500/30 text-slate-100 px-4.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Commit Changes
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-slate-100 px-4.5 py-2 rounded-lg text-xs font-semibold border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

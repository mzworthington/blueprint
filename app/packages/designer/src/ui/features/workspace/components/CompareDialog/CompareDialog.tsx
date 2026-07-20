import React, { useMemo, useState } from 'react';
import { GitCompare, X } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  compareSystemSchemas,
  schemaDiffHasChanges,
} from '../../../../../utils/compareSystemSchemas';
import { DiffNodesSection } from '../DiffMenu/DiffNodesSection';
import { DiffDepsSection } from '../DiffMenu/DiffDepsSection';

interface CompareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Side-by-side structural diff of two loaded systems (or two versions via path pickers).
 */
export const CompareDialog: React.FC<CompareDialogProps> = ({ isOpen, onClose }) => {
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const currentFilePath = useBlueprintStore(s => s.currentFilePath);

  const [leftPath, setLeftPath] = useState(currentFilePath);
  const [rightPath, setRightPath] = useState('');

  const effectiveRightPath = useMemo(() => {
    if (rightPath) return rightPath;
    const other = loadedSystems.find(s => s.path !== leftPath);
    return other?.path ?? '';
  }, [rightPath, loadedSystems, leftPath]);

  const leftSystem = loadedSystems.find(s => s.path === leftPath);
  const rightSystem = loadedSystems.find(s => s.path === effectiveRightPath);

  const diff = useMemo(() => {
    if (!leftSystem || !rightSystem || leftPath === effectiveRightPath) return null;
    return compareSystemSchemas(
      leftSystem.schema,
      rightSystem.schema,
      leftSystem.path,
      rightSystem.path
    );
  }, [leftSystem, rightSystem, leftPath, effectiveRightPath]);

  const hasChanges = diff ? schemaDiffHasChanges(diff) : false;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-dialog-title"
      data-testid="compare-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl max-h-[min(85vh,720px)] flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#00f0ff]" />
              <div>
                <h2 id="compare-dialog-title" className="text-base font-bold text-white">
                  Compare systems
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Structural diff between two loaded diagrams
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close compare dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loadedSystems.length < 2 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Load at least two systems to compare. Open a workspace folder with multiple YAML
              diagrams, or import additional schemas.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <label className="block text-xs">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    Baseline
                  </span>
                  <select
                    value={leftPath}
                    onChange={e => setLeftPath(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                    aria-label="Baseline system"
                    data-testid="compare-left-select"
                  >
                    {loadedSystems.map(sys => (
                      <option key={sys.path} value={sys.path}>
                        {sys.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    Compare to
                  </span>
                  <select
                    value={effectiveRightPath}
                    onChange={e => setRightPath(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                    aria-label="Compare-to system"
                    data-testid="compare-right-select"
                  >
                    {loadedSystems.map(sys => (
                      <option key={sys.path} value={sys.path}>
                        {sys.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {leftPath === effectiveRightPath ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Select two different systems to compare.
                  </p>
                ) : !hasChanges ? (
                  <p className="text-sm text-emerald-400 text-center py-8">
                    No structural differences between the selected systems.
                  </p>
                ) : (
                  diff && (
                    <div className="space-y-6">
                      <DiffNodesSection diff={diff} />
                      <DiffDepsSection diff={diff} />
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

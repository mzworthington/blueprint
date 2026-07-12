import React, { useEffect, useState, useCallback } from 'react';
import { GitCompare, Plus, Trash2, Edit, Check } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  computeSchemaDiff,
  revertWorkingSchema,
  type SchemaDiff,
} from '../../../../../infrastructure/db/db';

interface DiffMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiffMenu: React.FC<DiffMenuProps> = ({ isOpen, onClose }) => {
  const { currentFilePath, initSchema, loadedSystems, logger } = useBlueprintStore();
  const [diff, setDiff] = useState<SchemaDiff | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    try {
      const result = await computeSchemaDiff(currentFilePath);
      setDiff(result);
    } catch (err) {
      logger.error('Failed to compute schema diff', err);
    } finally {
      setLoading(false);
    }
  }, [currentFilePath, logger]);

  useEffect(() => {
    if (isOpen) {
      fetchDiff();
    }
  }, [isOpen, fetchDiff]);

  // Transition-based open/close logic is handled via classes below

  const handleRevert = async () => {
    if (!confirm('Are you sure you want to revert all unsaved draft changes for this diagram?')) {
      return;
    }

    try {
      const system = loadedSystems.find(s => s.path === currentFilePath);
      const originalSchema = await revertWorkingSchema(
        currentFilePath,
        system?.schema.name,
        system?.schema.version,
        system?.schema.level,
        system?.schema.parentRef
      );

      initSchema(originalSchema);
      logger.info('Reverted active diagram changes to baseline version');
      onClose();
    } catch (err) {
      logger.error('Failed to revert active diagram draft changes', err);
    }
  };

  const hasChanges =
    diff &&
    (diff.nodes.added.length > 0 ||
      diff.nodes.modified.length > 0 ||
      diff.nodes.deleted.length > 0 ||
      diff.dependencies.added.length > 0 ||
      diff.dependencies.deleted.length > 0);

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
                  <>
                    {diff &&
                      (diff.nodes.added.length > 0 ||
                        diff.nodes.modified.length > 0 ||
                        diff.nodes.deleted.length > 0) && (
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-brand-500 rounded-full inline-block"></span>
                            Component Operations
                          </h3>
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {diff.nodes.added.map(node => (
                              <div
                                key={node.entityRef}
                                className="flex items-center justify-between bg-emerald-950/10 border border-emerald-500/10 hover:border-emerald-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-200">{node.name}</span>
                                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                    {node.entityRef}
                                  </span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider font-mono shrink-0">
                                  <Plus className="w-3 h-3" /> Added
                                </span>
                              </div>
                            ))}

                            {diff.nodes.modified.map(({ original, current }) => (
                              <div
                                key={current.entityRef}
                                className="bg-amber-950/5 border border-amber-500/10 hover:border-amber-500/20 px-4 py-3.5 rounded-xl text-xs space-y-3 transition duration-150"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <span className="font-semibold text-slate-200">
                                      {current.name}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                      {current.entityRef}
                                    </span>
                                  </div>
                                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 uppercase tracking-wider font-mono shrink-0">
                                    <Edit className="w-3 h-3" /> Modified
                                  </span>
                                </div>

                                <div className="pl-3.5 border-l-2 border-amber-500/35 space-y-2 text-[11px] font-mono text-slate-400 bg-[#040914] p-3 rounded-lg border border-slate-900">
                                  {original.name !== current.name && (
                                    <div className="flex flex-wrap gap-x-2">
                                      <span className="text-slate-500 font-semibold">Name:</span>
                                      <span className="text-rose-400/80 line-through">
                                        {original.name}
                                      </span>
                                      <span className="text-slate-400">&rarr;</span>
                                      <span className="text-emerald-400 font-semibold">
                                        {current.name}
                                      </span>
                                    </div>
                                  )}
                                  {original.type !== current.type && (
                                    <div className="flex flex-wrap gap-x-2">
                                      <span className="text-slate-500 font-semibold">Type:</span>
                                      <span className="text-rose-400/80 line-through">
                                        {original.type}
                                      </span>
                                      <span className="text-slate-400">&rarr;</span>
                                      <span className="text-emerald-400 font-semibold">
                                        {current.type}
                                      </span>
                                    </div>
                                  )}
                                  {(original.x !== current.x || original.y !== current.y) && (
                                    <div className="flex flex-wrap gap-x-2">
                                      <span className="text-slate-500 font-semibold">
                                        Position:
                                      </span>
                                      <span className="text-rose-400/80 line-through">
                                        ({original.x ?? 0}, {original.y ?? 0})
                                      </span>
                                      <span className="text-slate-400">&rarr;</span>
                                      <span className="text-emerald-400 font-semibold">
                                        ({current.x ?? 0}, {current.y ?? 0})
                                      </span>
                                    </div>
                                  )}
                                  {JSON.stringify(original.properties) !==
                                    JSON.stringify(current.properties) && (
                                    <div className="space-y-1">
                                      <span className="text-slate-500 font-semibold block mb-1">
                                        Property updates:
                                      </span>
                                      {Object.keys({
                                        ...original.properties,
                                        ...current.properties,
                                      }).map(k => {
                                        const origVal = original.properties[k];
                                        const currVal = current.properties[k];
                                        if (origVal !== currVal) {
                                          return (
                                            <div
                                              key={k}
                                              className="pl-3 border-l border-slate-800 flex flex-wrap gap-x-1.5"
                                            >
                                              <span className="text-slate-500">{k}:</span>
                                              {origVal !== undefined ? (
                                                <span className="text-rose-450 line-through">
                                                  {JSON.stringify(origVal)}
                                                </span>
                                              ) : (
                                                <span className="text-slate-600 italic">
                                                  [unset]
                                                </span>
                                              )}
                                              <span className="text-slate-500">&rarr;</span>
                                              <span className="text-emerald-400 font-semibold">
                                                {currVal !== undefined
                                                  ? JSON.stringify(currVal)
                                                  : '[deleted]'}
                                              </span>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {diff.nodes.deleted.map(node => (
                              <div
                                key={node.entityRef}
                                className="flex items-center justify-between bg-rose-950/5 border border-rose-500/10 hover:border-rose-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-350">{node.name}</span>
                                  <span className="block text-[10px] text-slate-550 font-mono mt-0.5 truncate">
                                    {node.entityRef}
                                  </span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-wider font-mono shrink-0">
                                  <Trash2 className="w-3 h-3" /> Deleted
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {diff &&
                      (diff.dependencies.added.length > 0 ||
                        diff.dependencies.deleted.length > 0) && (
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-brand-500 rounded-full inline-block"></span>
                            Connection Operations
                          </h3>
                          <div className="space-y-2.5">
                            {diff.dependencies.added.map(dep => (
                              <div
                                key={dep.id}
                                className="flex items-center justify-between bg-emerald-955/10 border border-emerald-500/10 hover:border-emerald-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
                              >
                                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                  <span
                                    className="font-mono text-[11px] text-slate-300 truncate max-w-[150px]"
                                    title={dep.fromRef.split('/').pop()}
                                  >
                                    {dep.fromRef.split('/').pop()}
                                  </span>
                                  <span className="text-slate-500 font-bold">&rarr;</span>
                                  <span
                                    className="font-mono text-[11px] text-slate-300 truncate max-w-[150px]"
                                    title={dep.toRef.split('/').pop()}
                                  >
                                    {dep.toRef.split('/').pop()}
                                  </span>
                                  {dep.type && (
                                    <span className="text-[9px] text-[#00f0ff] bg-[#00f0ff]/5 border border-[#00f0ff]/15 px-2 py-0.5 rounded-md ml-2 font-mono uppercase tracking-wider">
                                      {dep.type}
                                    </span>
                                  )}
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider font-mono shrink-0">
                                  <Plus className="w-3 h-3" /> Added Conn
                                </span>
                              </div>
                            ))}

                            {diff.dependencies.deleted.map(dep => (
                              <div
                                key={dep.id}
                                className="flex items-center justify-between bg-rose-955/5 border border-rose-500/10 hover:border-rose-500/20 px-4 py-3 rounded-xl text-xs transition duration-150"
                              >
                                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[150px] line-through">
                                    {dep.fromRef.split('/').pop()}
                                  </span>
                                  <span className="text-slate-600 font-bold">&rarr;</span>
                                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[150px] line-through">
                                    {dep.toRef.split('/').pop()}
                                  </span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-wider font-mono shrink-0">
                                  <Trash2 className="w-3 h-3" /> Deleted Conn
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>

              <div className="p-4 border-t border-slate-900 bg-slate-950/40 sticky bottom-0 z-10 flex items-center justify-between shrink-0">
                <div>
                  {hasChanges && (
                    <button
                      onClick={handleRevert}
                      disabled={loading}
                      className="flex items-center gap-1.5 bg-rose-950/15 hover:bg-rose-950/30 text-rose-400 hover:text-rose-250 border border-rose-900/30 hover:border-rose-900/60 px-4.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      Revert Changes
                    </button>
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

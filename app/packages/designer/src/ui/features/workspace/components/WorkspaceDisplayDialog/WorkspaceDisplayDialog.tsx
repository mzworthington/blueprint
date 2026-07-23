import React, { useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { countSchemaForensicsMetrics } from '../../../../../application/forensics/countForensicsMetrics';
import { WorkspaceDisplayControls } from '../PropertyPanel/WorkspaceDisplayControls';

interface WorkspaceDisplayDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceDisplayDialog: React.FC<WorkspaceDisplayDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    schema,
    showTests,
    toggleShowTests,
    showExternals,
    toggleShowExternals,
    showSelectedDependenciesOnly,
    toggleShowSelectedDependenciesOnly,
    showHotspotHeatmap,
    toggleShowHotspotHeatmap,
    liteCanvas,
    toggleLiteCanvas,
  } = useBlueprintStore();

  const counts = countSchemaForensicsMetrics(schema, null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-display-title"
      data-testid="workspace-display-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00f0ff]" />
              <h2 id="workspace-display-title" className="text-base font-bold text-white">
                Workspace display
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close workspace display settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto">
            <WorkspaceDisplayControls
              showTests={showTests}
              onToggleShowTests={toggleShowTests}
              showExternals={showExternals}
              onToggleShowExternals={toggleShowExternals}
              showSelectedDependenciesOnly={showSelectedDependenciesOnly}
              onToggleShowSelectedDependenciesOnly={toggleShowSelectedDependenciesOnly}
              showHotspotHeatmap={showHotspotHeatmap}
              onToggleShowHotspotHeatmap={toggleShowHotspotHeatmap}
              liteCanvas={liteCanvas}
              onToggleLiteCanvas={toggleLiteCanvas}
              counts={counts}
              countsScopedToNode={false}
              showHeader={false}
              className="space-y-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

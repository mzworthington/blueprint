import React from 'react';

interface WorkspaceDisplayControlsProps {
  showTests: boolean;
  onToggleShowTests: () => void;
  showExternals: boolean;
  onToggleShowExternals: () => void;
  showHotspotHeatmap: boolean;
  onToggleShowHotspotHeatmap: () => void;
}

function DisplaySwitch({
  label,
  checked,
  onToggle,
  testId,
  onClassName,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
  onClassName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          checked ? onClassName : 'bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/** Workspace-scoped canvas display toggles (visible regardless of node selection). */
export const WorkspaceDisplayControls: React.FC<WorkspaceDisplayControlsProps> = ({
  showTests,
  onToggleShowTests,
  showExternals,
  onToggleShowExternals,
  showHotspotHeatmap,
  onToggleShowHotspotHeatmap,
}) => (
  <div
    className="border-t border-slate-900 pt-4 space-y-3"
    data-testid="workspace-display-controls"
  >
    <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
      Workspace display
    </h4>
    <DisplaySwitch
      label="Show Test Components"
      checked={showTests}
      onToggle={onToggleShowTests}
      testId="toggle-show-tests"
      onClassName="bg-brand-600"
    />
    <DisplaySwitch
      label="Show Externals"
      checked={showExternals}
      onToggle={onToggleShowExternals}
      testId="toggle-show-externals"
      onClassName="bg-brand-600"
    />
    <DisplaySwitch
      label="Risk Heatmap"
      checked={showHotspotHeatmap}
      onToggle={onToggleShowHotspotHeatmap}
      testId="toggle-show-hotspot-heatmap"
      onClassName="bg-red-700"
    />
    <p className="text-[10px] leading-snug text-slate-500" data-testid="workspace-heatmap-help">
      Tint every node on this diagram by hotspot score. Does not change the YAML.
    </p>
  </div>
);

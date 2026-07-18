import React from 'react';
import type { ForensicsDisplayMetrics } from '../../../../../application/forensics/countForensicsMetrics';

interface WorkspaceDisplayControlsProps {
  showTests: boolean;
  onToggleShowTests: () => void;
  showExternals: boolean;
  onToggleShowExternals: () => void;
  showSelectedDependenciesOnly: boolean;
  onToggleShowSelectedDependenciesOnly: () => void;
  showHotspotHeatmap: boolean;
  onToggleShowHotspotHeatmap: () => void;
  liteCanvas: boolean;
  onToggleLiteCanvas: () => void;
  counts: ForensicsDisplayMetrics;
  countsScopedToNode: boolean;
}

function DisplaySwitch({
  label,
  count,
  checked,
  onToggle,
  testId,
  onClassName,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
  testId: string;
  onClassName: string;
}) {
  const ariaLabel = count != null ? `${label} (${count})` : label;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
        {label}
        {count != null ? (
          <span
            className="ml-1.5 text-slate-500 normal-case tracking-normal"
            data-testid={`${testId}-count`}
          >
            ({count})
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
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
  showSelectedDependenciesOnly,
  onToggleShowSelectedDependenciesOnly,
  showHotspotHeatmap,
  onToggleShowHotspotHeatmap,
  liteCanvas,
  onToggleLiteCanvas,
  counts,
  countsScopedToNode,
}) => (
  <div
    className="border-t border-slate-900 pt-4 space-y-3"
    data-testid="workspace-display-controls"
  >
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
        Workspace display
      </h4>
      <span
        className="font-mono text-[10px] text-slate-500 tabular-nums"
        data-testid="workspace-display-summary"
      >
        {counts.externals} ext · {counts.tests} tests · {counts.dependencies} deps
        {countsScopedToNode ? ' · node' : ''}
      </span>
    </div>
    <DisplaySwitch
      label="Show Test Components"
      count={counts.tests}
      checked={showTests}
      onToggle={onToggleShowTests}
      testId="toggle-show-tests"
      onClassName="bg-brand-600"
    />
    <DisplaySwitch
      label="Show Externals"
      count={counts.externals}
      checked={showExternals}
      onToggle={onToggleShowExternals}
      testId="toggle-show-externals"
      onClassName="bg-brand-600"
    />
    <DisplaySwitch
      label="Show Selected Dependencies Only"
      count={counts.dependencies}
      checked={showSelectedDependenciesOnly}
      onToggle={onToggleShowSelectedDependenciesOnly}
      testId="toggle-show-selected-dependencies-only"
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
    <DisplaySwitch
      label="Lite Canvas"
      checked={liteCanvas}
      onToggle={onToggleLiteCanvas}
      testId="toggle-lite-canvas"
      onClassName="bg-brand-600"
    />
    <p className="text-[10px] leading-snug text-slate-500" data-testid="workspace-lite-canvas-help">
      Faster pan and zoom on large diagrams: hide minimap/grid, simplify nodes, cap edge animation.
    </p>
  </div>
);

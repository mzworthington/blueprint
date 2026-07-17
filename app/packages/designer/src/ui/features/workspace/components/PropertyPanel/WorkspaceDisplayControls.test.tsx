import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceDisplayControls } from './WorkspaceDisplayControls';

describe('WorkspaceDisplayControls', () => {
  it('exposes workspace-wide display toggles including selected-deps focus', () => {
    const onToggleTests = vi.fn();
    const onToggleExternals = vi.fn();
    const onToggleSelectedDeps = vi.fn();
    const onToggleHeat = vi.fn();
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={onToggleTests}
        showExternals={true}
        onToggleShowExternals={onToggleExternals}
        showSelectedDependenciesOnly={false}
        onToggleShowSelectedDependenciesOnly={onToggleSelectedDeps}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={onToggleHeat}
      />
    );

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggle-show-tests'));
    fireEvent.click(screen.getByTestId('toggle-show-externals'));
    fireEvent.click(screen.getByTestId('toggle-show-selected-dependencies-only'));
    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    expect(onToggleTests).toHaveBeenCalledTimes(1);
    expect(onToggleExternals).toHaveBeenCalledTimes(1);
    expect(onToggleSelectedDeps).toHaveBeenCalledTimes(1);
    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Show Selected Dependencies Only')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-heatmap-help')).toHaveTextContent(/Tint every node/i);
  });
});

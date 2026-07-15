import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceDisplayControls } from './WorkspaceDisplayControls';

describe('WorkspaceDisplayControls', () => {
  it('exposes workspace-wide test and heatmap toggles', () => {
    const onToggleTests = vi.fn();
    const onToggleHeat = vi.fn();
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={onToggleTests}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={onToggleHeat}
      />
    );

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggle-show-tests'));
    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    expect(onToggleTests).toHaveBeenCalledTimes(1);
    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('workspace-heatmap-help')).toHaveTextContent(/Tint every node/i);
  });
});

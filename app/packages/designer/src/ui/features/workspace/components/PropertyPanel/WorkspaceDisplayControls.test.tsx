import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceDisplayControls } from './WorkspaceDisplayControls';

const defaultCounts = { externals: 2, tests: 4, dependencies: 8 };

describe('WorkspaceDisplayControls', () => {
  it('exposes workspace-wide display toggles including selected-deps focus', () => {
    const onToggleTests = vi.fn();
    const onToggleExternals = vi.fn();
    const onToggleSelectedDeps = vi.fn();
    const onToggleHeat = vi.fn();
    const onToggleLite = vi.fn();
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
        liteCanvas={false}
        onToggleLiteCanvas={onToggleLite}
        counts={defaultCounts}
        countsScopedToNode={false}
      />
    );

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '2 ext · 4 tests · 8 deps'
    );
    expect(screen.getByTestId('toggle-show-tests-count')).toHaveTextContent('(4)');
    expect(screen.getByTestId('toggle-show-externals-count')).toHaveTextContent('(2)');
    expect(screen.getByTestId('toggle-show-selected-dependencies-only-count')).toHaveTextContent(
      '(8)'
    );
    fireEvent.click(screen.getByTestId('toggle-show-tests'));
    fireEvent.click(screen.getByTestId('toggle-show-externals'));
    fireEvent.click(screen.getByTestId('toggle-show-selected-dependencies-only'));
    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    fireEvent.click(screen.getByTestId('toggle-lite-canvas'));
    expect(onToggleTests).toHaveBeenCalledTimes(1);
    expect(onToggleExternals).toHaveBeenCalledTimes(1);
    expect(onToggleSelectedDeps).toHaveBeenCalledTimes(1);
    expect(onToggleHeat).toHaveBeenCalledTimes(1);
    expect(onToggleLite).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Show Selected Dependencies Only (8)')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-heatmap-help')).toHaveTextContent(/Tint every node/i);
    expect(screen.getByTestId('workspace-lite-canvas-help')).toHaveTextContent(
      /Faster pan and zoom/i
    );
  });

  it('marks the summary when counts are scoped to the selected node', () => {
    render(
      <WorkspaceDisplayControls
        showTests={false}
        onToggleShowTests={vi.fn()}
        showExternals={true}
        onToggleShowExternals={vi.fn()}
        showSelectedDependenciesOnly={false}
        onToggleShowSelectedDependenciesOnly={vi.fn()}
        showHotspotHeatmap={false}
        onToggleShowHotspotHeatmap={vi.fn()}
        liteCanvas={false}
        onToggleLiteCanvas={vi.fn()}
        counts={{ externals: 1, tests: 0, dependencies: 3 }}
        countsScopedToNode
      />
    );

    expect(screen.getByTestId('workspace-display-summary')).toHaveTextContent(
      '1 ext · 0 tests · 3 deps · node'
    );
  });
});

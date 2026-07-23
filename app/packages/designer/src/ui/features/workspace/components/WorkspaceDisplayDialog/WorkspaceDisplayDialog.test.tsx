import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceDisplayDialog } from './WorkspaceDisplayDialog';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('WorkspaceDisplayDialog', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Diagram',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'svc-a', type: 'microservice', name: 'A', x: 0, y: 0, external: true },
        { entityRef: 'svc-b', type: 'microservice', name: 'B', x: 10, y: 10, isTest: true },
      ],
      dependencies: [{ from: 'svc-a', to: 'svc-b', type: 'direct-call' }],
    });
    useBlueprintStore.setState({ showHotspotHeatmap: false, liteCanvas: false });
  });

  it('renders display toggles when open', () => {
    render(<WorkspaceDisplayDialog isOpen onClose={() => {}} />);

    expect(screen.getByTestId('workspace-display-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-show-hotspot-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-lite-canvas')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<WorkspaceDisplayDialog isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('workspace-display-dialog')).not.toBeInTheDocument();
  });

  it('toggles settings and closes on backdrop click', () => {
    const onClose = vi.fn();
    render(<WorkspaceDisplayDialog isOpen onClose={onClose} />);

    fireEvent.click(screen.getByTestId('toggle-lite-canvas'));
    expect(useBlueprintStore.getState().liteCanvas).toBe(true);

    fireEvent.click(screen.getByTestId('workspace-display-dialog').firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<WorkspaceDisplayDialog isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

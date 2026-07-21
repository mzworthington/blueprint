import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutEngineControls } from './LayoutEngineControls';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('LayoutEngineControls', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      layoutEngine: null,
      setLayoutEngine: engine => useBlueprintStore.setState({ layoutEngine: engine }),
      applyClientLayout: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('updates store and applies layout when an engine is picked', () => {
    const applyClientLayout = vi.fn().mockResolvedValue(undefined);
    useBlueprintStore.setState({ applyClientLayout });

    render(<LayoutEngineControls />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dagre' }));

    expect(useBlueprintStore.getState().layoutEngine).toBe('dagre');
    expect(applyClientLayout).toHaveBeenCalled();
  });
});

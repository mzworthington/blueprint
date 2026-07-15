import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutEngineControls } from './LayoutEngineControls';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('LayoutEngineControls', () => {
  beforeEach(() => {
    useBlueprintStore.setState({ layoutEngine: null });
  });

  it('starts with no engine selected and updates store on change', () => {
    render(<LayoutEngineControls />);
    const select = screen.getByLabelText('Layout engine') as HTMLSelectElement;
    expect(select.value).toBe('');

    fireEvent.change(select, { target: { value: 'dagre' } });
    expect(useBlueprintStore.getState().layoutEngine).toBe('dagre');
  });
});

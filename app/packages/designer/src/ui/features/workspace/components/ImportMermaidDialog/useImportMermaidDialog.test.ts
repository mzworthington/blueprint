import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useImportMermaidDialog } from './useImportMermaidDialog';
import { useBlueprintStore } from '../../../../../application/store/store';
import { createBrowserLayoutRegistry } from '../../../../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../../../../infrastructure/layout/reactFlowGraphChangeAdapter';

const SAMPLE = `
flowchart TD
  A[Alpha] --> B[Beta]
  B --> C[Gamma]
`;

describe('useImportMermaidDialog', () => {
  beforeEach(() => {
    useBlueprintStore.getState().setPorts({
      layoutRegistry: createBrowserLayoutRegistry(),
      graphChangePort: reactFlowGraphChangeAdapter,
    });
    useBlueprintStore.getState().resetToEmptyWorkspace();
    useBlueprintStore.setState({ layoutEngine: null });
  });

  it('applies ELK layout after a successful Mermaid import', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useImportMermaidDialog(true, onClose));

    act(() => {
      result.current.setMermaidText(SAMPLE);
    });

    await waitFor(() => {
      expect(result.current.canApply).toBe(true);
    });

    await act(async () => {
      await result.current.handleApply();
    });

    const state = useBlueprintStore.getState();
    expect(onClose).toHaveBeenCalled();
    expect(state.layoutEngine).toBe('elk');
    expect(state.schema.nodes.length).toBeGreaterThanOrEqual(2);

    const ys = state.nodes.map(n => n.position.y);
    const xs = state.nodes.map(n => n.position.x);
    // ELK layered DOWN should spread nodes (not leave the naive import grid alone).
    expect(Math.max(...ys) - Math.min(...ys) + (Math.max(...xs) - Math.min(...xs))).toBeGreaterThan(
      0
    );
  });
});

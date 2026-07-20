import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useImportIacDialog } from './useImportIacDialog';
import { useBlueprintStore } from '../../../../../application/store/store';
import { createBrowserLayoutRegistry } from '../../../../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../../../../infrastructure/layout/reactFlowGraphChangeAdapter';

const SAMPLE_TF = `
resource "aws_lambda_function" "api" {
  function_name = "api"
}
`;

describe('useImportIacDialog', () => {
  beforeEach(() => {
    useBlueprintStore.getState().setPorts({
      layoutRegistry: createBrowserLayoutRegistry(),
      graphChangePort: reactFlowGraphChangeAdapter,
    });
    useBlueprintStore.getState().resetToEmptyWorkspace();
    useBlueprintStore.setState({ layoutEngine: null });
  });

  it('applies ELK layout after a successful IaC import', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useImportIacDialog(true, onClose));

    act(() => {
      result.current.setSourceText(SAMPLE_TF);
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
    expect(state.schema.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

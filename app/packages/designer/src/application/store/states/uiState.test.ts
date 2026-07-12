import { describe, it, expect } from 'vitest';
import { useBlueprintStore } from '../store';

describe('uiState Actions & State Management', () => {
  it('should initialize with correct default UI state', () => {
    const state = useBlueprintStore.getState();
    expect(state.showTests).toBe(false);
    expect(state.leftCollapsed).toBe(true);
    expect(state.rightCollapsed).toBe(true);
    expect(state.showDesignSystem).toBe(false);
    expect(state.isDiffOpen).toBe(false);
  });

  it('should set isDiffOpen value via setIsDiffOpen action', () => {
    const store = useBlueprintStore.getState();
    expect(store.isDiffOpen).toBe(false);

    store.setIsDiffOpen(true);
    expect(useBlueprintStore.getState().isDiffOpen).toBe(true);

    store.setIsDiffOpen(false);
    expect(useBlueprintStore.getState().isDiffOpen).toBe(false);
  });

  it('should toggle showTests property via toggleShowTests action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showTests).toBe(false);

    store.toggleShowTests();
    expect(useBlueprintStore.getState().showTests).toBe(true);

    store.toggleShowTests();
    expect(useBlueprintStore.getState().showTests).toBe(false);
  });

  it('should manage leftCollapsed and rightCollapsed panel states', () => {
    const store = useBlueprintStore.getState();
    expect(store.leftCollapsed).toBe(true);
    expect(store.rightCollapsed).toBe(true);

    store.toggleLeftCollapsed();
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    store.toggleLeftCollapsed();
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    store.toggleRightCollapsed();
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    store.toggleRightCollapsed();
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });

  it('should set showDesignSystem value via setShowDesignSystem action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showDesignSystem).toBe(false);

    store.setShowDesignSystem(true);
    expect(useBlueprintStore.getState().showDesignSystem).toBe(true);

    store.setShowDesignSystem(false);
    expect(useBlueprintStore.getState().showDesignSystem).toBe(false);
  });

  it('should automatically expand right panel when a node is selected', () => {
    useBlueprintStore.setState({ rightCollapsed: true, selectedNodeId: null });

    const store = useBlueprintStore.getState();
    expect(store.rightCollapsed).toBe(true);

    store.selectNode('nodeA');

    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
    expect(useBlueprintStore.getState().selectedNodeId).toBe('nodeA');
  });
});

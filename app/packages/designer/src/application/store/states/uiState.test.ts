import { describe, it, expect } from 'vitest';
import { useBlueprintStore } from '../store';

describe('uiState Actions & State Management', () => {
  it('should initialize with correct default UI state', () => {
    const state = useBlueprintStore.getState();
    expect(state.showTests).toBe(false);
    expect(state.showExternals).toBe(true);
    expect(state.showSelectedDependenciesOnly).toBe(true);
    expect(state.showCoupling).toBe(false);
    expect(state.showHotspotHeatmap).toBe(true);
    expect(state.liteCanvas).toBe(false);
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

  it('should toggle showExternals property via toggleShowExternals action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showExternals).toBe(true);

    store.toggleShowExternals();
    expect(useBlueprintStore.getState().showExternals).toBe(false);

    store.toggleShowExternals();
    expect(useBlueprintStore.getState().showExternals).toBe(true);
  });

  it('should toggle showSelectedDependenciesOnly via toggleShowSelectedDependenciesOnly', () => {
    const store = useBlueprintStore.getState();
    expect(store.showSelectedDependenciesOnly).toBe(true);

    store.toggleShowSelectedDependenciesOnly();
    expect(useBlueprintStore.getState().showSelectedDependenciesOnly).toBe(false);

    store.toggleShowSelectedDependenciesOnly();
    expect(useBlueprintStore.getState().showSelectedDependenciesOnly).toBe(true);
  });

  it('should toggle showCoupling property via toggleShowCoupling action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showCoupling).toBe(false);

    store.toggleShowCoupling();
    expect(useBlueprintStore.getState().showCoupling).toBe(true);

    store.toggleShowCoupling();
    expect(useBlueprintStore.getState().showCoupling).toBe(false);
  });

  it('should toggle showHotspotHeatmap via toggleShowHotspotHeatmap action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showHotspotHeatmap).toBe(true);

    store.toggleShowHotspotHeatmap();
    expect(useBlueprintStore.getState().showHotspotHeatmap).toBe(false);

    store.toggleShowHotspotHeatmap();
    expect(useBlueprintStore.getState().showHotspotHeatmap).toBe(true);
  });

  it('should toggle liteCanvas via toggleLiteCanvas action', () => {
    const store = useBlueprintStore.getState();
    expect(store.liteCanvas).toBe(false);

    store.toggleLiteCanvas();
    expect(useBlueprintStore.getState().liteCanvas).toBe(true);

    store.toggleLiteCanvas();
    expect(useBlueprintStore.getState().liteCanvas).toBe(false);
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

  it('should initialize focusedCyclePath to null and set it via setFocusedCyclePath', () => {
    const store = useBlueprintStore.getState();
    expect(store.focusedCyclePath).toBe(null);

    store.setFocusedCyclePath(['node-a', 'node-b', 'node-a']);
    expect(useBlueprintStore.getState().focusedCyclePath).toEqual(['node-a', 'node-b', 'node-a']);

    store.setFocusedCyclePath(null);
    expect(useBlueprintStore.getState().focusedCyclePath).toBe(null);
  });
});

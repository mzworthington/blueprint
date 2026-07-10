import type { StateCreator } from 'zustand';
import type { BlueprintState } from '../store';

export interface UiSlice {
  showTests: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showDesignSystem: boolean;
  toggleShowTests: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
}

export const createUiSlice: StateCreator<BlueprintState, [], [], UiSlice> = set => ({
  showTests: false,
  leftCollapsed: true,
  rightCollapsed: true,
  showDesignSystem: false,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
});

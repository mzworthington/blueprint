import type { StateCreator } from 'zustand';
import type { BlueprintState } from '../store';

export interface UiSlice {
  showTests: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleShowTests: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
}

export const createUiSlice: StateCreator<BlueprintState, [], [], UiSlice> = set => ({
  showTests: false,
  leftCollapsed: true,
  rightCollapsed: true,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
});

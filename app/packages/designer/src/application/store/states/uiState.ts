import type { LayoutEngineId } from '../../../core';

export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'error';
  title?: string;
}

export interface UiState {
  showTests: boolean;
  /** When true (and a node is selected), overlay temporal-coupling edges on the canvas. */
  showCoupling: boolean;
  /**
   * Selected client layout engine, or `null` until the user picks one.
   * Applying an engine recomputes positions and writes them into schema / YAML.
   */
  layoutEngine: LayoutEngineId | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showDesignSystem: boolean;
  isDiffOpen: boolean;
  notification: ToastNotification | null;
  toggleShowTests: () => void;
  toggleShowCoupling: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
  setIsDiffOpen: (open: boolean) => void;
  setNotification: (notification: ToastNotification | null) => void;
  setLayoutEngine: (engine: LayoutEngineId | null) => void;
}

export const createUiState = (
  set: (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void
): UiState => ({
  showTests: false,
  showCoupling: false,
  layoutEngine: null,
  leftCollapsed: true,
  rightCollapsed: true,
  showDesignSystem: false,
  isDiffOpen: false,
  notification: null,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleShowCoupling: () => set(state => ({ showCoupling: !state.showCoupling })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setNotification: notification => set({ notification }),
  setLayoutEngine: engine => set({ layoutEngine: engine }),
});

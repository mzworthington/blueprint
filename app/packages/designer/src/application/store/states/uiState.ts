import type { LayoutEngineId } from '../../../core';

export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'error';
  title?: string;
}

export interface UiState {
  showTests: boolean;
  /** When true (and a node is selected), focus the canvas on that node and its coupled peers. */
  showCoupling: boolean;
  /** When true, tint canvas nodes by forensics.hotspotScore (display-only). */
  showHotspotHeatmap: boolean;
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
  focusedCyclePath: string[] | null;
  toggleShowTests: () => void;
  toggleShowCoupling: () => void;
  toggleShowHotspotHeatmap: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
  setIsDiffOpen: (open: boolean) => void;
  setNotification: (notification: ToastNotification | null) => void;
  setLayoutEngine: (engine: LayoutEngineId | null) => void;
  setFocusedCyclePath: (path: string[] | null) => void;
}

export const createUiState = (
  set: (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void
): UiState => ({
  showTests: false,
  showCoupling: false,
  showHotspotHeatmap: false,
  layoutEngine: null,
  leftCollapsed: true,
  rightCollapsed: false,
  showDesignSystem: false,
  isDiffOpen: false,
  notification: null,
  focusedCyclePath: null,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleShowCoupling: () => set(state => ({ showCoupling: !state.showCoupling })),
  toggleShowHotspotHeatmap: () => set(state => ({ showHotspotHeatmap: !state.showHotspotHeatmap })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setNotification: notification => set({ notification }),
  setLayoutEngine: engine => set({ layoutEngine: engine }),
  setFocusedCyclePath: path => set({ focusedCyclePath: path }),
});

import type { LayoutEngineId } from '../../../core';

export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'error';
  title?: string;
}

export interface UiState {
  showTests: boolean;
  /** When false, hide nodes marked `external` on the canvas (display-only). */
  showExternals: boolean;
  /**
   * When true (and a node is selected), hide everything except the selection
   * and its transitive upstream + downstream dependency neighborhood.
   */
  showSelectedDependenciesOnly: boolean;
  /** When true (and a node is selected), focus the canvas on that node and its coupled peers. */
  showCoupling: boolean;
  /** When true, tint canvas nodes by forensics.hotspotScore (display-only). */
  showHotspotHeatmap: boolean;
  /** When true, simplify node chrome and cap edge animation for performance. */
  liteCanvas: boolean;
  /**
   * Selected client layout engine, or `null` until the user picks one.
   * Applying an engine recomputes positions and writes them into schema / YAML.
   */
  layoutEngine: LayoutEngineId | null;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showDesignSystem: boolean;
  isDiffOpen: boolean;
  isImportMermaidOpen: boolean;
  isImportIacOpen: boolean;
  /** Startup chooser on `/workspace` until the user picks sandbox / folder / Mermaid. */
  isStartupOpen: boolean;
  notification: ToastNotification | null;
  focusedCyclePath: string[] | null;
  isLoading: boolean | string;
  toggleShowTests: () => void;
  toggleShowExternals: () => void;
  toggleShowSelectedDependenciesOnly: () => void;
  toggleShowCoupling: () => void;
  toggleShowHotspotHeatmap: () => void;
  toggleLiteCanvas: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
  setIsDiffOpen: (open: boolean) => void;
  setIsImportMermaidOpen: (open: boolean) => void;
  setIsImportIacOpen: (open: boolean) => void;
  setIsStartupOpen: (open: boolean) => void;
  setNotification: (notification: ToastNotification | null) => void;
  setLayoutEngine: (engine: LayoutEngineId | null) => void;
  setFocusedCyclePath: (path: string[] | null) => void;
  setIsLoading: (loading: boolean | string) => void;
}

export const createUiState = (
  set: (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void
): UiState => ({
  showTests: false,
  showExternals: true,
  showSelectedDependenciesOnly: true,
  showCoupling: false,
  showHotspotHeatmap: true,
  liteCanvas: false,
  layoutEngine: null,
  leftCollapsed: true,
  rightCollapsed: false,
  showDesignSystem: false,
  isDiffOpen: false,
  isImportMermaidOpen: false,
  isImportIacOpen: false,
  isStartupOpen: true,
  notification: null,
  focusedCyclePath: null,
  isLoading: false,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleShowExternals: () => set(state => ({ showExternals: !state.showExternals })),
  toggleShowSelectedDependenciesOnly: () =>
    set(state => ({ showSelectedDependenciesOnly: !state.showSelectedDependenciesOnly })),
  toggleShowCoupling: () => set(state => ({ showCoupling: !state.showCoupling })),
  toggleShowHotspotHeatmap: () => set(state => ({ showHotspotHeatmap: !state.showHotspotHeatmap })),
  toggleLiteCanvas: () => set(state => ({ liteCanvas: !state.liteCanvas })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setIsImportMermaidOpen: open => set({ isImportMermaidOpen: open }),
  setIsImportIacOpen: open => set({ isImportIacOpen: open }),
  setIsStartupOpen: open => set({ isStartupOpen: open }),
  setNotification: notification => set({ notification }),
  setLayoutEngine: engine => set({ layoutEngine: engine }),
  setFocusedCyclePath: path => set({ focusedCyclePath: path }),
  setIsLoading: loading => set({ isLoading: loading }),
});

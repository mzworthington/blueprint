export interface ToastNotification {
  message: string;
  type: 'success' | 'info' | 'error';
  title?: string;
}

export interface UiState {
  showTests: boolean;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showDesignSystem: boolean;
  isDiffOpen: boolean;
  notification: ToastNotification | null;
  toggleShowTests: () => void;
  toggleLeftCollapsed: () => void;
  toggleRightCollapsed: () => void;
  setShowDesignSystem: (show: boolean) => void;
  setIsDiffOpen: (open: boolean) => void;
  setNotification: (notification: ToastNotification | null) => void;
}

export const createUiState = (
  set: (partial: Partial<UiState> | ((state: UiState) => Partial<UiState>)) => void
): UiState => ({
  showTests: false,
  leftCollapsed: true,
  rightCollapsed: true,
  showDesignSystem: false,
  isDiffOpen: false,
  notification: null,
  toggleShowTests: () => set(state => ({ showTests: !state.showTests })),
  toggleLeftCollapsed: () => set(state => ({ leftCollapsed: !state.leftCollapsed })),
  toggleRightCollapsed: () => set(state => ({ rightCollapsed: !state.rightCollapsed })),
  setShowDesignSystem: show => set({ showDesignSystem: show }),
  setIsDiffOpen: open => set({ isDiffOpen: open }),
  setNotification: notification => set({ notification }),
});

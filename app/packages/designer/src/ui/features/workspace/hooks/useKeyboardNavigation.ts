import { useEffect, useCallback } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';

export interface UseKeyboardNavigationOptions {
  onZoomOut?: () => void;
  onSearchOpen?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { onZoomOut, onSearchOpen, disabled = false } = options;
  const zoomOut = useBlueprintStore((state: any) => state.zoomOut);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Check if user is typing in an input field
      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      // Search shortcuts (only when not typing)
      if (!isTyping) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onSearchOpen?.();
        } else if (e.key === '/') {
          e.preventDefault();
          onSearchOpen?.();
        }
      }

      // Navigation shortcuts (only when not typing)
      if (!isTyping) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          if (onZoomOut) {
            onZoomOut();
          } else {
            zoomOut();
          }
        }
      }
    },
    [disabled, onZoomOut, onSearchOpen, zoomOut]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

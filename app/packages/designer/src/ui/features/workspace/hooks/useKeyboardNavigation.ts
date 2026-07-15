import { useEffect, useCallback } from 'react';

export interface UseKeyboardNavigationOptions {
  onSearchOpen?: () => void;
  onZoomOut?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { onSearchOpen, onZoomOut, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      if (isTyping) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSearchOpen?.();
      } else if (e.key === '/') {
        e.preventDefault();
        onSearchOpen?.();
      } else if ((e.key === 'Escape' || e.key === 'Backspace') && onZoomOut) {
        e.preventDefault();
        onZoomOut();
      }
    },
    [disabled, onSearchOpen, onZoomOut]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

import { useEffect, useCallback } from 'react';

export interface UseKeyboardNavigationOptions {
  onSearchOpen?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { onSearchOpen, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      if (!isTyping) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onSearchOpen?.();
        } else if (e.key === '/') {
          e.preventDefault();
          onSearchOpen?.();
        }
      }
    },
    [disabled, onSearchOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

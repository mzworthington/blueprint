import { useEffect, useCallback } from 'react';

export interface UseKeyboardNavigationOptions {
  onSearchOpen?: () => void;
  onZoomOut?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onShortcutsOpen?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { onSearchOpen, onZoomOut, onUndo, onRedo, onShortcutsOpen, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const isTyping =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable');

      if (isTyping) return;

      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSearchOpen?.();
      } else if (e.key === '/') {
        e.preventDefault();
        onSearchOpen?.();
      } else if ((e.key === 'Escape' || e.key === 'Backspace') && onZoomOut) {
        e.preventDefault();
        onZoomOut();
      } else if ((e.metaKey || e.ctrlKey) && isZ && !e.shiftKey && onUndo) {
        e.preventDefault();
        onUndo();
      } else if (e.key === '?' && onShortcutsOpen) {
        e.preventDefault();
        onShortcutsOpen();
      } else if (
        ((e.metaKey || e.ctrlKey) && isZ && e.shiftKey && onRedo) ||
        ((e.metaKey || e.ctrlKey) && isY && !e.shiftKey && onRedo)
      ) {
        e.preventDefault();
        onRedo();
      }
    },
    [disabled, onSearchOpen, onZoomOut, onUndo, onRedo, onShortcutsOpen]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

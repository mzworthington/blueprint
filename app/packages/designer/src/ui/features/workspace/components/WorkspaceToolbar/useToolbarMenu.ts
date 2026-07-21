import { useCallback, useEffect, useRef, useState } from 'react';

export function useToolbarMenu() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(prev => !prev), []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      // Native <select> option lists render outside the menu portal; keep the menu
      // open while the user is picking an option.
      if (document.activeElement instanceof HTMLSelectElement) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return { open, setOpen, close, toggle, anchorRef, menuRef };
}

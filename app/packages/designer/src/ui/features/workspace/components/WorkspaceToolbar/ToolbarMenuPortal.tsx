import { createPortal } from 'react-dom';
import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

type ToolbarMenuPortalProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  menuClassName: string;
  children: ReactNode;
};

/**
 * Renders toolbar dropdowns in a body portal so menus above the bottom bar
 * are not covered by the React Flow drag pane for pointer events.
 */
export function ToolbarMenuPortal({
  open,
  anchorRef,
  menuRef,
  menuClassName,
  children,
}: ToolbarMenuPortalProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.top - 8,
      left: rect.right,
    });
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={menuClassName}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: 'translate(-100%, -100%)',
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

import React from 'react';
import { Braces, SlidersHorizontal } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

const panelToggleClass =
  'flex items-center gap-2 min-h-11 px-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 shadow-sm text-xs font-semibold font-mono uppercase tracking-wider active:bg-slate-900 cursor-pointer';

type MobilePanelTogglesProps = {
  /** Inline inside the workspace toolbar (default) or legacy floating position. */
  variant?: 'inline' | 'floating';
};

/**
 * Mobile panel openers — labelled 44px-tall chips replace the thin edge rails,
 * which are hard to hit while panning the canvas. Hidden once either sheet is open
 * (panels already expose a close control in their headers).
 */
export const MobilePanelToggles: React.FC<MobilePanelTogglesProps> = ({ variant = 'inline' }) => {
  const leftCollapsed = useBlueprintStore(s => s.leftCollapsed);
  const rightCollapsed = useBlueprintStore(s => s.rightCollapsed);
  const toggleLeftCollapsed = useBlueprintStore(s => s.toggleLeftCollapsed);
  const toggleRightCollapsed = useBlueprintStore(s => s.toggleRightCollapsed);

  if (!leftCollapsed || !rightCollapsed) return null;

  return (
    <div
      className={
        variant === 'floating'
          ? 'sm:hidden absolute bottom-safe left-4 z-50 flex items-center gap-2'
          : 'sm:hidden flex items-center gap-2 w-full'
      }
      role="toolbar"
      aria-label="Open side panels"
    >
      <button
        type="button"
        onClick={toggleLeftCollapsed}
        className={`${panelToggleClass} flex-1 justify-center`}
        aria-label="Open Schema Explorer"
      >
        <Braces className="w-4 h-4 text-[#00f0ff] shrink-0" aria-hidden />
        Schema
      </button>
      <button
        type="button"
        onClick={toggleRightCollapsed}
        className={`${panelToggleClass} flex-1 justify-center`}
        aria-label="Open Properties Panel"
      >
        <SlidersHorizontal className="w-4 h-4 text-[#00f0ff] shrink-0" aria-hidden />
        Props
      </button>
    </div>
  );
};

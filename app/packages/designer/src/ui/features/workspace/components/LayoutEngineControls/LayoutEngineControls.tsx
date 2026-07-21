import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { LAYOUT_ENGINE_OPTIONS, useLayoutEnginePicker } from './layoutEngineOptions';

/**
 * Toolbar control: pick a client layout engine to recompute positions.
 */
export const LayoutEngineControls: React.FC = () => {
  const { layoutEngine, pickLayoutEngine } = useLayoutEnginePicker();

  return (
    <div
      className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 px-2 py-1.5 rounded-lg text-xs shrink-0 select-none"
      title="Pick a layout engine to recompute diagram positions"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <LayoutTemplate className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden />
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 hidden sm:inline">
        Layout
      </span>
      <div
        className="flex rounded-md border border-slate-850 overflow-hidden"
        role="radiogroup"
        aria-label="Layout engine"
      >
        {LAYOUT_ENGINE_OPTIONS.map(opt => {
          const selected = layoutEngine === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              onClick={() => pickLayoutEngine(opt.id)}
              className={`px-2 py-0.5 text-[10px] font-bold tracking-wide transition cursor-pointer ${
                selected
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {opt.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
};

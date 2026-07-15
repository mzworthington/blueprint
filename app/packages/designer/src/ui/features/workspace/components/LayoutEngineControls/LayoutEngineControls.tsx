import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { LayoutEngineId } from '../../../../../core';

const OPTIONS: Array<{ id: LayoutEngineId; label: string }> = [
  { id: 'dagre', label: 'Dagre' },
  { id: 'elk', label: 'ELK' },
  { id: 'd3-hierarchy', label: 'd3-hierarchy' },
];

/**
 * Prototype control: pick a client layout engine to recompute positions
 * (and sync x/y into the YAML editor). Empty until the user chooses one.
 */
export const LayoutEngineControls: React.FC = () => {
  const layoutEngine = useBlueprintStore(s => s.layoutEngine);
  const setLayoutEngine = useBlueprintStore(s => s.setLayoutEngine);

  return (
    <div
      className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs shrink-0 select-none"
      title="Client layout prototype — pick an engine to recompute positions and update YAML"
    >
      <LayoutTemplate className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 hidden sm:inline">
        Layout:
      </span>
      <select
        value={layoutEngine ?? ''}
        onChange={e => {
          const value = e.target.value;
          setLayoutEngine(value === '' ? null : (value as LayoutEngineId));
        }}
        className="bg-slate-950 border border-slate-850 text-slate-200 hover:text-slate-100 hover:border-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer transition duration-200 max-w-[140px]"
        aria-label="Layout engine"
      >
        <option value="" disabled>
          Select…
        </option>
        {OPTIONS.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { PropertyMap } from '@blueprint/core';

interface PropertiesSectionProps {
  properties?: PropertyMap;
  propKey: string;
  propVal: string;
  onPropKeyChange: (value: string) => void;
  onPropValChange: (value: string) => void;
  onAddProperty: (e: React.FormEvent) => void;
  onDeleteProperty: (key: string) => void;
}

export const PropertiesSection: React.FC<PropertiesSectionProps> = ({
  properties,
  propKey,
  propVal,
  onPropKeyChange,
  onPropValChange,
  onAddProperty,
  onDeleteProperty,
}) => (
  <div className="border-t border-slate-900 pt-4">
    <h4 className="text-[10px] font-bold font-mono text-[#00f0ff] uppercase tracking-wider mb-3">
      Metadata Attributes
    </h4>

    {properties && Object.keys(properties).length > 0 ? (
      <div className="space-y-2 mb-3">
        {Object.entries(properties).map(([key, val]) => (
          <div
            key={key}
            className="flex items-center justify-between bg-slate-950/40 rounded-xl px-3 py-1.5 border border-slate-900 min-w-0"
          >
            <div className="text-xs break-all min-w-0 flex-1 mr-2">
              <span className="font-mono text-brand-400/80">{key}:</span>{' '}
              <span className="text-slate-300 font-semibold">{val}</span>
            </div>
            <button
              onClick={() => onDeleteProperty(key)}
              className="text-slate-500 hover:text-red-400 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-slate-500 italic mb-3">No metadata attributes added.</p>
    )}

    <form onSubmit={onAddProperty} className="flex gap-2">
      <input
        type="text"
        placeholder="Key (e.g. port)"
        value={propKey}
        onChange={e => onPropKeyChange(e.target.value)}
        className="w-1/2 bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.15)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none transition duration-200"
      />
      <input
        type="text"
        placeholder="Value"
        value={propVal}
        onChange={e => onPropValChange(e.target.value)}
        className="w-1/2 bg-slate-950/60 border border-slate-800 focus:border-brand-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.15)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none transition duration-200"
      />
      <button
        type="submit"
        aria-label="Add attribute"
        className="bg-brand-600/15 hover:bg-brand-600/30 text-brand-400 hover:text-white border border-brand-500/30 hover:border-brand-500 rounded-lg p-1.5 flex items-center justify-center transition cursor-pointer shadow-[0_0_8px_rgba(139,92,246,0.15)]"
      >
        <Plus className="w-4 h-4" />
      </button>
    </form>
  </div>
);

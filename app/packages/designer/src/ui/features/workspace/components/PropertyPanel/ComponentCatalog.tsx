import React from 'react';
import type { NodeType } from '@blueprint/core';
import { NODE_TYPES } from './nodeTypes';

interface ComponentCatalogProps {
  showTests: boolean;
  onToggleShowTests: () => void;
  onAddNode: (type: NodeType) => void;
}

export const ComponentCatalog: React.FC<ComponentCatalogProps> = ({
  showTests,
  onToggleShowTests,
  onAddNode,
}) => (
  <>
    <div className="flex items-center justify-between border-t border-slate-900 pt-4">
      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
        Show Test Components
      </span>
      <button
        onClick={onToggleShowTests}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          showTests ? 'bg-brand-600' : 'bg-slate-800'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            showTests ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>

    <div className="border-t border-slate-900 pt-4">
      <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider mb-3">
        Component Catalog
      </h4>
      <p className="text-xs text-slate-400 mb-3">
        Click any component below to instantiate it on the canvas:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {NODE_TYPES.map(nt => {
          const Icon = nt.icon;
          return (
            <button
              key={nt.type}
              onClick={() => onAddNode(nt.type)}
              className="flex flex-col items-center gap-2 bg-slate-950/40 hover:bg-slate-900/50 border border-slate-900 hover:border-brand-500/40 rounded-xl p-3 transition text-center hover:shadow-[0_0_10px_rgba(139,92,246,0.15)] cursor-pointer group"
            >
              <Icon className="w-5 h-5 text-brand-400 filter drop-shadow-[0_0_4px_rgba(139,92,246,0.4)] group-hover:scale-105 transition" />
              <span className="text-xs font-semibold text-slate-200">{nt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </>
);

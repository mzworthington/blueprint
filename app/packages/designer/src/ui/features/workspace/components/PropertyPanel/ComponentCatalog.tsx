import React from 'react';
import type { NodeType } from '@blueprint/core';
import { NODE_TYPES } from './nodeTypes';

interface ComponentCatalogProps {
  onAddNode: (type: NodeType) => void;
}

export const ComponentCatalog: React.FC<ComponentCatalogProps> = ({ onAddNode }) => (
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
);

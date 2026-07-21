import React from 'react';
import { useLocation } from 'wouter';
import { getSchemaEntityRef } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

type SystemSelectorProps = {
  variant?: 'toolbar' | 'menu';
};

export const SystemSelector: React.FC<SystemSelectorProps> = ({ variant = 'toolbar' }) => {
  const [, setLocation] = useLocation();
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const currentFilePath = useBlueprintStore(s => s.currentFilePath);
  const workspaceName = useBlueprintStore(s => s.workspaceName);
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);

  if (!loadedSystems?.length) return null;

  const select = (
    <select
      value={currentFilePath}
      onChange={e => {
        const targetSys = loadedSystems.find(s => s.path === e.target.value);
        if (targetSys) {
          const ref = getSchemaEntityRef(
            targetSys.schema,
            isWorkspaceOpen ? workspaceName : undefined
          );
          setLocation(`/workspace/${ref}`);
        }
      }}
      aria-label="Active system"
      className={
        variant === 'menu'
          ? 'w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-md text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer'
          : 'bg-transparent border-none outline-none text-slate-200 hover:text-slate-100 px-1 py-0.5 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500/40 cursor-pointer transition duration-200 min-w-0 w-full truncate'
      }
    >
      {loadedSystems.map(sys => (
        <option key={sys.path} value={sys.path}>
          {sys.name}
        </option>
      ))}
    </select>
  );

  if (variant === 'menu') {
    return (
      <div className="px-3 py-2 border-b border-slate-900/60 mb-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
          System
        </div>
        {select}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs min-w-0 flex-1 sm:flex-none sm:max-w-[220px] select-none">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 hidden sm:inline shrink-0">
        System:
      </span>
      {select}
    </div>
  );
};

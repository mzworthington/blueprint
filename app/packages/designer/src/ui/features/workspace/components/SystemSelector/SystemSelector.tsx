import React from 'react';
import { useLocation } from 'wouter';
import { getSchemaEntityRef } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

export const SystemSelector: React.FC = () => {
  const [, setLocation] = useLocation();
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const currentFilePath = useBlueprintStore(s => s.currentFilePath);
  const workspaceName = useBlueprintStore(s => s.workspaceName);
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);

  if (!loadedSystems?.length) return null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs min-w-0 flex-1 sm:flex-none sm:max-w-[220px] select-none">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 hidden sm:inline shrink-0">
        System:
      </span>
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
        className="bg-transparent border-none outline-none text-slate-200 hover:text-slate-100 px-1 py-0.5 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500/40 cursor-pointer transition duration-200 min-w-0 w-full truncate"
      >
        {loadedSystems.map(sys => (
          <option key={sys.path} value={sys.path}>
            {sys.name}
          </option>
        ))}
      </select>
    </div>
  );
};

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
    <div className="flex items-center gap-2 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-lg text-xs shrink-0 select-none">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 hidden sm:inline">
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
        className="bg-slate-950 border border-slate-850 text-slate-200 hover:text-slate-100 hover:border-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer transition duration-200 max-w-[130px] truncate"
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

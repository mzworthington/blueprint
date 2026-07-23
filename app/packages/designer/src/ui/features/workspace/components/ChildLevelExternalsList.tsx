import React from 'react';
import type { ChildDiagramExternal } from '@blueprint/core';
import { GoToEntityButton } from './GoToEntityButton';

interface ChildLevelExternalsListProps {
  externals: ChildDiagramExternal[];
  childDiagramLevel: string;
  parentNodeName: string;
  onNavigateToExternal?: () => void;
}

export const ChildLevelExternalsList: React.FC<ChildLevelExternalsListProps> = ({
  externals,
  childDiagramLevel,
  parentNodeName,
  onNavigateToExternal,
}) => (
  <>
    <p className="text-xs text-slate-400 mb-3">
      {externals.length} external{externals.length === 1 ? '' : 's'} on the {childDiagramLevel}{' '}
      diagram inside <span className="font-mono text-slate-300">{parentNodeName}</span>.
    </p>

    <ul
      className="rounded-lg border border-slate-800 bg-slate-950/40 divide-y divide-slate-800/80"
      data-testid="child-level-externals-list"
    >
      {externals.map(external => (
        <li key={external.entityRef} className="p-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-slate-200 truncate">
              {external.name}
            </span>
            <span className="block text-[10px] font-mono text-slate-500 truncate">
              {external.entityRef}
            </span>
            <span className="block text-[10px] text-slate-600 mt-0.5">{external.type}</span>
          </div>
          <GoToEntityButton
            entityRef={external.entityRef}
            label="Go to"
            testId={`go-to-external-${external.entityRef}`}
            onNavigate={onNavigateToExternal}
            className="shrink-0 flex items-center gap-1 text-[10px] font-mono font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
          />
        </li>
      ))}
    </ul>
  </>
);

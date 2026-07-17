import React from 'react';
import { Searchbar } from '../Searchbar/Searchbar';
import { SystemSelector } from '../SystemSelector/SystemSelector';
import {
  ToolbarSaveButton,
  ToolbarOpenMenu,
  ToolbarEditActions,
  ToolbarOverflowMenu,
} from '../ActionControls/ActionControls';

export const WorkspaceToolbar: React.FC = () => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full min-w-0 max-w-[min(calc(100vw-2rem),56rem)]"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Searchbar collapsibleOnMobile />
        <SystemSelector />
        <ToolbarSaveButton />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden sm:block w-px h-6 bg-slate-800" aria-hidden />
        <ToolbarOpenMenu />
        <ToolbarEditActions />
        <ToolbarOverflowMenu />
      </div>
    </div>
  );
};

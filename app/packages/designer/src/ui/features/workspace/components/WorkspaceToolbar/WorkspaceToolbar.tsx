import React from 'react';
import { Searchbar } from '../Searchbar/Searchbar';
import { SystemSelector } from '../SystemSelector/SystemSelector';
import { MobilePanelToggles } from '../MobilePanelToggles/MobilePanelToggles';
import {
  ToolbarSaveButton,
  ToolbarOpenMenu,
  ToolbarEditActions,
  ToolbarOverflowMenu,
  ToolbarNavActions,
} from '../ActionControls/ActionControls';

export const WorkspaceToolbar: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 w-full min-w-0" onClick={e => e.stopPropagation()}>
      <MobilePanelToggles />

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 w-full sm:flex-1">
          <Searchbar collapsibleOnMobile />
          <SystemSelector />
          <ToolbarNavActions />
          <ToolbarSaveButton />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end sm:justify-start">
          <div className="hidden sm:block w-px h-6 bg-slate-800" aria-hidden />
          <ToolbarOpenMenu />
          <ToolbarEditActions />
          <ToolbarOverflowMenu />
        </div>
      </div>
    </div>
  );
};

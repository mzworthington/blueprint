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
    <div
      className="flex flex-col gap-2 w-full min-w-0 max-w-full"
      onClick={e => e.stopPropagation()}
    >
      <MobilePanelToggles />

      {/* Desktop: one row; scroll horizontally if side panels narrow the canvas. Mobile: stack browse vs actions. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 w-full min-w-0 max-w-full sm:overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:shrink-0">
          <Searchbar collapsibleOnMobile />
          <SystemSelector />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end sm:justify-start">
          <ToolbarNavActions />
          <ToolbarSaveButton />
          <div className="hidden sm:block w-px h-6 bg-slate-800 shrink-0" aria-hidden />
          <ToolbarOpenMenu />
          <ToolbarEditActions />
          <ToolbarOverflowMenu />
        </div>
      </div>
    </div>
  );
};

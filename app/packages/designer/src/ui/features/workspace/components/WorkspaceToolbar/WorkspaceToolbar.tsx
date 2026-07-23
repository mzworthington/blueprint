import React from 'react';
import { Searchbar } from '../Searchbar/Searchbar';
import { MobilePanelToggles } from '../MobilePanelToggles/MobilePanelToggles';
import {
  ToolbarEditActions,
  ToolbarOverflowMenu,
  ToolbarPendingChangesButton,
  ToolbarDisplayButton,
  ToolbarShortcutsButton,
} from '../ActionControls/ActionControls';
import { LayoutEngineControls } from '../LayoutEngineControls/LayoutEngineControls';

export const WorkspaceToolbar: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-2 w-full min-w-0 max-w-full"
      onClick={e => e.stopPropagation()}
    >
      <MobilePanelToggles />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 w-full min-w-0 max-w-full sm:overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 w-full sm:flex-1">
          <Searchbar collapsibleOnMobile />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          <LayoutEngineControls />
          <ToolbarDisplayButton />
          <ToolbarShortcutsButton />
          <ToolbarPendingChangesButton />
          <ToolbarEditActions />
          <ToolbarOverflowMenu />
        </div>
      </div>
    </div>
  );
};

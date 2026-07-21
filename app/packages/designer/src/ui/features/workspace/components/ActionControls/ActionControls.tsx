import React, { useCallback } from 'react';
import {
  Cloud,
  Folder,
  Upload,
  Download,
  RefreshCcw,
  GitCompare,
  Undo,
  Redo,
  GitMerge,
  MoreHorizontal,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { useToolbarMenu } from '../WorkspaceToolbar/useToolbarMenu';
import { ToolbarMenuPortal } from '../WorkspaceToolbar/ToolbarMenuPortal';
import { SystemSelector } from '../SystemSelector/SystemSelector';

const iconBtnClass =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center';

const menuPanelClass =
  'min-w-[220px] rounded-xl border border-slate-900 bg-slate-950/95 py-1.5 shadow-2xl backdrop-blur-lg';

const menuItemClass =
  'w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 text-xs font-semibold text-left text-slate-300 hover:bg-slate-900/60 hover:text-slate-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const menuTriggerClass =
  'flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-xs font-semibold border border-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function useControlsDisabled(): boolean {
  return Boolean(useBlueprintStore(s => s.isLoading));
}

function useSaveAction() {
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);
  const saveSchema = useBlueprintStore(s => s.saveSchema);
  const saveActiveDiagram = useBlueprintStore(s => s.saveActiveDiagram);
  const controlsDisabled = useControlsDisabled();

  const handleSave = useCallback(async () => {
    if (isWorkspaceOpen) {
      await saveActiveDiagram();
    } else {
      await saveSchema();
    }
  }, [isWorkspaceOpen, saveActiveDiagram, saveSchema]);

  return { controlsDisabled, handleSave, isWorkspaceOpen };
}

function useOpenActions() {
  const openWorkspaceDirectory = useBlueprintStore(s => s.openWorkspaceDirectory);
  const loadSchema = useBlueprintStore(s => s.loadSchema);
  const controlsDisabled = useControlsDisabled();

  const handleOpenFolder = useCallback(async () => {
    try {
      await openWorkspaceDirectory();
    } catch (err) {
      console.error('Failed to open workspace directory:', err);
    }
  }, [openWorkspaceDirectory]);

  const handleLoad = useCallback(async () => {
    try {
      await loadSchema();
    } catch (err) {
      console.error('Failed to load schema:', err);
    }
  }, [loadSchema]);

  return { controlsDisabled, handleOpenFolder, handleLoad };
}

function useClearAction() {
  const initSchema = useBlueprintStore(s => s.initSchema);
  const setIsLoading = useBlueprintStore(s => s.setIsLoading);
  const controlsDisabled = useControlsDisabled();

  const handleClear = useCallback(async () => {
    if (confirm('Clear the workspace, purge all IndexedDB drafts, and create a blank canvas?')) {
      setIsLoading('Cleaning workspace...');
      const { db } = await import('../../../../../infrastructure/db/db');
      try {
        await Promise.all([
          db.originalNodes.clear(),
          db.workingNodes.clear(),
          db.originalDependencies.clear(),
          db.workingDependencies.clear(),
        ]);
      } catch (err) {
        console.error('Failed to purge IndexedDB databases:', err);
      } finally {
        setIsLoading(false);
      }
      initSchema({
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      });
    }
  }, [initSchema, setIsLoading]);

  return { controlsDisabled, handleClear };
}

export const ToolbarShortcutsButton: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const setIsShortcutsOpen = useBlueprintStore(s => s.setIsShortcutsOpen);

  return (
    <button
      type="button"
      onClick={() => setIsShortcutsOpen(true)}
      disabled={controlsDisabled}
      className={iconBtnClass}
      title="Keyboard shortcuts (?)"
      aria-label="Keyboard shortcuts"
      data-testid="toolbar-shortcuts"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
};

export const ToolbarPendingChangesButton: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const setIsDiffOpen = useBlueprintStore(s => s.setIsDiffOpen);
  const hasPendingChanges = useBlueprintStore(s => s.hasPendingChanges);

  if (!hasPendingChanges) return null;

  return (
    <button
      type="button"
      onClick={() => setIsDiffOpen(true)}
      disabled={controlsDisabled}
      className={`${iconBtnClass} text-amber-400 hover:text-amber-300 border-amber-900/40`}
      title="View pending local changes / diff"
      aria-label="Pending changes"
      id="view-pending-changes"
      data-testid="toolbar-pending-changes"
    >
      <GitCompare className="w-3.5 h-3.5" />
    </button>
  );
};

/** @deprecated Use ToolbarShortcutsButton — compare moved to overflow menu only. */
export const ToolbarNavActions: React.FC = () => {
  return <ToolbarShortcutsButton />;
};

export const ToolbarSaveButton: React.FC = () => {
  const { controlsDisabled, handleSave, isWorkspaceOpen } = useSaveAction();

  return (
    <button
      onClick={handleSave}
      disabled={controlsDisabled}
      className="flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 min-h-11 sm:min-h-0 rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      title={isWorkspaceOpen ? 'Save diagram directly in folder' : 'Save YAML to disk'}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{isWorkspaceOpen ? 'Save' : 'Save'}</span>
    </button>
  );
};

export const ToolbarOpenMenu: React.FC = () => {
  const { controlsDisabled, handleOpenFolder, handleLoad } = useOpenActions();
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);
  const schema = useBlueprintStore(s => s.schema);
  const setIsImportMermaidOpen = useBlueprintStore(s => s.setIsImportMermaidOpen);
  const setIsImportIacOpen = useBlueprintStore(s => s.setIsImportIacOpen);
  const { open, toggle, close, anchorRef, menuRef } = useToolbarMenu();

  const folderTitle = isWorkspaceOpen
    ? 'Open another folder workspace'
    : 'Open a local directory workspace';

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={controlsDisabled}
        className={`${menuTriggerClass} ${!isWorkspaceOpen ? 'border-brand-500/30 bg-brand-600/15 text-brand-400 hover:bg-brand-600/30 hover:text-brand-300' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open menu"
        title="Open workspace, file, or import diagram"
      >
        <FolderOpen className="w-3.5 h-3.5 text-brand-500" />
        <span className="hidden sm:inline">Open</span>
      </button>

      <ToolbarMenuPortal
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        menuClassName={menuPanelClass}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleOpenFolder();
          }}
          disabled={controlsDisabled}
          className={menuItemClass}
          title={folderTitle}
        >
          <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          Open Folder
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleLoad();
          }}
          disabled={controlsDisabled}
          className={menuItemClass}
          title="Open single YAML from disk"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          Open File
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsImportMermaidOpen(true);
          }}
          disabled={controlsDisabled || !schema}
          className={menuItemClass}
          title="Import Mermaid diagram into the active schema"
          id="import-mermaid-action"
        >
          <GitMerge className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
          Import Mermaid
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsImportIacOpen(true);
          }}
          disabled={controlsDisabled || !schema}
          className={menuItemClass}
          title="Import Terraform or Pulumi into the active schema"
          id="import-iac-action"
        >
          <Cloud className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
          Import Infrastructure
        </button>
      </ToolbarMenuPortal>
    </div>
  );
};

export const ToolbarEditActions: React.FC = () => {
  const controlsDisabled = useControlsDisabled();
  const undo = useBlueprintStore(s => s.undo);
  const redo = useBlueprintStore(s => s.redo);
  const past = useBlueprintStore(s => s.past);
  const future = useBlueprintStore(s => s.future);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={undo}
        disabled={past.length === 0 || controlsDisabled}
        className={iconBtnClass}
        title="Undo (Cmd+Z / Ctrl+Z)"
        id="undo-action"
      >
        <Undo className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0 || controlsDisabled}
        className={iconBtnClass}
        title="Redo (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)"
        id="redo-action"
      >
        <Redo className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToolbarOverflowMenu: React.FC = () => {
  const { controlsDisabled, handleClear } = useClearAction();
  const { controlsDisabled: saveDisabled, handleSave, isWorkspaceOpen } = useSaveAction();
  const { controlsDisabled: openDisabled, handleOpenFolder, handleLoad } = useOpenActions();
  const setIsCompareOpen = useBlueprintStore(s => s.setIsCompareOpen);
  const isWorkspaceOpenState = useBlueprintStore(s => s.isWorkspaceOpen);
  const schema = useBlueprintStore(s => s.schema);
  const setIsImportMermaidOpen = useBlueprintStore(s => s.setIsImportMermaidOpen);
  const setIsImportIacOpen = useBlueprintStore(s => s.setIsImportIacOpen);
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const { open, toggle, close, anchorRef, menuRef } = useToolbarMenu();

  const folderTitle = isWorkspaceOpenState
    ? 'Open another folder workspace'
    : 'Open a local directory workspace';

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={controlsDisabled}
        className={iconBtnClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
        title="More actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <ToolbarMenuPortal
        open={open}
        anchorRef={anchorRef}
        menuRef={menuRef}
        menuClassName={menuPanelClass}
      >
        <SystemSelector variant="menu" />

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleSave();
          }}
          disabled={saveDisabled}
          className={menuItemClass}
          title={isWorkspaceOpen ? 'Save diagram directly in folder' : 'Save YAML to disk'}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          Save
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleOpenFolder();
          }}
          disabled={openDisabled}
          className={menuItemClass}
          title={folderTitle}
        >
          <Folder className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          Open Folder
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleLoad();
          }}
          disabled={openDisabled}
          className={menuItemClass}
          title="Open single YAML from disk"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          Open File
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsImportMermaidOpen(true);
          }}
          disabled={openDisabled || !schema}
          className={menuItemClass}
          title="Import Mermaid diagram into the active schema"
          id="import-mermaid-action"
        >
          <GitMerge className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
          Import Mermaid
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsImportIacOpen(true);
          }}
          disabled={openDisabled || !schema}
          className={menuItemClass}
          title="Import Terraform or Pulumi into the active schema"
          id="import-iac-action"
        >
          <Cloud className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
          Import Infrastructure
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            setIsCompareOpen(true);
          }}
          disabled={controlsDisabled || loadedSystems.length < 2}
          className={menuItemClass}
          title="Compare two loaded systems"
          data-testid="toolbar-compare"
        >
          <GitCompare className="w-3.5 h-3.5 shrink-0" />
          Compare Systems
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void handleClear();
          }}
          disabled={controlsDisabled}
          className={`${menuItemClass} text-red-400 hover:text-red-300 hover:bg-red-950/20`}
          title="Clear canvas"
        >
          <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
          Clear Canvas
        </button>
      </ToolbarMenuPortal>
    </div>
  );
};

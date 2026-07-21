import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ToolbarEditActions,
  ToolbarOverflowMenu,
  ToolbarPendingChangesButton,
  ToolbarShortcutsButton,
} from './ActionControls';
import { useBlueprintStore } from '../../../../../application/store/store';

const toolbarActions = (
  <div className="flex items-center gap-1.5">
    <ToolbarShortcutsButton />
    <ToolbarPendingChangesButton />
    <ToolbarEditActions />
    <ToolbarOverflowMenu />
  </div>
);

function renderToolbarActions() {
  return render(toolbarActions);
}

function openMoreMenu() {
  fireEvent.click(screen.getByLabelText('More actions'));
}

describe('ActionControls Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      openWorkspaceDirectory: vi.fn(),
      saveSchema: vi.fn(),
      loadSchema: vi.fn(),
      saveActiveDiagram: vi.fn(),
      initSchema: vi.fn(),
      schema: {
        name: 'Test Schema',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      syncExternalContainers: vi.fn(),
      setIsDiffOpen: vi.fn(),
      past: [],
      future: [],
      undo: vi.fn(),
      redo: vi.fn(),
      hasPendingChanges: false,
      isLoading: false,
      setIsLoading: vi.fn(),
      layoutEngine: null,
      setLayoutEngine: vi.fn(),
      loadedSystems: [],
    });
  });

  it('shows pending changes button only when hasPendingChanges is true', () => {
    const { rerender } = renderToolbarActions();
    expect(screen.queryByTitle('View pending local changes / diff')).not.toBeInTheDocument();

    useBlueprintStore.setState({ hasPendingChanges: true });
    rerender(toolbarActions);
    expect(screen.getByTitle('View pending local changes / diff')).toBeInTheDocument();
  });

  it('renders correctly when workspace is closed', () => {
    renderToolbarActions();

    openMoreMenu();
    expect(screen.getByTitle('Open a local directory workspace')).toBeInTheDocument();
    expect(screen.getByTitle('Open single YAML from disk')).toBeInTheDocument();
    expect(screen.getByTitle('Save YAML to disk')).toBeInTheDocument();
    expect(screen.getByTitle('Clear canvas')).toBeInTheDocument();
  });

  it('renders correctly when workspace is open', () => {
    useBlueprintStore.setState({ isWorkspaceOpen: true });
    renderToolbarActions();

    openMoreMenu();
    expect(screen.getByTitle('Open another folder workspace')).toBeInTheDocument();
    expect(screen.getByTitle('Save diagram directly in folder')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('triggers openWorkspaceDirectory on clicking Open Folder', () => {
    const openWorkspaceDirectoryMock = vi.fn();
    useBlueprintStore.setState({ openWorkspaceDirectory: openWorkspaceDirectoryMock });

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Open a local directory workspace'));

    expect(openWorkspaceDirectoryMock).toHaveBeenCalledTimes(1);
  });

  it('triggers loadSchema on clicking Open File', () => {
    const loadSchemaMock = vi.fn();
    useBlueprintStore.setState({ loadSchema: loadSchemaMock });

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Open single YAML from disk'));

    expect(loadSchemaMock).toHaveBeenCalledTimes(1);
  });

  it('triggers saveSchema on clicking Save when workspace is closed', () => {
    const saveSchemaMock = vi.fn();
    useBlueprintStore.setState({ saveSchema: saveSchemaMock });

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Save YAML to disk'));

    expect(saveSchemaMock).toHaveBeenCalledTimes(1);
  });

  it('triggers saveActiveDiagram on clicking Save when workspace is open', () => {
    const saveActiveDiagramMock = vi.fn();
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      saveActiveDiagram: saveActiveDiagramMock,
    });

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Save diagram directly in folder'));

    expect(saveActiveDiagramMock).toHaveBeenCalledTimes(1);
  });

  it('triggers initSchema on clearing canvas if confirmed', async () => {
    const initSchemaMock = vi.fn();
    const setIsLoadingMock = vi.fn();
    useBlueprintStore.setState({ initSchema: initSchemaMock, setIsLoading: setIsLoadingMock });

    vi.mock('../../../../../infrastructure/db/db', () => ({
      db: {
        originalNodes: { clear: vi.fn().mockResolvedValue(undefined) },
        workingNodes: { clear: vi.fn().mockResolvedValue(undefined) },
        originalDependencies: { clear: vi.fn().mockResolvedValue(undefined) },
        workingDependencies: { clear: vi.fn().mockResolvedValue(undefined) },
      },
    }));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Clear canvas'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(confirmSpy).toHaveBeenCalledWith(
      'Clear the workspace, purge all IndexedDB drafts, and create a blank canvas?'
    );
    expect(initSchemaMock).toHaveBeenCalledWith({
      name: 'Empty Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });

    confirmSpy.mockRestore();
  });

  it('does not trigger initSchema on clearing canvas if not confirmed', () => {
    const initSchemaMock = vi.fn();
    useBlueprintStore.setState({ initSchema: initSchemaMock });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderToolbarActions();
    openMoreMenu();
    fireEvent.click(screen.getByTitle('Clear canvas'));

    expect(initSchemaMock).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('disables buttons when isLoading is true', () => {
    useBlueprintStore.setState({ isLoading: true });
    renderToolbarActions();

    expect(screen.getByLabelText('More actions')).toBeDisabled();
    expect(screen.getByLabelText('Keyboard shortcuts')).toBeDisabled();
  });

  it('disables undo button when past history is empty, enables and triggers action when filled', () => {
    const undoMock = vi.fn();
    useBlueprintStore.setState({
      past: [],
      undo: undoMock,
    });

    const { rerender } = renderToolbarActions();
    const undoBtn = screen.getByTitle('Undo (Cmd+Z / Ctrl+Z)');
    expect(undoBtn).toBeDisabled();

    useBlueprintStore.setState({
      past: [{ nodes: [], edges: [], schema: {} as any }],
    });
    rerender(toolbarActions);
    expect(undoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect(undoMock).toHaveBeenCalledTimes(1);
  });

  it('disables redo button when future history is empty, enables and triggers action when filled', () => {
    const redoMock = vi.fn();
    useBlueprintStore.setState({
      future: [],
      redo: redoMock,
    });

    const { rerender } = renderToolbarActions();
    const redoBtn = screen.getByTitle('Redo (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)');
    expect(redoBtn).toBeDisabled();

    useBlueprintStore.setState({
      future: [{ nodes: [], edges: [], schema: {} as any }],
    });
    rerender(toolbarActions);
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(redoBtn);
    expect(redoMock).toHaveBeenCalledTimes(1);
  });
});

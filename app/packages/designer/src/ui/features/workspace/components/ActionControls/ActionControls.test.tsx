import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionControls } from './ActionControls';
import { useBlueprintStore } from '../../../../../application/store/store';

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
      past: [],
      future: [],
      undo: vi.fn(),
      redo: vi.fn(),
      hasPendingChanges: false,
      isLoading: false,
      setIsLoading: vi.fn(),
    });
  });

  it('shows pending changes button only when hasPendingChanges is true', () => {
    const { rerender } = render(<ActionControls />);
    expect(screen.queryByTitle('View pending local changes / diff')).not.toBeInTheDocument();

    useBlueprintStore.setState({ hasPendingChanges: true });
    rerender(<ActionControls />);
    expect(screen.getByTitle('View pending local changes / diff')).toBeInTheDocument();
  });

  it('renders correctly when workspace is closed', () => {
    render(<ActionControls />);

    const openFolderBtn = screen.getByTitle('Open a local directory workspace');
    expect(openFolderBtn).toBeInTheDocument();
    expect(screen.getByTitle('Open single YAML from disk')).toBeInTheDocument();
    expect(screen.getByTitle('Save YAML to disk')).toBeInTheDocument();
    expect(screen.getByTitle('Clear canvas')).toBeInTheDocument();
  });

  it('renders correctly when workspace is open', () => {
    useBlueprintStore.setState({ isWorkspaceOpen: true });
    render(<ActionControls />);

    const openFolderBtn = screen.getByTitle('Open another folder workspace');
    expect(openFolderBtn).toBeInTheDocument();
    expect(screen.getByTitle('Save diagram directly in folder')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('triggers openWorkspaceDirectory on clicking Open Folder', () => {
    const openWorkspaceDirectoryMock = vi.fn();
    useBlueprintStore.setState({ openWorkspaceDirectory: openWorkspaceDirectoryMock });

    render(<ActionControls />);
    const btn = screen.getByTitle('Open a local directory workspace');
    fireEvent.click(btn);

    expect(openWorkspaceDirectoryMock).toHaveBeenCalledTimes(1);
  });

  it('triggers loadSchema on clicking Open File', () => {
    const loadSchemaMock = vi.fn();
    useBlueprintStore.setState({ loadSchema: loadSchemaMock });

    render(<ActionControls />);
    const btn = screen.getByTitle('Open single YAML from disk');
    fireEvent.click(btn);

    expect(loadSchemaMock).toHaveBeenCalledTimes(1);
  });

  it('triggers saveSchema on clicking Save Schema when workspace is closed', () => {
    const saveSchemaMock = vi.fn();
    useBlueprintStore.setState({ saveSchema: saveSchemaMock });

    render(<ActionControls />);
    const btn = screen.getByTitle('Save YAML to disk');
    fireEvent.click(btn);

    expect(saveSchemaMock).toHaveBeenCalledTimes(1);
  });

  it('triggers saveActiveDiagram on clicking Save when workspace is open', () => {
    const saveActiveDiagramMock = vi.fn();
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      saveActiveDiagram: saveActiveDiagramMock,
    });

    render(<ActionControls />);
    const btn = screen.getByTitle('Save diagram directly in folder');
    fireEvent.click(btn);

    expect(saveActiveDiagramMock).toHaveBeenCalledTimes(1);
  });

  it('triggers initSchema on clearing canvas if confirmed', async () => {
    const initSchemaMock = vi.fn();
    const setIsLoadingMock = vi.fn();
    useBlueprintStore.setState({ initSchema: initSchemaMock, setIsLoading: setIsLoadingMock });

    // Mock dynamic import database object
    vi.mock('../../../../../infrastructure/db/db', () => ({
      db: {
        originalNodes: { clear: vi.fn().mockResolvedValue(undefined) },
        workingNodes: { clear: vi.fn().mockResolvedValue(undefined) },
        originalDependencies: { clear: vi.fn().mockResolvedValue(undefined) },
        workingDependencies: { clear: vi.fn().mockResolvedValue(undefined) },
      },
    }));

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ActionControls />);
    const btn = screen.getByTitle('Clear canvas');
    fireEvent.click(btn);

    // Wait multiple ticks for async module import & clear operations to complete
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

    render(<ActionControls />);
    const btn = screen.getByTitle('Clear canvas');
    fireEvent.click(btn);

    expect(initSchemaMock).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('disables buttons when isLoading is true', () => {
    useBlueprintStore.setState({ isLoading: true });
    render(<ActionControls />);

    expect(screen.getByTitle('Open a local directory workspace')).toBeDisabled();
    expect(screen.getByTitle('Open single YAML from disk')).toBeDisabled();
    expect(screen.getByTitle('Save YAML to disk')).toBeDisabled();
    expect(screen.getByTitle('Clear canvas')).toBeDisabled();
  });

  it('renders Sync Externals button and triggers sync when workspace is open and schema level is component', () => {
    const syncMock = vi.fn();
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      schema: {
        name: 'Test Component Schema',
        version: '1.0.0',
        level: 'component',
        nodes: [],
        dependencies: [],
      },
      syncExternalContainers: syncMock,
    });

    render(<ActionControls />);
    const syncBtn = screen.getByTitle(
      'Sync related container dependencies as external nodes in this view'
    );
    expect(syncBtn).toBeInTheDocument();
    fireEvent.click(syncBtn);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it('disables undo button when past history is empty, enables and triggers action when filled', () => {
    const undoMock = vi.fn();
    useBlueprintStore.setState({
      past: [],
      undo: undoMock,
    });

    const { rerender } = render(<ActionControls />);
    const undoBtn = screen.getByTitle('Undo (Cmd+Z / Ctrl+Z)');
    expect(undoBtn).toBeDisabled();

    useBlueprintStore.setState({
      past: [{ nodes: [], edges: [], schema: {} as any }],
    });
    rerender(<ActionControls />);
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

    const { rerender } = render(<ActionControls />);
    const redoBtn = screen.getByTitle('Redo (Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y)');
    expect(redoBtn).toBeDisabled();

    useBlueprintStore.setState({
      future: [{ nodes: [], edges: [], schema: {} as any }],
    });
    rerender(<ActionControls />);
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(redoBtn);
    expect(redoMock).toHaveBeenCalledTimes(1);
  });
});

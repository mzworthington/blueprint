import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionControls } from './ActionControls';
import { useBlueprintStore } from '../store/store';

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
    });
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

  it('triggers initSchema on clearing canvas if confirmed', () => {
    const initSchemaMock = vi.fn();
    useBlueprintStore.setState({ initSchema: initSchemaMock });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ActionControls />);
    const btn = screen.getByTitle('Clear canvas');
    fireEvent.click(btn);

    expect(confirmSpy).toHaveBeenCalledWith('Clear the workspace and create a blank canvas?');
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
});

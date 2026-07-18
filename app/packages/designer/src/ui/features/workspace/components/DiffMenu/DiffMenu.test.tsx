import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffMenu } from './DiffMenu';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { WorkingCopyPort } from '../../../../../core';

const computeSchemaDiff = vi.fn();
const revertWorkingSchema = vi.fn();

const mockWorkingCopy: WorkingCopyPort = {
  saveBaselineSchema: vi.fn().mockResolvedValue(undefined),
  saveWorkingSchema: vi.fn().mockResolvedValue(undefined),
  computeSchemaDiff: ((...args: unknown[]) =>
    computeSchemaDiff(...args)) as WorkingCopyPort['computeSchemaDiff'],
  revertWorkingSchema: ((...args: unknown[]) =>
    revertWorkingSchema(...args)) as WorkingCopyPort['revertWorkingSchema'],
  pathHasStoredData: vi.fn().mockResolvedValue(false),
  loadWorkingSchema: vi.fn().mockResolvedValue(null),
};

describe('DiffMenu Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useBlueprintStore.setState({
      currentFilePath: 'blueprints/cli.yaml',
      workingCopyPort: mockWorkingCopy,
      loadedSystems: [
        {
          path: 'blueprints/cli.yaml',
          name: 'CLI System',
          schema: {
            name: 'CLI System',
            version: '1.0.0',
            level: 'container' as const,
            nodes: [],
            dependencies: [],
          },
        },
      ],
      initSchema: vi.fn(),
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      } as any,
    });
  });

  it('is hidden when isOpen is false', () => {
    const { container } = render(<DiffMenu isOpen={false} onClose={mockOnClose} />);
    const firstChild = container.firstChild as HTMLElement;
    expect(firstChild.className).toContain('invisible');
  });

  it('renders up to date message when there are no structural differences', async () => {
    computeSchemaDiff.mockResolvedValueOnce({
      nodes: { added: [], modified: [], deleted: [] },
      dependencies: { added: [], deleted: [] },
    });

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace is Up to Date')).toBeInTheDocument();
    });
  });

  it('displays added, modified, and deleted component nodes and connections', async () => {
    computeSchemaDiff.mockResolvedValueOnce({
      nodes: {
        added: [
          {
            entityRef: 'cli/new-service',
            id: 'new-service',
            systemId: 'cli',
            type: 'microservice',
            name: 'New Service',
            properties: {},
            filePath: 'blueprints/cli.yaml',
          },
        ],
        modified: [
          {
            original: {
              entityRef: 'cli/existing-service',
              id: 'existing-service',
              systemId: 'cli',
              type: 'microservice',
              name: 'Old Name',
              properties: {},
              filePath: 'blueprints/cli.yaml',
            },
            current: {
              entityRef: 'cli/existing-service',
              id: 'existing-service',
              systemId: 'cli',
              type: 'microservice',
              name: 'Updated Name',
              properties: {},
              filePath: 'blueprints/cli.yaml',
            },
          },
        ],
        deleted: [
          {
            entityRef: 'cli/old-service',
            id: 'old-service',
            systemId: 'cli',
            type: 'microservice',
            name: 'Old Service',
            properties: {},
            filePath: 'blueprints/cli.yaml',
          },
        ],
      },
      dependencies: {
        added: [
          {
            id: 'cli/new-service->cli/existing-service',
            fromRef: 'cli/new-service',
            toRef: 'cli/existing-service',
            type: 'grpc',
            filePath: 'blueprints/cli.yaml',
          },
        ],
        deleted: [],
      },
    });

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('New Service')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Updated Name')).toHaveLength(2);
    expect(screen.getByText('Old Service')).toBeInTheDocument();
    expect(screen.getByText('Added Conn')).toBeInTheDocument();
  });

  it('triggers revert schema operations and calls initSchema when Revert is confirmed', async () => {
    computeSchemaDiff.mockResolvedValueOnce({
      nodes: {
        added: [
          {
            entityRef: 'cli/new-service',
            id: 'new-service',
            systemId: 'cli',
            type: 'microservice',
            name: 'New Service',
            properties: {},
            filePath: 'blueprints/cli.yaml',
          },
        ],
        modified: [],
        deleted: [],
      },
      dependencies: { added: [], deleted: [] },
    });

    const mockInitSchema = vi.fn();
    useBlueprintStore.setState({ initSchema: mockInitSchema });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mockRestoredSchema = {
      name: 'CLI System',
      version: '1.0.0',
      level: 'container' as const,
      nodes: [],
      dependencies: [],
    };
    revertWorkingSchema.mockResolvedValueOnce(mockRestoredSchema);

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Revert Changes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Revert Changes'));

    await waitFor(() => {
      expect(revertWorkingSchema).toHaveBeenCalledWith({
        filePath: 'blueprints/cli.yaml',
        systemName: 'CLI System',
        systemVersion: '1.0.0',
        systemLevel: 'container',
        systemEntityRef: undefined,
      });
      expect(mockInitSchema).toHaveBeenCalledWith(mockRestoredSchema);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    confirmSpy.mockRestore();
  });

  it('triggers commit schema operations and calls saveActiveDiagram when Commit is clicked', async () => {
    computeSchemaDiff.mockResolvedValueOnce({
      nodes: {
        added: [
          {
            entityRef: 'cli/new-service',
            id: 'new-service',
            systemId: 'cli',
            type: 'microservice',
            name: 'New Service',
            properties: {},
            filePath: 'blueprints/cli.yaml',
          },
        ],
        modified: [],
        deleted: [],
      },
      dependencies: { added: [], deleted: [] },
    });

    const mockSaveActiveDiagram = vi.fn().mockResolvedValue(true);
    const mockSetNotification = vi.fn();
    useBlueprintStore.setState({
      saveActiveDiagram: mockSaveActiveDiagram,
      setNotification: mockSetNotification,
    });

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Commit Changes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Commit Changes'));

    await waitFor(() => {
      expect(mockSaveActiveDiagram).toHaveBeenCalledTimes(1);
      expect(mockSetNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Changes Committed',
        message: 'Successfully committed pending draft changes to cli.yaml',
      });
    });
  });
});

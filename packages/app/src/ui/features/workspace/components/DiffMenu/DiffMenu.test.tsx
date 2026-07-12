import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffMenu } from './DiffMenu';
import { useBlueprintStore } from '../../../../../application/store/store';
import { computeSchemaDiff, revertWorkingSchema } from '../../../../../infrastructure/db/db';

// Mock DB operations
vi.mock('../../../../../infrastructure/db/db', () => ({
  db: {
    originalNodes: { where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }) },
    originalDependencies: {
      where: () => ({ equals: () => ({ toArray: () => Promise.resolve([]) }) }),
    },
    workingNodes: {
      where: () => ({ equals: () => ({ delete: () => Promise.resolve() }) }),
      bulkPut: () => Promise.resolve(),
    },
    workingDependencies: {
      where: () => ({ equals: () => ({ delete: () => Promise.resolve() }) }),
      bulkPut: () => Promise.resolve(),
    },
    transaction: (_mode: any, _tables: any, fn: any) => fn(),
  },
  computeSchemaDiff: vi.fn(),
  revertWorkingSchema: vi.fn(),
  saveBaselineSchema: vi.fn().mockResolvedValue(undefined),
  saveWorkingSchema: vi.fn().mockResolvedValue(undefined),
}));

describe('DiffMenu Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useBlueprintStore.setState({
      currentFilePath: 'blueprints/cli.yaml',
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
    vi.mocked(computeSchemaDiff).mockResolvedValueOnce({
      nodes: { added: [], modified: [], deleted: [] },
      dependencies: { added: [], deleted: [] },
    });

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Workspace is Up to Date')).toBeInTheDocument();
    });
  });

  it('displays added, modified, and deleted component nodes and connections', async () => {
    vi.mocked(computeSchemaDiff).mockResolvedValueOnce({
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
    vi.mocked(computeSchemaDiff).mockResolvedValueOnce({
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
    vi.mocked(revertWorkingSchema).mockResolvedValueOnce(mockRestoredSchema);

    render(<DiffMenu isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Revert Changes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Revert Changes'));

    await waitFor(() => {
      expect(revertWorkingSchema).toHaveBeenCalledWith(
        'blueprints/cli.yaml',
        'CLI System',
        '1.0.0',
        'container',
        undefined
      );
      expect(mockInitSchema).toHaveBeenCalledWith(mockRestoredSchema);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    confirmSpy.mockRestore();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Canvas } from './Canvas';
import { useBlueprintStore } from '../store/store';

vi.mock('@xyflow/react', () => {
  return {
    ReactFlow: ({ children, nodes, edges, onNodeDoubleClick }: any) => (
      <div data-testid="react-flow">
        <div data-testid="nodes-count">{nodes.length}</div>
        <div data-testid="edges-count">{edges.length}</div>
        <button
          data-testid="double-click-node"
          onClick={() =>
            onNodeDoubleClick &&
            onNodeDoubleClick(null, { id: 'test-node-1', data: { c4Ref: './child.yaml' } })
          }
        >
          Double Click Node
        </button>
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
    Panel: ({ children, position }: any) => <div data-testid={`panel-${position}`}>{children}</div>,
    BackgroundVariant: {
      Dots: 'dots',
    },
    useReactFlow: () => ({
      fitView: vi.fn(),
    }),
  };
});

vi.mock('./Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs">Breadcrumbs Mock</div>,
}));

describe('Canvas Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'System Canvas Test',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { id: 'node1', type: 'rest-api', name: 'Node 1', x: 10, y: 10 },
        { id: 'node2', type: 'relational-database', name: 'Node 2', x: 100, y: 100 },
      ],
      dependencies: [{ from: 'node1', to: 'node2', type: 'direct-call' }],
    });
    useBlueprintStore.setState({
      lastError: null,
      isWorkspaceOpen: false,
      validationResult: { isValid: true, issues: [] },
      loadedSystems: [],
    });
  });

  it('renders canvas layout with correct count of nodes and edges', () => {
    render(<Canvas />);

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });

  it('displays cycle warning validation status badge when cycle is present', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
    });

    render(<Canvas />);
    expect(screen.getByText('Cycle Detected')).toBeInTheDocument();
  });

  it('renders system switcher dropdown when multiple loaded systems exist', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'sys1.yaml',
          name: 'System 1',
          schema: { name: 'S1', version: '1.0.0', level: 'container', nodes: [], dependencies: [] },
        },
        {
          path: 'sys2.yaml',
          name: 'System 2',
          schema: { name: 'S2', version: '1.0.0', level: 'container', nodes: [], dependencies: [] },
        },
      ],
      currentFilePath: 'sys1.yaml',
    });

    render(<Canvas />);

    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('System 1')).toBeInTheDocument();
    expect(screen.getByText('System 2')).toBeInTheDocument();
  });

  it('triggers selectSystem when selecting another system in dropdown', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'sys1.yaml',
          name: 'System 1',
          schema: { name: 'S1', version: '1.0.0', level: 'container', nodes: [], dependencies: [] },
        },
        {
          path: 'sys2.yaml',
          name: 'System 2',
          schema: { name: 'S2', version: '1.0.0', level: 'container', nodes: [], dependencies: [] },
        },
      ],
      currentFilePath: 'sys1.yaml',
    });

    render(<Canvas />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sys2.yaml' } });

    expect(useBlueprintStore.getState().currentFilePath).toBe('sys2.yaml');
  });

  it('triggers openWorkspaceDirectory store action when Open Folder is clicked', async () => {
    const selectDirectoryMock = vi.fn().mockResolvedValue(true);
    const readDirectoryFilesMock = vi.fn().mockResolvedValue([
      {
        name: 'sys.yaml',
        content:
          'name: Loaded System\nversion: "1.0.0"\nlevel: container\nnodes: []\ndependencies: []',
      },
    ]);
    useBlueprintStore.setState({
      workspacePort: {
        selectDirectory: selectDirectoryMock,
        readDirectoryFiles: readDirectoryFilesMock,
        getDirectoryName: () => 'MockedDir',
      } as any,
    });

    render(<Canvas />);

    fireEvent.click(screen.getByTitle('Open a local directory workspace'));

    expect(selectDirectoryMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(useBlueprintStore.getState().isWorkspaceOpen).toBe(true);
    });
  });

  it('renders error alert notification toast when lastError is set', () => {
    useBlueprintStore.setState({ lastError: 'Could not load YAML blueprint' });

    render(<Canvas />);

    expect(screen.getByText('Schema Import Failed')).toBeInTheDocument();
    expect(screen.getByText('Could not load YAML blueprint')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss'));
    expect(useBlueprintStore.getState().lastError).toBeNull();
  });

  it('triggers zoomIntoNode store action on double clicking a C4 node', async () => {
    const mockFiles: Record<string, string> = {
      'blueprint.yaml': `
name: Root Context
version: 1.0.0
level: context
nodes:
  - id: test-node-1
    type: web-app
    name: Web App
    c4Ref: ./child.yaml
dependencies: []
`,
      'child.yaml': `
name: Child Level
version: 1.0.0
level: container
nodes: []
dependencies: []
`,
    };

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      currentFilePath: 'blueprint.yaml',
      workspacePort: {
        readFile: async (path: string) => mockFiles[path],
      } as any,
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Root Context',
      version: '1.0.0',
      level: 'context',
      nodes: [{ id: 'test-node-1', type: 'web-app', name: 'Web App', c4Ref: './child.yaml' }],
      dependencies: [],
    });

    render(<Canvas />);

    fireEvent.click(screen.getByTestId('double-click-node'));

    await waitFor(() => {
      expect(useBlueprintStore.getState().currentFilePath).toBe('child.yaml');
    });
  });

  it('triggers zoomOut store action on zoomOut Escape/Backspace keyboard events', () => {
    useBlueprintStore.setState({
      navigationStack: [
        {
          path: 'parent.yaml',
          schema: { name: 'Parent', version: '1', level: 'container', nodes: [], dependencies: [] },
        },
      ],
      currentFilePath: 'child.yaml',
    });

    render(<Canvas />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(useBlueprintStore.getState().currentFilePath).toBe('parent.yaml');
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Canvas } from './Canvas';
import { Header } from '../Header/Header';
import { useBlueprintStore } from '../../../../../application/store/store';

const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/blueprint', mockSetLocation],
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

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
            onNodeDoubleClick(null, {
              id: 'test-node-1',
              data: { entityRef: 'default/test-node-1' },
            })
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

vi.mock('../Breadcrumbs/Breadcrumbs', () => ({
  Breadcrumbs: () => <div data-testid="breadcrumbs">Breadcrumbs Mock</div>,
}));

vi.mock('../Searchbar/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

describe('Canvas Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'System Canvas Test',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'node1', type: 'rest-api', name: 'Node 1', x: 10, y: 10 },
        { entityRef: 'node2', type: 'relational-database', name: 'Node 2', x: 100, y: 100 },
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

  it('overlays coupling edges when showCoupling is on for a selected node', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Coupling Canvas',
      version: '1.0.0',
      level: 'code',
      nodes: [
        {
          entityRef: 'comp-a',
          type: 'component',
          name: 'A',
          x: 0,
          y: 0,
          properties: { filepath: 'src/a.ts' },
          forensics: {
            coupledFiles: [{ path: 'src/b.ts', score: 0.9, sharedCommits: 7 }],
          },
        },
        {
          entityRef: 'comp-b',
          type: 'component',
          name: 'B',
          x: 100,
          y: 100,
          properties: { filepath: 'src/b.ts' },
        },
      ],
      dependencies: [],
    });
    useBlueprintStore.setState({ selectedNodeId: 'comp-a', showCoupling: true, showTests: true });

    render(<Canvas />);

    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
  });

  it('displays cycle warning validation status badge when cycle is present', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
    });

    render(<Header />);
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
    expect(screen.getByRole('combobox', { name: 'Active system' })).toBeInTheDocument();
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

    fireEvent.change(screen.getByRole('combobox', { name: 'Active system' }), {
      target: { value: 'sys2.yaml' },
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/s2');
  });

  it('triggers openWorkspaceDirectory store action when Open Folder is clicked', async () => {
    const openWorkspaceDirectory = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openWorkspaceDirectory });

    render(<Canvas />);

    fireEvent.click(screen.getByTitle('Open a local directory workspace'));

    await waitFor(() => {
      expect(openWorkspaceDirectory).toHaveBeenCalled();
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
    const parentSchema = {
      name: 'Root Context',
      version: '1.0.0',
      level: 'container' as const,
      nodes: [
        {
          id: 'test-node-1',
          type: 'web-app' as const,
          name: 'Web App',
          entityRef: 'default/test-node-1',
        },
      ],
      dependencies: [],
    };

    const childSchema = {
      name: 'Child Level',
      version: '1.0.0',
      level: 'component' as const,
      entityRef: 'default/test-node-1',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      workspaceName: 'default',
      loadedSystems: [
        { path: 'blueprint.yaml', name: 'Root Context', schema: parentSchema },
        { path: 'child.yaml', name: 'Child Level', schema: childSchema },
      ],
      currentFilePath: 'blueprint.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema(parentSchema);

    render(<Canvas />);

    fireEvent.click(screen.getByTestId('double-click-node'));

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/default/test-node-1');
    });
  });

  const drillInFixtures = () => {
    const parentSchema = {
      name: 'Root Context',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'root',
      nodes: [
        {
          entityRef: 'root/web-app',
          type: 'web-app' as const,
          name: 'Web App',
        },
      ],
      dependencies: [],
    };

    const childSchema = {
      name: 'Web Containers',
      version: '1.0.0',
      level: 'container' as const,
      entityRef: 'root/web-app',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      workspaceName: 'default',
      loadedSystems: [
        { path: 'context.yaml', name: 'Root Context', schema: parentSchema },
        { path: 'containers.yaml', name: 'Web Containers', schema: childSchema },
      ],
      currentFilePath: 'containers.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema(childSchema);
  };

  it('navigates to parent system when Escape is pressed', async () => {
    mockSetLocation.mockClear();
    drillInFixtures();
    render(<Canvas />);

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
    });
  });

  it('navigates to parent system when Backspace is pressed', async () => {
    mockSetLocation.mockClear();
    drillInFixtures();
    render(<Canvas />);

    fireEvent.keyDown(window, { key: 'Backspace' });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
    });
  });

  it('shows a Zoom out button that navigates to the parent system', async () => {
    mockSetLocation.mockClear();
    drillInFixtures();
    render(<Canvas />);

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
    });
  });
});

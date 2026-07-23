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
        <div data-testid="heated-nodes-count">
          {nodes.filter((n: any) => (n.data?.hotspotHeat ?? 0) > 0).length}
        </div>
        <div data-testid="animated-edges-count">{edges.filter((e: any) => e.animated).length}</div>
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
      getInternalNode: () => undefined,
      screenToFlowPosition: (pos: { x: number; y: number }) => pos,
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
      liteCanvas: false,
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

  it('hides MiniMap and Background when liteCanvas is on', () => {
    useBlueprintStore.setState({ liteCanvas: true });
    render(<Canvas />);

    expect(screen.queryByTestId('minimap')).not.toBeInTheDocument();
    expect(screen.queryByTestId('background')).not.toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
  });

  it('caps edge animation to selection neighborhood when liteCanvas is on', () => {
    useBlueprintStore.setState({
      liteCanvas: true,
      selectedNodeId: 'node1',
      showSelectedDependenciesOnly: true,
    });
    render(<Canvas />);

    expect(screen.getByTestId('animated-edges-count')).toHaveTextContent('1');
  });

  it('focuses coupling neighbors and hides other nodes and schema links', () => {
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
        {
          entityRef: 'comp-c',
          type: 'component',
          name: 'C',
          x: 200,
          y: 200,
          properties: { filepath: 'src/c.ts' },
        },
      ],
      dependencies: [
        { from: 'comp-a', to: 'comp-c', type: 'direct-call' },
        { from: 'comp-b', to: 'comp-c', type: 'direct-call' },
      ],
    });
    useBlueprintStore.setState({ selectedNodeId: 'comp-a', showCoupling: true, showTests: true });

    render(<Canvas />);

    expect(screen.getByTestId('nodes-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('1');
  });

  it('hides external nodes when showExternals is off', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Externals Canvas',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'comp-a',
          type: 'component',
          name: 'A',
          x: 0,
          y: 0,
        },
        {
          entityRef: 'comp-ext',
          type: 'component',
          name: 'External Peer',
          external: true,
          x: 100,
          y: 100,
        },
      ],
      dependencies: [{ from: 'comp-a', to: 'comp-ext', type: 'direct-call' }],
    });
    useBlueprintStore.setState({ showTests: true, showExternals: false });

    render(<Canvas />);

    expect(screen.getByTestId('nodes-count')).toHaveTextContent('1');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('0');
  });

  it('keeps selected node and transitive upstream + downstream deps when focus toggle is on', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Dependency Focus',
      version: '1.0.0',
      level: 'component',
      nodes: [
        { entityRef: 'a', type: 'component', name: 'A', x: 0, y: 0 },
        { entityRef: 'b', type: 'component', name: 'B', x: 100, y: 0 },
        { entityRef: 'c', type: 'component', name: 'C', x: 200, y: 0 },
        { entityRef: 'orphan', type: 'component', name: 'Orphan', x: 300, y: 0 },
      ],
      dependencies: [
        { from: 'a', to: 'b', type: 'direct-call' },
        { from: 'b', to: 'c', type: 'direct-call' },
      ],
    });
    useBlueprintStore.setState({
      selectedNodeId: 'c',
      showTests: true,
      showExternals: true,
      showSelectedDependenciesOnly: true,
    });

    render(<Canvas />);

    expect(screen.getByTestId('nodes-count')).toHaveTextContent('3');
    expect(screen.getByTestId('edges-count')).toHaveTextContent('2');
  });

  it('applies hotspot heat to nodes when showHotspotHeatmap is on', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Heatmap Canvas',
      version: '1.0.0',
      level: 'code',
      nodes: [
        {
          entityRef: 'comp-hot',
          type: 'component',
          name: 'Hot',
          x: 0,
          y: 0,
          forensics: { hotspotScore: 0.9 },
        },
        {
          entityRef: 'comp-cold',
          type: 'component',
          name: 'Cold',
          x: 100,
          y: 100,
        },
      ],
      dependencies: [],
    });
    useBlueprintStore.setState({ showHotspotHeatmap: true, showTests: true });

    render(<Canvas />);

    expect(screen.getByTestId('heated-nodes-count')).toHaveTextContent('1');
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

    fireEvent.click(screen.getByLabelText('More actions'));
    expect(screen.getByText('System')).toBeInTheDocument();
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

    fireEvent.click(screen.getByLabelText('More actions'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Active system' }), {
      target: { value: 'sys2.yaml' },
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/s2');
  });

  it('triggers openWorkspaceDirectory store action when Open Folder is clicked', async () => {
    const openWorkspaceDirectory = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openWorkspaceDirectory });

    render(<Canvas />);

    fireEvent.click(screen.getByLabelText('More actions'));
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
      workspaceCatalog: [
        {
          path: 'blueprint.yaml',
          name: 'Root Context',
          level: 'context',
          entityRef: 'root',
          nodeEntityRefs: ['default/test-node-1'],
        },
        {
          path: 'child.yaml',
          name: 'Child Level',
          level: 'component',
          entityRef: 'default/test-node-1',
          nodeEntityRefs: [],
          parentEntityRef: 'root',
        },
      ],
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
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Root Context',
          level: 'context',
          entityRef: 'root',
          nodeEntityRefs: ['root/web-app'],
        },
        {
          path: 'containers.yaml',
          name: 'Web Containers',
          level: 'container',
          entityRef: 'root/web-app',
          nodeEntityRefs: [],
          parentEntityRef: 'root',
        },
      ],
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
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    drillInFixtures();
    useBlueprintStore.setState({ selectSystem });
    render(<Canvas />);

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
      expect(selectSystem).toHaveBeenCalledWith('context.yaml');
    });
  });

  it('navigates to parent system when Backspace is pressed', async () => {
    mockSetLocation.mockClear();
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    drillInFixtures();
    useBlueprintStore.setState({ selectSystem });
    render(<Canvas />);

    fireEvent.keyDown(window, { key: 'Backspace' });

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
      expect(selectSystem).toHaveBeenCalledWith('context.yaml');
    });
  });

  it('shows a Zoom out button that navigates to the parent system', async () => {
    mockSetLocation.mockClear();
    const selectSystem = vi.fn().mockResolvedValue(undefined);
    drillInFixtures();
    useBlueprintStore.setState({ selectSystem });
    render(<Canvas />);

    fireEvent.click(screen.getByTestId('zoom-out-button'));

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/workspace/root');
      expect(selectSystem).toHaveBeenCalledWith('context.yaml');
    });
  });
});

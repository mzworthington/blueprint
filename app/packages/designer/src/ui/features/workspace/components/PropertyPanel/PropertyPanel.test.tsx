import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('PropertyPanel UI Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      loadedSystems: [],
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'gateway-api', type: 'rest-api', name: 'Gateway API', x: 0, y: 0 },
        { entityRef: 'session-store', type: 'cache-store', name: 'Session Cache', x: 10, y: 10 },
      ],
      dependencies: [],
    });
  });

  it('should render External Dependencies section when no node is selected and workspace is loaded', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'containers.yaml',
          name: 'Containers',
          schema: {
            name: 'Containers',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      listWorkspaceExternalCandidates: () => [],
    });

    render(<PropertyPanel />);
    expect(screen.getByText('External Dependencies')).toBeInTheDocument();
    expect(screen.getByLabelText('Search external dependencies')).toBeInTheDocument();
  });

  it('should render Workspace config and Catalog when no node is selected', () => {
    render(<PropertyPanel />);

    expect(screen.getByText(/Properties Panel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByText('Component Catalog')).toBeInTheDocument();
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('Event Broker')).toBeInTheDocument();
  });

  it('should render Diagram C4 Level selector and trigger updateSchemaLevel on change', () => {
    render(<PropertyPanel />);

    const select = screen.getByLabelText(/C4 Level/i);
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('container');

    fireEvent.change(select, { target: { value: 'context' } });
    expect(useBlueprintStore.getState().schema.level).toBe('context');
  });

  it('should render read-only Diagram entityRef from workspaceName or schema.name', () => {
    useBlueprintStore.setState({ workspaceName: 'Awesome Cloud Workspace' });
    render(<PropertyPanel />);

    expect(screen.getByText('Entity Reference')).toBeInTheDocument();
    const slugInput = screen.getByLabelText(/Entity Reference/i);
    expect(slugInput).toBeInTheDocument();
    expect(slugInput).toHaveAttribute('readonly');
    expect(slugInput).toHaveValue('awesome-cloud-workspace');
  });

  it('should trigger node creation when catalog component is clicked', () => {
    render(<PropertyPanel />);

    expect(useBlueprintStore.getState().nodes).toHaveLength(2);

    fireEvent.click(screen.getByText('REST API'));

    expect(useBlueprintStore.getState().nodes).toHaveLength(3);
  });

  it('should show validation success message when architecture is acyclic', () => {
    render(<PropertyPanel />);

    expect(screen.getByText('Architecture Valid')).toBeInTheDocument();
    expect(screen.getByText(/No cyclic loops or invalid boundaries/i)).toBeInTheDocument();
  });

  it('should hide validation success when connection issues exist', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [
          {
            type: 'invalid-connection',
            message: 'Dependency source node "missing-node" does not exist.',
          },
        ],
      },
    });

    render(<PropertyPanel />);

    expect(screen.queryByText('Architecture Valid')).not.toBeInTheDocument();
    expect(screen.getByText('Validation Alert')).toBeInTheDocument();
  });

  it('should show cycle warning alert when circular dependency is triggered', () => {
    const { onConnect } = useBlueprintStore.getState();
    onConnect({
      source: 'cloud-infrastructure-workspace/gateway-api',
      target: 'cloud-infrastructure-workspace/session-store',
      sourceHandle: null,
      targetHandle: null,
    });
    onConnect({
      source: 'cloud-infrastructure-workspace/session-store',
      target: 'cloud-infrastructure-workspace/gateway-api',
      sourceHandle: null,
      targetHandle: null,
    });

    render(<PropertyPanel />);

    expect(screen.getByText('Circular Dependency')).toBeInTheDocument();
    expect(screen.getByText(/Circular dependency detected/i)).toBeInTheDocument();
  });

  it('should display node attributes editor when a node is selected', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gateway API')).toBeInTheDocument();
  });

  it('should rename node and metadata attributes when edited in node details', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'API Gateway Proxy' } });

    const updatedNode = useBlueprintStore
      .getState()
      .schema.nodes.find(n => n.entityRef === 'cloud-infrastructure-workspace/api-gateway-proxy');
    expect(updatedNode?.name).toBe('API Gateway Proxy');
    expect(updatedNode?.entityRef).toBe('cloud-infrastructure-workspace/api-gateway-proxy');

    const entityRefInput = screen.getByLabelText(/Entity Reference/i);
    expect(entityRefInput).toHaveValue('cloud-infrastructure-workspace/api-gateway-proxy');
  });

  it('should allow adding custom metadata attributes to the component', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const keyInput = screen.getByPlaceholderText(/Key \(e.g. port\)/i);
    const valueInput = screen.getByPlaceholderText(/Value/i);
    const addButton = screen.getByRole('button', { name: /Add attribute/i });

    fireEvent.change(keyInput, { target: { value: 'port' } });
    fireEvent.change(valueInput, { target: { value: '443' } });
    fireEvent.click(addButton);

    const updatedNode = useBlueprintStore
      .getState()
      .schema.nodes.find(n => n.entityRef === 'cloud-infrastructure-workspace/gateway-api');
    expect(updatedNode?.properties?.port).toBe('443');
  });

  it('should allow editing active connection descriptions', () => {
    const { onConnect } = useBlueprintStore.getState();
    onConnect({
      source: 'gateway-api',
      target: 'session-store',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });

    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const descInput = screen.getByPlaceholderText(/Add description/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveValue('');

    fireEvent.change(descInput, { target: { value: 'JSON over HTTPS' } });

    const edge = useBlueprintStore.getState().edges[0];
    expect(edge.data?.description).toBe('JSON over HTTPS');
  });

  it('shows readonly git forensics when the selected node is enriched', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'gateway-api',
          type: 'rest-api',
          name: 'Gateway API',
          x: 0,
          y: 0,
          forensics: {
            complexity: 18,
            churn: 4,
            hotspotScore: 0.8,
            classifications: ['hotspot'],
          },
        },
      ],
      dependencies: [],
    });

    const nodeId = useBlueprintStore.getState().nodes[0]?.id;
    useBlueprintStore.setState({ selectedNodeId: nodeId });

    render(<PropertyPanel />);

    expect(screen.getByTestId('forensics-section')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Hotspot/i);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('wires coupling toggle for a selected node with on-canvas peers', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Code',
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
            coupledFiles: [{ path: 'src/b.ts', score: 0.85, sharedCommits: 5 }],
          },
        },
        {
          entityRef: 'comp-b',
          type: 'component',
          name: 'B',
          x: 40,
          y: 40,
          properties: { filepath: 'src/b.ts' },
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({ selectedNodeId: 'comp-a', showCoupling: false });
    render(<PropertyPanel />);

    fireEvent.click(screen.getByTestId('toggle-show-coupling'));
    expect(useBlueprintStore.getState().showCoupling).toBe(true);
  });

  it('toggles risk heatmap from workspace display controls', () => {
    useBlueprintStore.setState({ selectedNodeId: null, showHotspotHeatmap: false });
    render(<PropertyPanel />);

    expect(screen.getByTestId('workspace-display-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    expect(useBlueprintStore.getState().showHotspotHeatmap).toBe(true);
  });

  it('toggles lite canvas from workspace display controls', () => {
    useBlueprintStore.setState({ selectedNodeId: null, liteCanvas: false });
    render(<PropertyPanel />);

    fireEvent.click(screen.getByTestId('toggle-lite-canvas'));
    expect(useBlueprintStore.getState().liteCanvas).toBe(true);
  });

  it('keeps risk heatmap toggle available while a node is selected', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Heat Panel',
      version: '1.0.0',
      level: 'code',
      nodes: [
        {
          entityRef: 'comp-a',
          type: 'component',
          name: 'A',
          x: 0,
          y: 0,
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({ selectedNodeId: 'comp-a', showHotspotHeatmap: false });
    render(<PropertyPanel />);

    fireEvent.click(screen.getByTestId('toggle-show-hotspot-heatmap'));
    expect(useBlueprintStore.getState().showHotspotHeatmap).toBe(true);
  });
});

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
});

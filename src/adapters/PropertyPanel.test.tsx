import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { useBlueprintStore } from './store';

describe('PropertyPanel UI Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      nodes: [
        { id: 'gateway-api', type: 'rest-api', name: 'Gateway API', x: 0, y: 0 },
        { id: 'session-store', type: 'cache-store', name: 'Session Cache', x: 10, y: 10 },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({ selectedNodeId: null });
  });

  it('should render Workspace config and Catalog when no node is selected', () => {
    render(<PropertyPanel />);

    expect(screen.getByText('Properties Panel')).toBeInTheDocument();
    expect(screen.getByLabelText(/Workspace Name/i)).toBeInTheDocument();
    expect(screen.getByText('Component Catalog')).toBeInTheDocument();
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('Event Broker')).toBeInTheDocument();
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
      source: 'gateway-api',
      target: 'session-store',
      sourceHandle: null,
      targetHandle: null,
    });
    onConnect({
      source: 'session-store',
      target: 'gateway-api',
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

    expect(screen.getByLabelText(/Component Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Component ID/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gateway API')).toBeInTheDocument();
    expect(screen.getByDisplayValue('gateway-api')).toBeInTheDocument();
  });

  it('should rename node and metadata attributes when edited in node details', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const nameInput = screen.getByLabelText(/Component Name/i);
    fireEvent.change(nameInput, { target: { value: 'API Gateway Proxy' } });

    const updatedNode = useBlueprintStore.getState().schema.nodes.find(n => n.id === 'gateway-api');
    expect(updatedNode?.name).toBe('API Gateway Proxy');
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

    const updatedNode = useBlueprintStore.getState().schema.nodes.find(n => n.id === 'gateway-api');
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
});

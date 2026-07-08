
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { useBlueprintStore } from './store';

describe('PropertyPanel UI Component', () => {
  beforeEach(() => {
    // Clear and reset store
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      nodes: [
        { id: 'gateway-api', type: 'rest-api', name: 'Gateway API', x: 0, y: 0 },
        { id: 'session-store', type: 'cache-store', name: 'Session Cache', x: 10, y: 10 }
      ],
      dependencies: []
    });
    // Ensure no node is selected
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
    
    // Initial nodes count is 2
    expect(useBlueprintStore.getState().nodes).toHaveLength(2);
    
    // Click REST API component card to instantiate a new node
    fireEvent.click(screen.getByText('REST API'));
    
    // Total nodes should be 3
    expect(useBlueprintStore.getState().nodes).toHaveLength(3);
  });

  it('should show validation success message when architecture is acyclic', () => {
    render(<PropertyPanel />);
    
    expect(screen.getByText('Architecture Valid')).toBeInTheDocument();
    expect(screen.getByText(/No cyclic loops or invalid boundaries/i)).toBeInTheDocument();
  });

  it('should show cycle warning alert when circular dependency is triggered', () => {
    // Manually inject a cycle in the store
    const { onConnect } = useBlueprintStore.getState();
    onConnect({
      source: 'gateway-api',
      target: 'session-store',
      sourceHandle: null,
      targetHandle: null
    });
    onConnect({
      source: 'session-store',
      target: 'gateway-api',
      sourceHandle: null,
      targetHandle: null
    });

    render(<PropertyPanel />);
    
    expect(screen.getByText('Circular Dependency')).toBeInTheDocument();
    expect(screen.getByText(/Circular dependency detected/i)).toBeInTheDocument();
  });

  it('should display node attributes editor when a node is selected', () => {
    // Select the first node
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

    // Verify name updated in store
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

    // Verify properties updated in store
    const updatedNode = useBlueprintStore.getState().schema.nodes.find(n => n.id === 'gateway-api');
    expect(updatedNode?.properties?.port).toBe('443');
  });
});

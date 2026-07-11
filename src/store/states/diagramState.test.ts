import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlueprintStore } from '../store';
import type { NodeType } from '../../domain/schema';

describe('diagramState Actions & State Management', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { id: 'nodeA', type: 'rest-api', name: 'Node A', x: 0, y: 0 },
        { id: 'nodeB', type: 'grpc-service', name: 'Node B', x: 100, y: 100 },
      ],
      dependencies: [{ from: 'nodeA', to: 'nodeB', type: 'direct-call', description: 'Request' }],
    });
  });

  it('should initialize with correct default nodes, edges, and schemas', () => {
    const state = useBlueprintStore.getState();
    expect(state.schema.name).toBe('Test Workspace');
    expect(state.nodes).toHaveLength(2);
    expect(state.edges).toHaveLength(1);
    expect(state.edges[0].source).toBe('nodeA');
    expect(state.edges[0].target).toBe('nodeB');
    expect(state.validationResult.isValid).toBe(true);
  });

  it('should successfully add a new node and serialize to YAML', () => {
    const store = useBlueprintStore.getState();
    store.addNode('relational-database' as NodeType);

    const updatedState = useBlueprintStore.getState();
    expect(updatedState.nodes).toHaveLength(3);
    expect(updatedState.schema.nodes).toHaveLength(3);
    const addedNode = updatedState.schema.nodes.find(n => n.type === 'relational-database');
    expect(addedNode).toBeDefined();
    expect(updatedState.yamlCode).toContain('type: relational-database');
  });

  it('should delete a node and clean up referencing edges', () => {
    const store = useBlueprintStore.getState();
    store.deleteNode('nodeB');

    const updatedState = useBlueprintStore.getState();
    expect(updatedState.nodes).toHaveLength(1);
    expect(updatedState.nodes[0].id).toBe('nodeA');
    expect(updatedState.edges).toHaveLength(0);
    expect(updatedState.schema.dependencies).toHaveLength(0);
  });

  it('should update a node name and metadata properties', () => {
    const store = useBlueprintStore.getState();
    store.updateNode('nodeA', {
      name: 'Updated Node A',
      properties: { port: 8080 },
      external: true,
      c4Ref: './subsystem.yaml',
    });

    const updatedState = useBlueprintStore.getState();
    const nodeA = updatedState.schema.nodes.find(n => n.id === 'nodeA');
    expect(nodeA?.name).toBe('Updated Node A');
    expect(nodeA?.properties?.port).toBe(8080);
    expect(nodeA?.external).toBe(true);
    expect(nodeA?.c4Ref).toBe('./subsystem.yaml');
    expect(updatedState.yamlCode).toContain('name: Updated Node A');
    expect(updatedState.yamlCode).toContain('external: true');
    expect(updatedState.yamlCode).toContain('c4Ref: ./subsystem.yaml');
  });

  it('should rename a node ID and update referencing edges', () => {
    const store = useBlueprintStore.getState();
    store.updateNode('nodeA', { id: 'nodeNewA' });

    const updatedState = useBlueprintStore.getState();
    const oldNode = updatedState.schema.nodes.find(n => n.id === 'nodeA');
    const newNode = updatedState.schema.nodes.find(n => n.id === 'nodeNewA');
    expect(oldNode).toBeUndefined();
    expect(newNode).toBeDefined();
    expect(newNode?.name).toBe('Node A');

    expect(updatedState.edges).toHaveLength(1);
    expect(updatedState.edges[0].source).toBe('nodeNewA');
    expect(updatedState.edges[0].target).toBe('nodeB');
  });

  it('should establish a connection between nodes and detect a cycle', () => {
    const store = useBlueprintStore.getState();

    store.onConnect({
      source: 'nodeB',
      target: 'nodeA',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });

    const updatedState = useBlueprintStore.getState();
    expect(updatedState.edges).toHaveLength(2);
    expect(updatedState.validationResult.isValid).toBe(false);
    expect(updatedState.validationResult.issues[0].type).toBe('cycle');
    expect(updatedState.validationResult.issues[0].path).toContain('nodeA');
    expect(updatedState.validationResult.issues[0].path).toContain('nodeB');
  });

  it('should allow updating schema name and level', () => {
    const store = useBlueprintStore.getState();

    store.updateSchemaName('New Workspace Name');
    expect(useBlueprintStore.getState().schema.name).toBe('New Workspace Name');

    store.updateSchemaLevel('context');
    expect(useBlueprintStore.getState().schema.level).toBe('context');
  });

  it('should map isTest flag correctly from domain node to RF node data', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Project',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { id: 'app', type: 'rest-api', name: 'App Node', isTest: false },
        { id: 'app-test', type: 'rest-api', name: 'App Test Node', isTest: true },
      ],
      dependencies: [],
    });

    const state = useBlueprintStore.getState();
    const rfNodeApp = state.nodes.find(n => n.id === 'app');
    const rfNodeAppTest = state.nodes.find(n => n.id === 'app-test');

    expect(rfNodeApp?.data.isTest).toBe(false);
    expect(rfNodeAppTest?.data.isTest).toBe(true);

    expect(state.schema.nodes.find(n => n.id === 'app-test')?.isTest).toBe(true);
  });

  describe('Zoom error handling', () => {
    it('should set lastError if zoomIntoNode file read fails', async () => {
      const store = useBlueprintStore.getState();
      useBlueprintStore.setState({
        isWorkspaceOpen: true,
        currentFilePath: 'root.yaml',
        schema: {
          name: 'Root Context',
          version: '1.0.0',
          level: 'context',
          nodes: [{ id: 'sub', type: 'web-app', name: 'Sub', c4Ref: './sub.yaml' }],
          dependencies: [],
        },
      });

      const spyRead = vi.spyOn(store.workspacePort, 'readFile');
      spyRead.mockRejectedValue(new Error('Permission denied'));

      const success = await store.zoomIntoNode('sub');
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('Failed to load sub-diagram');
      spyRead.mockRestore();
    });

    it('should set lastError if zoomOut file read fails', async () => {
      const store = useBlueprintStore.getState();
      useBlueprintStore.setState({
        isWorkspaceOpen: true,
        currentFilePath: 'sub.yaml',
        navigationStack: [],
        schema: {
          name: 'Sub System',
          version: '1.0.0',
          level: 'container',
          parentRef: '../root.yaml',
          nodes: [],
          dependencies: [],
        },
      });

      const spyRead = vi.spyOn(store.workspacePort, 'readFile');
      spyRead.mockRejectedValue(new Error('File locked'));

      const success = await store.zoomOut();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('Failed to load parent diagram');
      spyRead.mockRestore();
    });

    it('should return false if zoomOut parent not found in default loaded systems when workspace is closed', async () => {
      const store = useBlueprintStore.getState();
      useBlueprintStore.setState({
        isWorkspaceOpen: false,
        currentFilePath: 'sub.yaml',
        navigationStack: [],
        schema: {
          name: 'Sub System',
          version: '1.0.0',
          level: 'container',
          parentRef: '../unknown.yaml',
          nodes: [],
          dependencies: [],
        },
      });

      const success = await store.zoomOut();
      expect(success).toBe(false);
    });

    it('should return false if zooming out from root diagram', async () => {
      const store = useBlueprintStore.getState();
      useBlueprintStore.setState({
        currentFilePath: 'root.yaml',
        navigationStack: [],
        workspaceManifest: null,
        schema: {
          name: 'Root Context',
          version: '1.0.0',
          level: 'context',
          nodes: [],
          dependencies: [],
        },
      });

      const success = await store.zoomOut();
      expect(success).toBe(false);
    });
  });
});

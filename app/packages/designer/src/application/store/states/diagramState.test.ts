import { describe, it, expect, beforeEach } from 'vitest';
import { useBlueprintStore } from '../store';
import type { NodeType } from '@blueprint/core';
import { createBrowserLayoutRegistry } from '../../../infrastructure/layout/createBrowserLayoutRegistry';
import { reactFlowGraphChangeAdapter } from '../../../infrastructure/layout/reactFlowGraphChangeAdapter';
import { dexieWorkingCopyAdapter } from '../../../infrastructure/db/dexieWorkingCopyAdapter';
import {
  clearSessionLayout,
  hasSessionLayout,
  schemaLayoutFingerprint,
} from '../sessionLayoutCache';

describe('diagramState Actions & State Management', () => {
  beforeEach(() => {
    useBlueprintStore.getState().setPorts({
      layoutRegistry: createBrowserLayoutRegistry(),
      graphChangePort: reactFlowGraphChangeAdapter,
      workingCopyPort: dexieWorkingCopyAdapter,
    });
    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      loadedSystems: [],
      past: [],
      future: [],
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'nodeA', type: 'rest-api', name: 'Node A', x: 0, y: 0 },
        { entityRef: 'nodeB', type: 'grpc-service', name: 'Node B', x: 100, y: 100 },
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

  it('preserves metaData.source through initSchema and canvas rebuild', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Reporters',
      version: 'https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json',
      level: 'component',
      entityRef: 'blueprint/app/reporters',
      source: {
        remoteUrl: 'https://github.com/mzworthington/blueprint',
        scannedAtCommit: 'abc123',
        scanRoot: '.',
      },
      nodes: [
        {
          entityRef: 'comp',
          type: 'component',
          name: 'Comp',
          properties: { filepath: 'app/reporters/foo.ts' },
        },
      ],
      dependencies: [],
    });

    const state = useBlueprintStore.getState();
    expect(state.schema.source).toEqual({
      remoteUrl: 'https://github.com/mzworthington/blueprint',
      scannedAtCommit: 'abc123',
      scanRoot: '.',
    });
    expect(state.yamlCode).toContain('remoteUrl: https://github.com/mzworthington/blueprint');
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
    });

    const updatedState = useBlueprintStore.getState();
    const nodeA = updatedState.schema.nodes.find(n => n.entityRef === 'test-workspace/nodeA');
    expect(nodeA?.name).toBe('Updated Node A');
    expect(nodeA?.properties?.port).toBe(8080);
    expect(nodeA?.external).toBe(true);
    expect(updatedState.yamlCode).toContain('name: Updated Node A');
    expect(updatedState.yamlCode).toContain('external: true');
  });

  it('should rename a node ID and update referencing edges', () => {
    const store = useBlueprintStore.getState();
    store.updateNode('nodeA', { entityRef: 'nodeNewA' });

    const updatedState = useBlueprintStore.getState();
    const oldNode = updatedState.schema.nodes.find(n => n.entityRef === 'test-workspace/nodeA');
    const newNode = updatedState.schema.nodes.find(n => n.entityRef === 'test-workspace/nodeNewA');
    expect(oldNode).toBeUndefined();
    expect(newNode).toBeDefined();
    expect(newNode?.name).toBe('Node A');

    expect(updatedState.edges).toHaveLength(1);
    expect(updatedState.edges[0].source).toBe('nodeNewA');
    expect(updatedState.edges[0].target).toBe('nodeB');
  });

  it('should rename a context-level actor and update dependency refs', () => {
    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      workspaceName: 'Blueprint',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Blueprint Context',
          schema: {
            name: 'Blueprint Context',
            version: '1.0.0',
            level: 'context',
            entityRef: 'blueprint',
            nodes: [
              { entityRef: 'eshop', type: 'software-system', name: 'EShop System', x: 0, y: 0 },
              {
                entityRef: 'testproject',
                type: 'software-system',
                name: 'TestProject System',
                x: 200,
                y: 0,
              },
            ],
            dependencies: [],
          },
        },
      ],
    });

    const { initSchema, addNode, onConnect, updateNode } = useBlueprintStore.getState();
    initSchema({
      name: 'Blueprint Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [
        { entityRef: 'eshop', type: 'software-system', name: 'EShop System', x: 0, y: 0 },
        {
          entityRef: 'testproject',
          type: 'software-system',
          name: 'TestProject System',
          x: 200,
          y: 0,
        },
      ],
      dependencies: [],
    });

    addNode('person' as NodeType);
    const personId = useBlueprintStore.getState().nodes.find(n => n.data.type === 'person')!.id;

    onConnect({
      source: personId,
      target: 'blueprint/eshop',
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    });
    onConnect({
      source: personId,
      target: 'blueprint/testproject',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });

    updateNode(personId, { name: 'Customer', entityRef: 'customer' });

    const state = useBlueprintStore.getState();
    expect(state.validationResult.isValid).toBe(true);
    expect(state.schema.nodes.some(n => n.entityRef === 'blueprint/customer')).toBe(true);
    expect(state.schema.dependencies.every(d => !d.from.includes('person-'))).toBe(true);
    expect(state.schema.dependencies.every(d => !d.to.includes('person-'))).toBe(true);
    expect(state.edges.every(e => e.source !== personId && e.target !== personId)).toBe(true);
  });

  it('should update dependency refs when renaming after entityRef was resolved to FQN', () => {
    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      workspaceName: 'Blueprint',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Blueprint Context',
          schema: {
            name: 'Blueprint Context',
            version: '1.0.0',
            level: 'context',
            entityRef: 'blueprint',
            nodes: [
              { entityRef: 'eshop', type: 'software-system', name: 'EShop System', x: 0, y: 0 },
            ],
            dependencies: [],
          },
        },
      ],
    });

    const { initSchema, addNode, onConnect, updateNode } = useBlueprintStore.getState();
    initSchema({
      name: 'Blueprint Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [{ entityRef: 'eshop', type: 'software-system', name: 'EShop System', x: 0, y: 0 }],
      dependencies: [],
    });

    addNode('person' as NodeType);
    const personId = useBlueprintStore.getState().nodes.find(n => n.data.type === 'person')!.id;
    onConnect({
      source: personId,
      target: 'blueprint/eshop',
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    });

    // Simulate resolved canvas state: RF id stays short while data.entityRef is FQN
    const afterConnect = useBlueprintStore.getState();
    expect(afterConnect.nodes.find(n => n.id === personId)?.data.entityRef).toBe(
      'blueprint/person-' + personId.split('-')[1]
    );

    // First rename succeeds
    updateNode(personId, { name: 'Customer', entityRef: 'customer' });
    const afterRename = useBlueprintStore.getState();
    expect(afterRename.validationResult.isValid).toBe(true);

    // Second rename attempt (e.g. user re-edits name) must not leave stale refs
    updateNode('customer', { name: 'Customer' });
    const afterReedit = useBlueprintStore.getState();
    expect(afterReedit.validationResult.isValid).toBe(true);
    expect(afterReedit.schema.dependencies.some(d => d.from.includes('person-'))).toBe(false);
  });

  it('should update edges that reference the old FQN when renaming a node', () => {
    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      workspaceName: 'Blueprint',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Blueprint Context',
          schema: {
            name: 'Blueprint Context',
            version: '1.0.0',
            level: 'context',
            entityRef: 'blueprint',
            nodes: [
              { entityRef: 'blueprint/person-5380', type: 'person', name: 'Actor', x: 0, y: 0 },
              {
                entityRef: 'blueprint/eshop',
                type: 'software-system',
                name: 'EShop',
                x: 0,
                y: 100,
              },
            ],
            dependencies: [
              { from: 'blueprint/person-5380', to: 'blueprint/eshop', type: 'direct-call' },
            ],
          },
        },
      ],
    });

    const { initSchema, updateNode } = useBlueprintStore.getState();
    initSchema({
      name: 'Blueprint Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [
        { entityRef: 'blueprint/person-5380', type: 'person', name: 'Actor', x: 0, y: 0 },
        { entityRef: 'blueprint/eshop', type: 'software-system', name: 'EShop', x: 0, y: 100 },
      ],
      dependencies: [{ from: 'blueprint/person-5380', to: 'blueprint/eshop', type: 'direct-call' }],
    });

    updateNode('blueprint/person-5380', { name: 'Customer', entityRef: 'customer' });

    const state = useBlueprintStore.getState();
    expect(state.validationResult.isValid).toBe(true);
    expect(state.schema.dependencies[0]?.from).toBe('blueprint/customer');
    expect(state.edges[0]?.source).toBe('customer');
  });

  it('should update edges when canvas id is short but dependency uses resolved FQN', () => {
    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      workspaceName: 'Blueprint',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Blueprint Context',
          schema: {
            name: 'Blueprint Context',
            version: '1.0.0',
            level: 'context',
            entityRef: 'blueprint',
            nodes: [{ entityRef: 'eshop', type: 'software-system', name: 'EShop', x: 0, y: 0 }],
            dependencies: [],
          },
        },
      ],
    });

    const { initSchema, addNode, onConnect, updateNode } = useBlueprintStore.getState();
    initSchema({
      name: 'Blueprint Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [{ entityRef: 'eshop', type: 'software-system', name: 'EShop', x: 0, y: 0 }],
      dependencies: [],
    });

    addNode('person' as NodeType);
    const personId = useBlueprintStore.getState().nodes.find(n => n.data.type === 'person')!.id;
    onConnect({
      source: personId,
      target: 'blueprint/eshop',
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    });

    // Simulate stale edge using resolved FQN while RF node id remains short
    const staleEdges = useBlueprintStore.getState().edges.map(e => ({
      ...e,
      source: `blueprint/${personId}`,
      id: `edge-blueprint/${personId}-${e.target}`,
    }));
    useBlueprintStore.setState({ edges: staleEdges });

    updateNode(personId, { name: 'Customer', entityRef: 'customer' });

    const state = useBlueprintStore.getState();
    expect(state.validationResult.isValid).toBe(true);
    expect(state.schema.dependencies[0]?.from).toBe('blueprint/customer');
    expect(state.edges[0]?.source).toBe('customer');
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
    expect(updatedState.validationResult.issues[0].path).toContain('test-workspace/nodeA');
    expect(updatedState.validationResult.issues[0].path).toContain('test-workspace/nodeB');
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
        { entityRef: 'app', type: 'rest-api', name: 'App Node', isTest: false },
        { entityRef: 'app-test', type: 'rest-api', name: 'App Test Node', isTest: true },
      ],
      dependencies: [],
    });

    const state = useBlueprintStore.getState();
    const rfNodeApp = state.nodes.find(n => n.id === 'app');
    const rfNodeAppTest = state.nodes.find(n => n.id === 'app-test');

    expect(rfNodeApp?.data.isTest).toBe(false);
    expect(rfNodeAppTest?.data.isTest).toBe(true);

    expect(state.schema.nodes.find(n => n.entityRef === 'test-project/app-test')?.isTest).toBe(
      true
    );
  });

  it('should not write autolayout positions into YAML until layout is customized', async () => {
    const store = useBlueprintStore.getState();
    store.initSchema({
      name: 'Fresh',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'alpha', type: 'rest-api', name: 'Alpha' },
        { entityRef: 'beta', type: 'grpc-service', name: 'Beta' },
      ],
      dependencies: [{ from: 'alpha', to: 'beta', type: 'direct-call' }],
    });
    store.setLayoutEngine('dagre');
    await store.applyClientLayout();

    const updated = useBlueprintStore.getState();
    expect(updated.layoutCustomized).toBe(false);
    expect(updated.yamlCode).not.toMatch(/^\s*x:/m);
    expect(updated.yamlCode).not.toMatch(/^\s*y:/m);
  });

  it('should write layout engine positions into schema and YAML when persisted', async () => {
    const store = useBlueprintStore.getState();
    store.setLayoutEngine('dagre');
    await store.applyClientLayout({ persistToSchema: true });

    const updated = useBlueprintStore.getState();
    const nodeA = updated.schema.nodes.find(
      n => n.entityRef.endsWith('/nodeA') || n.entityRef === 'nodeA'
    );
    const nodeB = updated.schema.nodes.find(
      n => n.entityRef.endsWith('/nodeB') || n.entityRef === 'nodeB'
    );

    expect(nodeA).toBeDefined();
    expect(nodeB).toBeDefined();
    expect(nodeA!.y).toBeLessThan(nodeB!.y!);
    expect(updated.yamlCode).toMatch(/x:\s*\d+/);
    expect(updated.yamlCode).toMatch(/['"]?y['"]?:\s*\d+/);
    expect(updated.nodes.find(n => n.id.includes('nodeA'))?.position.y).toBeLessThan(
      updated.nodes.find(n => n.id.includes('nodeB'))?.position.y ?? Infinity
    );
  });

  it('should support undo and redo basic workflow', () => {
    const store = useBlueprintStore.getState();
    expect(store.past).toHaveLength(0);
    expect(store.future).toHaveLength(0);

    // Perform action
    store.addNode('relational-database' as NodeType);
    expect(useBlueprintStore.getState().nodes).toHaveLength(3);
    expect(useBlueprintStore.getState().past).toHaveLength(1);
    expect(useBlueprintStore.getState().future).toHaveLength(0);

    // Undo
    useBlueprintStore.getState().undo();
    expect(useBlueprintStore.getState().nodes).toHaveLength(2);
    expect(useBlueprintStore.getState().past).toHaveLength(0);
    expect(useBlueprintStore.getState().future).toHaveLength(1);

    // Redo
    useBlueprintStore.getState().redo();
    expect(useBlueprintStore.getState().nodes).toHaveLength(3);
    expect(useBlueprintStore.getState().past).toHaveLength(1);
    expect(useBlueprintStore.getState().future).toHaveLength(0);
  });

  it('should support undo on node property updates', () => {
    const store = useBlueprintStore.getState();
    store.updateNode('nodeA', { name: 'New Name' });
    expect(
      useBlueprintStore.getState().schema.nodes.find(n => n.name === 'New Name')
    ).toBeDefined();

    useBlueprintStore.getState().undo();
    expect(
      useBlueprintStore.getState().schema.nodes.find(n => n.name === 'New Name')
    ).toBeUndefined();

    useBlueprintStore.getState().redo();
    expect(
      useBlueprintStore.getState().schema.nodes.find(n => n.name === 'New Name')
    ).toBeDefined();
  });

  it('should support undo on node deletion', () => {
    const store = useBlueprintStore.getState();
    store.deleteNode('nodeB');
    expect(useBlueprintStore.getState().nodes).toHaveLength(1);

    useBlueprintStore.getState().undo();
    expect(useBlueprintStore.getState().nodes).toHaveLength(2);

    useBlueprintStore.getState().redo();
    expect(useBlueprintStore.getState().nodes).toHaveLength(1);
  });

  it('should place a new node at the specified position if provided', () => {
    const store = useBlueprintStore.getState();
    const targetPosition = { x: 450, y: 600 };
    store.addNode('relational-database' as NodeType, targetPosition);

    const updatedState = useBlueprintStore.getState();
    const addedNode = updatedState.schema.nodes.find(n => n.type === 'relational-database');
    expect(addedNode).toBeDefined();
    expect(addedNode?.x).toBe(450);
    expect(addedNode?.y).toBe(600);
  });

  it('should reset focusedCyclePath to null when initSchema is called', () => {
    const store = useBlueprintStore.getState();
    store.setFocusedCyclePath(['nodeA', 'nodeB', 'nodeA']);
    expect(useBlueprintStore.getState().focusedCyclePath).toEqual(['nodeA', 'nodeB', 'nodeA']);

    store.initSchema({
      name: 'System C',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'nodeC', type: 'web-app', name: 'Node C' }],
      dependencies: [],
    });

    expect(useBlueprintStore.getState().focusedCyclePath).toBeNull();
  });

  it('does not seed session layout cache before autolayout on load', () => {
    clearSessionLayout();
    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      layoutCustomized: false,
    });

    const schema = {
      name: 'Blueprint Context',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'blueprint',
      nodes: [
        { entityRef: 'blueprint/user', type: 'person' as const, name: 'User' },
        {
          entityRef: 'blueprint/backstage',
          type: 'group' as const,
          name: 'Backstage',
          children: [
            {
              entityRef: 'blueprint/docs-ui',
              type: 'software-system' as const,
              name: 'Docs Ui',
            },
          ],
        },
      ],
      dependencies: [
        { from: 'blueprint/user', to: 'blueprint/backstage', type: 'direct-call' as const },
      ],
    };

    useBlueprintStore.getState().initSchema(schema);
    const fingerprint = schemaLayoutFingerprint(useBlueprintStore.getState().schema);

    expect(hasSessionLayout('context.yaml', fingerprint)).toBe(false);
  });

  it('should merge mermaid import into active diagram without removing existing nodes', () => {
    const store = useBlueprintStore.getState();
    const beforeCount = store.schema.nodes.length;

    const mermaid = `graph TD
      Cache[("Redis Cache")]`;

    const success = store.importMermaid(mermaid, {});
    expect(success).toBe(true);

    const updated = useBlueprintStore.getState();
    expect(updated.schema.nodes.length).toBeGreaterThan(beforeCount);
    expect(updated.schema.nodes.some(n => n.name === 'Redis Cache')).toBe(true);
    expect(updated.schema.nodes.some(n => n.name === 'Node A')).toBe(true);
    expect(updated.schema.nodes.some(n => n.name === 'Node B')).toBe(true);
  });

  it('should preview mermaid import merge plan', () => {
    const store = useBlueprintStore.getState();
    const preview = store.previewMermaidImport(`graph TD
      NewSvc["New Service"]`);

    expect(preview.parseResult.format).toBe('flowchart');
    expect(preview.mergePlan.additions.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

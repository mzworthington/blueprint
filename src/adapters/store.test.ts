import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useBlueprintStore,
  resolveRelativePath,
  defaultInitialSchema,
  defaultLoadedSystems,
  defaultWorkspaceManifest,
  defaultWorkspaceManifestYaml,
} from './store';
import type { NodeType } from '../domain/schema';

describe('Default Initial Schema & Hierarchical C4 Linking', () => {
  it('should verify initial default workspace structure', () => {
    expect(defaultInitialSchema).toBeDefined();
    expect(defaultInitialSchema.name).toBeDefined();
    expect(defaultInitialSchema.nodes).toBeDefined();
  });
});

describe('Zustand Store Actions & State Management', () => {
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

  it('should support showTests property and toggleShowTests action', () => {
    const store = useBlueprintStore.getState();
    expect(store.showTests).toBe(false);

    store.toggleShowTests();
    expect(useBlueprintStore.getState().showTests).toBe(true);

    store.toggleShowTests();
    expect(useBlueprintStore.getState().showTests).toBe(false);
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

  it('should manage leftCollapsed and rightCollapsed panel states', () => {
    const store = useBlueprintStore.getState();
    expect(store.leftCollapsed).toBe(true);
    expect(store.rightCollapsed).toBe(true);

    useBlueprintStore.getState().toggleLeftCollapsed();
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    useBlueprintStore.getState().toggleLeftCollapsed();
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    useBlueprintStore.getState().toggleRightCollapsed();
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    useBlueprintStore.getState().toggleRightCollapsed();
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });

  it('should automatically expand right panel when a node is selected', () => {
    useBlueprintStore.setState({ rightCollapsed: true, selectedNodeId: null });

    const store = useBlueprintStore.getState();
    expect(store.rightCollapsed).toBe(true);

    store.selectNode('nodeA');

    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
    expect(useBlueprintStore.getState().selectedNodeId).toBe('nodeA');
  });

  describe('C4 Workspace & Zoom Navigation Actions', () => {
    const mockFiles: Record<string, string> = {
      'blueprint.yaml': `
name: Root Context
version: 1.0.0
level: context
nodes:
  - id: web-app
    type: web-app
    name: Web App
    c4Ref: ./web/container.yaml
dependencies: []
`,
      'web/container.yaml': `
name: Web Containers
version: 1.0.0
level: container
parentRef: ../blueprint.yaml
nodes:
  - id: controller
    type: component
    name: API Controller
dependencies: []
`,
    };

    const mockWorkspacePort: any = {
      selectDirectory: async () => true,
      readFile: async (path: string) => {
        if (mockFiles[path]) return mockFiles[path];
        throw new Error(`File not found: ${path}`);
      },
      writeFile: async (path: string, content: string) => {
        mockFiles[path] = content;
        return true;
      },
      getDirectoryName: () => 'MockWorkspace',
      hasPermission: async () => true,
      readDirectoryFiles: async () => {
        return Object.entries(mockFiles)
          .filter(
            ([path]) => !path.includes('/') && (path.endsWith('.yaml') || path.endsWith('.yml'))
          )
          .map(([path, content]) => ({ name: path, content }));
      },
    };

    beforeEach(() => {
      useBlueprintStore.setState({
        workspacePort: mockWorkspacePort,
        currentFilePath: 'blueprint.yaml',
        navigationStack: [],
        isWorkspaceOpen: false,
        workspaceName: '',
      });
    });

    it('should open workspace, read blueprint.yaml, and mark workspace as open', async () => {
      const store = useBlueprintStore.getState();
      const success = await store.openWorkspaceDirectory();

      expect(success).toBe(true);
      const updatedState = useBlueprintStore.getState();
      expect(updatedState.isWorkspaceOpen).toBe(true);
      expect(updatedState.workspaceName).toBe('MockWorkspace');
      expect(updatedState.currentFilePath).toBe('blueprint.yaml');
      expect(updatedState.schema.name).toBe('Root Context');
      expect(updatedState.schema.level).toBe('context');
      expect(updatedState.nodes).toHaveLength(1);
    });

    it('should zoom into a node, push history to navigationStack, and read target file', async () => {
      const store = useBlueprintStore.getState();

      await store.openWorkspaceDirectory();

      const success = await store.zoomIntoNode('web-app');
      expect(success).toBe(true);

      const updatedState = useBlueprintStore.getState();
      expect(updatedState.currentFilePath).toBe('web/container.yaml');
      expect(updatedState.navigationStack).toHaveLength(1);
      expect(updatedState.navigationStack[0].path).toBe('blueprint.yaml');
      expect(updatedState.navigationStack[0].schema.name).toBe('Root Context');
      expect(updatedState.schema.name).toBe('Web Containers');
      expect(updatedState.schema.level).toBe('container');
      expect(updatedState.nodes).toHaveLength(1);
      expect(updatedState.nodes[0].data.name).toBe('API Controller');
    });

    it('should zoom out to restore parent schema state', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();
      await store.zoomIntoNode('web-app');

      const zoomOutSuccess = await store.zoomOut();
      expect(zoomOutSuccess).toBe(true);

      const updatedState = useBlueprintStore.getState();
      expect(updatedState.currentFilePath).toBe('blueprint.yaml');
      expect(updatedState.navigationStack).toHaveLength(0);
      expect(updatedState.schema.name).toBe('Root Context');
      expect(updatedState.nodes).toHaveLength(1);
    });

    it('should zoom out to parent schema via parentRef when navigation stack is empty', async () => {
      const store = useBlueprintStore.getState();

      defaultLoadedSystems.push({
        path: 'blueprint.yaml',
        name: 'Root Context',
        schema: {
          name: 'Root Context',
          version: '1.0.0',
          level: 'context',
          nodes: [],
          dependencies: [],
        },
      });

      store.initSchema({
        name: 'Child Level',
        version: '1.0.0',
        level: 'container',
        parentRef: './blueprint.yaml',
        nodes: [],
        dependencies: [],
      });
      useBlueprintStore.setState({
        currentFilePath: 'web/container.yaml',
        navigationStack: [],
        isWorkspaceOpen: false,
      });

      const success = await store.zoomOut();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().currentFilePath).toBe('blueprint.yaml');
      expect(useBlueprintStore.getState().schema.name).toBe('Root Context');
    });

    it('should zoom out to parent schema via workspaceManifest when navigation stack is empty', async () => {
      const store = useBlueprintStore.getState();

      defaultLoadedSystems.push({
        path: 'blueprint-containers.yaml',
        name: 'Container Level',
        schema: {
          name: 'Container Level',
          version: '1.0.0',
          level: 'container',
          nodes: [],
          dependencies: [],
        },
      });

      store.initSchema({
        name: 'App Host Components',
        version: '1.0.0',
        level: 'component',
        nodes: [],
        dependencies: [],
      });
      useBlueprintStore.setState({
        currentFilePath: 'blueprint-app-host-components.yaml',
        navigationStack: [],
        isWorkspaceOpen: false,
        workspaceManifest: {
          name: 'Blueprint Workspace',
          root: './blueprint-containers.yaml',
          hierarchy: [
            {
              parent: './blueprint-containers.yaml',
              children: ['./blueprint-app-host-components.yaml'],
            },
          ],
        },
      });

      const success = await store.zoomOut();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().currentFilePath).toBe('blueprint-containers.yaml');
      expect(useBlueprintStore.getState().schema.name).toContain('Container Level');
    });

    it('should fail to zoom in if workspace is not open', async () => {
      const store = useBlueprintStore.getState();
      store.initSchema({
        name: 'Manual Root Context',
        version: '1.0.0',
        level: 'context',
        nodes: [{ id: 'web-app', type: 'web-app', name: 'Web App', c4Ref: './web/container.yaml' }],
        dependencies: [],
      });

      const success = await store.zoomIntoNode('web-app');
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('Workspace Folder');
    });

    it('should zoom into a node using defaultLoadedSystems fallback if workspace is not open', async () => {
      useBlueprintStore.setState({
        loadedSystems: [
          {
            path: 'internet-banking-container.yaml',
            name: 'Internet Banking - Containers',
            schema: {
              name: 'Internet Banking - Containers',
              version: '1.0.0',
              level: 'container',
              nodes: [{ id: 'web-app', type: 'web-app', name: 'Web App' }],
              dependencies: [],
            },
          },
        ],
      });

      const store = useBlueprintStore.getState();
      store.initSchema({
        name: 'Internet Banking - System Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          {
            id: 'banking-system',
            type: 'software-system',
            name: 'Internet Banking System',
            c4Ref: './internet-banking-container.yaml',
          },
        ],
        dependencies: [],
      });
      useBlueprintStore.setState({
        isWorkspaceOpen: false,
        currentFilePath: 'system-context.yaml',
      });

      const success = await store.zoomIntoNode('banking-system');
      expect(success).toBe(true);

      const updatedState = useBlueprintStore.getState();
      expect(updatedState.currentFilePath).toBe('internet-banking-container.yaml');
      expect(updatedState.navigationStack).toHaveLength(1);
      expect(updatedState.navigationStack[0].path).toBe('system-context.yaml');
      expect(updatedState.schema.name).toBe('Internet Banking - Containers');
    });

    it('should resolve relative path correctly', () => {
      expect(resolveRelativePath('blueprint.yaml', './web/container.yaml')).toBe(
        'web/container.yaml'
      );
      expect(
        resolveRelativePath('services/auth/components.yaml', '../billing/container.yaml')
      ).toBe('services/billing/container.yaml');
    });

    it('should load multiple top-level systems and support selecting between them', async () => {
      mockFiles['another-system.yaml'] = `
name: Another System
version: 1.0.0
level: container
nodes: []
dependencies: []
`;
      const store = useBlueprintStore.getState();
      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(true);

      const state = useBlueprintStore.getState();
      expect(state.loadedSystems).toHaveLength(2);
      expect(state.loadedSystems[0].path).toBe('blueprint.yaml');
      expect(state.loadedSystems[1].path).toBe('another-system.yaml');
      expect(state.currentFilePath).toBe('blueprint.yaml');

      store.selectSystem('another-system.yaml');
      const state2 = useBlueprintStore.getState();
      expect(state2.currentFilePath).toBe('another-system.yaml');
      expect(state2.schema.name).toBe('Another System');
    });

    it('should initialize with default workspace manifest values on startup', () => {
      expect(defaultWorkspaceManifest).not.toBeNull();
      expect(defaultWorkspaceManifest?.name).toBe('Blueprint Workspace');
      expect(defaultWorkspaceManifestYaml).toContain('name: Blueprint Workspace');
    });

    it('should fall back to fileSystemPort saveSchema download when workspace is not open', async () => {
      const store = useBlueprintStore.getState();
      // Ensure workspace is not open
      useBlueprintStore.setState({ isWorkspaceOpen: false });

      const newManifestYaml = `name: Downloaded Workspace\nroot: ./root.yaml\nhierarchy: []`;
      const spySaveSchema = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySaveSchema.mockResolvedValue(true);

      const success = await store.saveWorkspaceManifest(newManifestYaml);
      expect(success).toBe(true);

      const updated = useBlueprintStore.getState();
      expect(updated.workspaceManifest?.name).toBe('Downloaded Workspace');
      expect(spySaveSchema).toHaveBeenCalledWith(newManifestYaml, 'blueprint-workspace.yaml');

      spySaveSchema.mockRestore();
    });

    it('should save workspace manifest to file and update manifest in state', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const newManifestYaml = `name: Updated Workspace\nroot: ./blueprint-containers.yaml\nhierarchy: []`;
      const spyWriteFile = vi.spyOn(store.workspacePort, 'writeFile');

      const success = await store.saveWorkspaceManifest(newManifestYaml);
      expect(success).toBe(true);

      const updated = useBlueprintStore.getState();
      expect(updated.workspaceManifest?.name).toBe('Updated Workspace');
      expect(updated.workspaceName).toBe('Updated Workspace');
      expect(updated.workspaceManifestYaml).toBe(newManifestYaml);
      expect(spyWriteFile).toHaveBeenCalledWith('blueprint-workspace.yaml', newManifestYaml);

      spyWriteFile.mockRestore();
    });

    it('should fail to save manifest if mandatory properties are missing', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const invalidManifest = `name: Invalid Workspace`;
      const success = await store.saveWorkspaceManifest(invalidManifest);
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain(
        'Workspace manifest must contain "name" and "root" properties'
      );
    });
  });
});

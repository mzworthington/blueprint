import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlueprintStore } from '../store';
import { defaultLoadedSystems } from '../store';

describe('ioState Actions & State Management', () => {
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

  describe('saveSchema error handling', () => {
    it('should return false if saveSchema port operation fails', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockResolvedValue(false);

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });

    it('should return false and log error if saveSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spySave = vi.spyOn(store.fileSystemPort, 'saveSchema');
      spySave.mockRejectedValue(new Error('Write permission denied'));

      const success = await store.saveSchema();
      expect(success).toBe(false);
      spySave.mockRestore();
    });
  });

  describe('loadSchema error handling', () => {
    it('should load content and return true on successful parsing', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue('name: Test Load\nversion: 1.0.0\nlevel: context\nnodes: []');

      const success = await store.loadSchema();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Test Load');
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema is cancelled by user', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockResolvedValue(null);

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });

    it('should return false if loadSchema throws', async () => {
      const store = useBlueprintStore.getState();
      const spyLoad = vi.spyOn(store.fileSystemPort, 'loadSchema');
      spyLoad.mockRejectedValue(new Error('File corrupted'));

      const success = await store.loadSchema();
      expect(success).toBe(false);
      spyLoad.mockRestore();
    });
  });

  describe('saveActiveDiagram logic', () => {
    it('should delegate to saveSchema when workspace is not open', async () => {
      const store = useBlueprintStore.getState();
      const originalSaveSchema = store.saveSchema;
      useBlueprintStore.setState({ isWorkspaceOpen: false });

      const mockSaveSchema = vi.fn().mockResolvedValue(true);
      useBlueprintStore.setState({ saveSchema: mockSaveSchema });

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      expect(mockSaveSchema).toHaveBeenCalled();

      useBlueprintStore.setState({ saveSchema: originalSaveSchema });
    });

    it('should write to file successfully when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockResolvedValue(true);

      const success = await store.saveActiveDiagram();
      expect(success).toBe(true);
      spyWrite.mockRestore();
    });

    it('should return false if writeFile fails or throws when workspace is open', async () => {
      const store = useBlueprintStore.getState();
      await store.openWorkspaceDirectory();

      const spyWrite = vi.spyOn(store.workspacePort, 'writeFile');
      spyWrite.mockRejectedValue(new Error('Read-only filesystem'));

      const success = await store.saveActiveDiagram();
      expect(success).toBe(false);
      spyWrite.mockRestore();
    });
  });

  describe('openWorkspaceDirectory edge cases', () => {
    it('should fail if no files are returned from workspace', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No blueprint .yaml or .yml');
      spyRead.mockRestore();
    });

    it('should log/skip invalid manifests and schemas and continue if at least one schema is valid', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([
        { name: 'workspace.yaml', content: 'invalid: :yaml' },
        { name: 'broken-schema.yaml', content: 'name: Broken\nlevel: invalid' },
        {
          name: 'valid.yaml',
          content: 'name: Valid Schema\nversion: 1.0.0\nlevel: context\nnodes: []',
        },
      ]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(true);
      expect(useBlueprintStore.getState().schema.name).toBe('Valid Schema');
      spyRead.mockRestore();
    });

    it('should fail if all schema files fail to parse', async () => {
      const store = useBlueprintStore.getState();
      const spyRead = vi.spyOn(store.workspacePort, 'readDirectoryFiles');
      spyRead.mockResolvedValue([{ name: 'broken.yaml', content: 'invalid: :yaml' }]);

      const success = await store.openWorkspaceDirectory();
      expect(success).toBe(false);
      expect(useBlueprintStore.getState().lastError).toContain('No valid blueprint schemas found');
      spyRead.mockRestore();
    });
  });
});

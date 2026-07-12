import * as yaml from 'js-yaml';
import type { DiagramState } from './diagramState';
import {
  type FileSystemPort,
  type WorkspacePort,
  type LoggerPort,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  type WorkspaceManifest,
  parseSchemaFromYaml,
  getClosestManifest,
  getFileName,
  resolveWorkspaceManifestState,
  resolveWorkspaceEntityRefs,
  getSystemIdFromPath,
  isEntityRef,
  getSchemaEntityRef,
} from '../../../core';
import {
  saveBaselineSchema,
  saveWorkingSchema,
  loadWorkingSchema,
} from '../../../infrastructure/db/db';

export interface IoState {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  logger: LoggerPort;
  setPorts: (
    ports: Partial<{
      fileSystemPort: FileSystemPort;
      workspacePort: WorkspacePort;
      logger: LoggerPort;
    }>
  ) => void;

  saveSchema: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;
  openWorkspaceDirectory: () => Promise<boolean>;
  saveActiveDiagram: () => Promise<boolean>;
  saveWorkspaceManifest: (manifestYaml: string) => Promise<boolean>;
}

type IoStateDeps = IoState & DiagramState;

export const createIoState = (set: any, get: () => IoStateDeps): IoState => ({
  fileSystemPort: noopFileSystem,
  workspacePort: noopWorkspace,
  logger: noopLogger,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  saveSchema: async () => {
    const { yamlCode, schema, fileSystemPort, logger } = get();
    const sanitizedName = schema.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const start = performance.now();
    logger.info('Initiating schema file write', { file: `${sanitizedName}.yaml` });

    try {
      const success = await fileSystemPort.saveSchema(
        yamlCode,
        `${sanitizedName || 'blueprint'}.yaml`
      );
      const duration = performance.now() - start;
      if (success) {
        logger.info('Schema file written successfully', { durationMs: Math.round(duration) });
      } else {
        logger.warn('Schema file write cancelled or failed', {
          durationMs: Math.round(duration),
        });
      }
      return success;
    } catch (err) {
      logger.error('Failed to save schema file', err);
      return false;
    }
  },

  loadSchema: async () => {
    const { fileSystemPort, importYaml, logger } = get();
    const start = performance.now();
    logger.info('Opening file dialog for schema load');

    try {
      const content = await fileSystemPort.loadSchema();
      const duration = performance.now() - start;
      if (content) {
        const success = importYaml(content);
        logger.info('Schema file loaded and parsed', {
          durationMs: Math.round(duration),
          success,
        });
        return success;
      }
      logger.info('Schema load cancelled by user', { durationMs: Math.round(duration) });
      return false;
    } catch (err) {
      logger.error('Failed to load schema file', err);
      return false;
    }
  },

  openWorkspaceDirectory: async () => {
    const { workspacePort, logger } = get();
    logger.info('Opening workspace folder picker');
    try {
      const ok = await workspacePort.selectDirectory();
      if (!ok) return false;

      const files = await workspacePort.readDirectoryFiles();
      if (files.length === 0) {
        throw new Error('No blueprint .yaml or .yml files found in selected directory');
      }

      const manifestFiles = files.filter(
        f =>
          f.name === 'workspace.yaml' ||
          f.name.endsWith('/workspace.yaml') ||
          f.name.endsWith('-workspace.yaml')
      );

      const nextLoadedManifests = manifestFiles
        .map(f => {
          try {
            const manifest = yaml.load(f.content) as WorkspaceManifest;
            return {
              path: f.name,
              manifest,
              yaml: f.content,
            };
          } catch (e) {
            logger.error(`Failed to parse workspace manifest YAML: ${f.name}`, e);
            return null;
          }
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      const schemaFiles = files.filter(f => !manifestFiles.includes(f));

      const nextLoadedSystems = schemaFiles
        .map(file => {
          try {
            const schema = parseSchemaFromYaml(file.content);
            return {
              path: file.name,
              name:
                schema.name ||
                file.name
                  .split('/')
                  .pop()!
                  .replace(/\.ya?ml$/, ''),
              schema,
            };
          } catch (err) {
            logger.warn(`Skipping file ${file.name} as it is not a valid blueprint schema: ${err}`);
            return null;
          }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (nextLoadedSystems.length === 0) {
        throw new Error('No valid blueprint schemas found in selected directory');
      }

      const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems);
      const resolvedSystems = nextLoadedSystems.map(sys => ({
        ...sys,
        schema: resolved.schemas[sys.path] || sys.schema,
      }));

      const resolvedSystemsWithDrafts = await Promise.all(
        resolvedSystems.map(async sys => {
          const sysId = getSystemIdFromPath(sys.path);
          const fileRefMap = resolved.nodeRefMap[sys.path] || {};

          await saveBaselineSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});

          const workingSchema = await loadWorkingSchema(
            sys.path,
            sys.schema.name,
            sys.schema.version,
            sys.schema.level,
            sys.schema.parentRef
          ).catch(() => null);

          if (workingSchema) {
            return {
              ...sys,
              schema: workingSchema,
            };
          } else {
            await saveWorkingSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});
            return sys;
          }
        })
      );

      let firstSystem = resolvedSystemsWithDrafts[0];
      const initialManifest = getClosestManifest(firstSystem.path, nextLoadedManifests);
      if (initialManifest?.manifest.root) {
        const rootRef = initialManifest.manifest.root;
        const foundRoot = resolvedSystemsWithDrafts.find(s => {
          if (isEntityRef(rootRef)) {
            const schemaRef = getSchemaEntityRef(s.schema, s.path);
            return schemaRef === rootRef;
          } else {
            const resolvedRootName = getFileName(rootRef);
            return s.path === rootRef || s.path === resolvedRootName;
          }
        });
        if (foundRoot) {
          firstSystem = foundRoot;
        }
      }

      const manifestState = resolveWorkspaceManifestState(firstSystem.path, nextLoadedManifests);

      set({
        isWorkspaceOpen: true,
        workspaceName: workspacePort.getDirectoryName(),
        loadedManifests: nextLoadedManifests,
        loadedSystems: resolvedSystemsWithDrafts,
        nodeRefMap: resolved.nodeRefMap,
        currentFilePath: firstSystem.path,
        navigationStack: [],
        ...manifestState,
      });
      get().initSchema(firstSystem.schema);
      return true;
    } catch (err) {
      logger.error('Failed to open workspace directory', err);
      set({ lastError: (err as Error).message || 'Failed to open workspace directory' });
      return false;
    }
  },

  saveActiveDiagram: async () => {
    const {
      yamlCode,
      schema,
      nodeRefMap,
      currentFilePath,
      workspacePort,
      isWorkspaceOpen,
      logger,
    } = get();
    if (!isWorkspaceOpen) {
      return get().saveSchema();
    }

    logger.info('Saving active diagram directly to workspace', { path: currentFilePath });
    try {
      const success = await workspacePort.writeFile(currentFilePath, yamlCode);
      if (success) {
        logger.info('Diagram saved successfully');
        // Update database baseline table to match the persistent file
        const sysId = getSystemIdFromPath(currentFilePath);
        const fileRefMap = nodeRefMap[currentFilePath] || {};
        await saveBaselineSchema(currentFilePath, schema, sysId, fileRefMap);
      } else {
        logger.error('Failed to save diagram');
      }
      return success;
    } catch (err) {
      logger.error('Error saving diagram in workspace', err);
      return false;
    }
  },

  saveWorkspaceManifest: async (manifestYaml: string) => {
    const { workspacePort, fileSystemPort, isWorkspaceOpen, logger } = get();
    try {
      const parsed = yaml.load(manifestYaml) as WorkspaceManifest;
      if (!parsed.name || !parsed.root) {
        throw new Error('Workspace manifest must contain "name" and "root" properties');
      }

      let success = false;
      const targetPath = get().workspaceManifestPath || 'blueprint-workspace.yaml';
      if (isWorkspaceOpen) {
        success = await workspacePort.writeFile(targetPath, manifestYaml);
      } else {
        success = await fileSystemPort.saveSchema(manifestYaml, targetPath);
      }

      if (success) {
        set({
          workspaceManifest: parsed,
          workspaceManifestYaml: manifestYaml,
          workspaceName: parsed.name,
          lastError: null,
        });
        logger.info('Workspace manifest saved successfully');
      }
      return success;
    } catch (err) {
      logger.error('Failed to save workspace manifest', err);
      set({ lastError: `Failed to save manifest: ${(err as Error).message}` });
      return false;
    }
  },
});

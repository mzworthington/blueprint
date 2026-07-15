import type { DiagramState } from './diagramState';
import type { UiState } from './uiState';
import {
  type FileSystemPort,
  type WorkspacePort,
  type LoggerPort,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
} from '../../../core';
import { parseSchemaFromYaml, resolveWorkspaceEntityRefs } from '@blueprint/core';
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
}

type IoStateDeps = IoState & DiagramState & UiState;

export const createIoState = (set: any, get: () => IoStateDeps): IoState => ({
  fileSystemPort: noopFileSystem,
  workspacePort: noopWorkspace,
  logger: noopLogger,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  saveSchema: async () => {
    const { yamlCode, schema, fileSystemPort, logger, setNotification } = get();
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
        setNotification?.({
          type: 'success',
          title: 'Schema Saved',
          message: `Successfully downloaded ${sanitizedName || 'blueprint'}.yaml`,
        });
      } else {
        logger.warn('Schema file write cancelled or failed', {
          durationMs: Math.round(duration),
        });
      }
      return success;
    } catch (err) {
      logger.error('Failed to save schema file', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while saving schema.',
      });
      return false;
    }
  },

  loadSchema: async () => {
    const { fileSystemPort, importYaml, logger, setNotification } = get();
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
        if (success) {
          setNotification?.({
            type: 'success',
            title: 'Schema Loaded',
            message: 'Successfully loaded and parsed schema from file.',
          });
        }
        return success;
      }
      logger.info('Schema load cancelled by user', { durationMs: Math.round(duration) });
      return false;
    } catch (err) {
      logger.error('Failed to load schema file', err);
      setNotification?.({
        type: 'error',
        title: 'Load Error',
        message: (err as Error).message || 'Error occurred while loading schema.',
      });
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

      const schemaFiles = files.filter(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

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
          const sysId = sys.schema.entityRef || 'default';
          const fileRefMap = resolved.nodeRefMap[sys.path] || {};

          await saveBaselineSchema(sys.path, sys.schema, sysId, fileRefMap).catch(() => {});

          const workingSchema = await loadWorkingSchema(
            sys.path,
            sys.schema.name,
            sys.schema.version,
            sys.schema.level,
            sys.schema.entityRef
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

      const firstSystem =
        resolvedSystemsWithDrafts.find(s => s.schema.level === 'context') ||
        resolvedSystemsWithDrafts.find(s => s.schema.level === 'container') ||
        resolvedSystemsWithDrafts[0];

      set({
        isWorkspaceOpen: true,
        workspaceName: workspacePort.getDirectoryName(),
        loadedSystems: resolvedSystemsWithDrafts,
        nodeRefMap: resolved.nodeRefMap,
        currentFilePath: firstSystem.path,
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
      setNotification,
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
        const sysId = schema.entityRef || 'default';
        const fileRefMap = nodeRefMap[currentFilePath] || {};
        await saveBaselineSchema(currentFilePath, schema, sysId, fileRefMap);
        setNotification?.({
          type: 'success',
          title: 'Save Successful',
          message: `Saved active diagram to ${currentFilePath.split('/').pop()}`,
        });
      } else {
        logger.error('Failed to save diagram');
        setNotification?.({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to write active diagram to disk.',
        });
      }
      return success;
    } catch (err) {
      logger.error('Error saving diagram in workspace', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while saving diagram.',
      });
      return false;
    }
  },
});

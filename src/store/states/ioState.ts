import * as yaml from 'js-yaml';
import type { DiagramState } from './diagramState';
import type { FileSystemPort, WorkspacePort, LoggerPort } from '../../domain/ports';
import type { WorkspaceManifest } from '../../domain/schema';
import { BrowserFileSystemAdapter, BrowserWorkspaceAdapter } from '../../adapters/fileSync';
import { ConsoleLoggerAdapter } from '../../adapters/telemetry';
import { parseSchemaFromYaml } from '../../domain/graph';
import { getClosestManifest, getFileName, resolveWorkspaceManifestState } from '../../domain/path';

export interface IoState {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  logger: LoggerPort;

  saveSchema: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;
  openWorkspaceDirectory: () => Promise<boolean>;
  saveActiveDiagram: () => Promise<boolean>;
  saveWorkspaceManifest: (manifestYaml: string) => Promise<boolean>;
}

type IoStateDeps = IoState & DiagramState;

export const createIoState = (
  set: (
    partial: Partial<IoStateDeps> | ((state: IoStateDeps) => Partial<IoStateDeps>),
    replace?: boolean
  ) => void,
  get: () => IoStateDeps
): IoState => ({
  fileSystemPort: BrowserFileSystemAdapter,
  workspacePort: BrowserWorkspaceAdapter,
  logger: ConsoleLoggerAdapter,

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

      let firstSystem = nextLoadedSystems[0];
      const initialManifest = getClosestManifest(firstSystem.path, nextLoadedManifests);
      if (initialManifest?.manifest.root) {
        const resolvedRootName = getFileName(initialManifest.manifest.root);
        const foundRoot = nextLoadedSystems.find(
          s => s.path === initialManifest.manifest.root || s.path === resolvedRootName
        );
        if (foundRoot) {
          firstSystem = foundRoot;
        }
      }

      const manifestState = resolveWorkspaceManifestState(firstSystem.path, nextLoadedManifests);

      set({
        isWorkspaceOpen: true,
        workspaceName: workspacePort.getDirectoryName(),
        loadedManifests: nextLoadedManifests,
        loadedSystems: nextLoadedSystems,
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
    const { yamlCode, currentFilePath, workspacePort, isWorkspaceOpen, logger } = get();
    if (!isWorkspaceOpen) {
      return get().saveSchema();
    }

    logger.info('Saving active diagram directly to workspace', { path: currentFilePath });
    try {
      const success = await workspacePort.writeFile(currentFilePath, yamlCode);
      if (success) {
        logger.info('Diagram saved successfully');
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

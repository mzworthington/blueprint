import type { SystemSchema, WorkspaceCatalogEntry } from '@blueprint/core';
import {
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
  buildWorkspaceCatalog,
} from '@blueprint/core';
import type { WorkingCopyPort } from '../../../../core';
import { resolveSchemaOnWorkspaceOpen } from '../../../../infrastructure/db/schemaCompare';
import { cancelDefaultIdbSeed } from '../diagramState/defaultIdbSeed';

import type { ToastNotification } from '../uiState';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

type OpenWorkspaceDeps = {
  selectDirectory: () => Promise<boolean>;
  readDirectoryFiles: () => Promise<Array<{ name: string; content: string }>>;
  getDirectoryName: () => string;
  workingCopy: WorkingCopyPort;
  logger: {
    info: (m: string, meta?: Record<string, unknown>) => void;
    warn: (m: string, meta?: Record<string, unknown>) => void;
    error: (m: string, err?: unknown) => void;
  };
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: (partial: Record<string, unknown>) => void;
};

/**
 * Parses YAML files from a workspace folder, builds a lightweight navigation catalog,
 * and fully loads only the entry diagram (context → container → first file).
 * Other systems are loaded on demand via ensureSystemLoaded.
 */
export async function loadWorkspaceFromDirectory(deps: OpenWorkspaceDeps): Promise<boolean> {
  const { logger, setNotification, initSchema, set } = deps;
  logger.info('Opening workspace folder picker');

  const ok = await deps.selectDirectory();
  if (!ok) return false;

  // Stop bundled-default IDB seeding from racing with real workspace paths.
  cancelDefaultIdbSeed();

  const files = await deps.readDirectoryFiles();
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

  const workspaceName = deps.getDirectoryName();
  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems, workspaceName);
  const resolvedSystems = nextLoadedSystems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  const workspaceCatalog: WorkspaceCatalogEntry[] = buildWorkspaceCatalog(
    resolvedSystems.map(s => ({ path: s.path, schema: s.schema })),
    workspaceName
  );

  const firstSystem =
    resolvedSystems.find(s => s.schema.level === 'context') ||
    resolvedSystems.find(s => s.schema.level === 'container') ||
    resolvedSystems[0];

  // Only draft-reconcile the entry diagram — other files load on navigation.
  const { systems, discardedDraftCount } = await applyDiskFirstDraftResolution(
    [firstSystem],
    resolved,
    deps.workingCopy,
    logger
  );

  const entry = systems[0] ?? firstSystem;

  set({
    isWorkspaceOpen: true,
    workspaceName,
    workspaceCatalog,
    loadedSystems: [entry],
    nodeRefMap: {
      [entry.path]: resolved.nodeRefMap[entry.path] || {},
    },
    currentFilePath: entry.path,
  });
  initSchema(entry.schema);

  logger.info('Workspace opened with lazy system load', {
    catalogSize: workspaceCatalog.length,
    entryPath: entry.path,
  });

  if (discardedDraftCount > 0) {
    setNotification?.({
      type: 'info',
      title: 'Loaded files from disk',
      message: `Discarded ${discardedDraftCount} stale local draft${
        discardedDraftCount === 1 ? '' : 's'
      } that differed from YAML on disk (e.g. after a CLI rescan).`,
    });
  }

  return true;
}

export async function applyDiskFirstDraftResolution(
  resolvedSystems: LoadedSystem[],
  resolved: ReturnType<typeof resolveWorkspaceEntityRefs>,
  workingCopy: WorkingCopyPort,
  logger: { warn: (m: string, meta?: Record<string, unknown>) => void }
): Promise<{ systems: LoadedSystem[]; discardedDraftCount: number }> {
  let discardedDraftCount = 0;
  const systems: LoadedSystem[] = [];

  for (const sys of resolvedSystems) {
    const sysId = sys.schema.entityRef || 'default';
    const fileRefMap = resolved.nodeRefMap[sys.path] || {};
    const diskSchema = sys.schema;

    // Sequential Dexie writes avoid fake-indexeddb transaction deadlocks.
    try {
      await workingCopy.saveBaselineSchema({
        filePath: sys.path,
        schema: diskSchema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    let workingSchema: SystemSchema | null = null;
    try {
      workingSchema = await workingCopy.loadWorkingSchema({
        filePath: sys.path,
        systemName: diskSchema.name,
        systemVersion: diskSchema.version,
        systemLevel: diskSchema.level,
        systemEntityRef: diskSchema.entityRef,
      });
    } catch {
      workingSchema = null;
    }

    const resolution = resolveSchemaOnWorkspaceOpen(diskSchema, workingSchema);
    if (resolution.discardedStaleDraft) {
      discardedDraftCount += 1;
      logger.warn('Discarding IndexedDB draft that no longer matches disk YAML', {
        path: sys.path,
      });
    }

    try {
      await workingCopy.saveWorkingSchema({
        filePath: sys.path,
        schema: resolution.schema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    systems.push({
      ...sys,
      schema: resolution.schema,
    });
  }

  return { systems, discardedDraftCount };
}

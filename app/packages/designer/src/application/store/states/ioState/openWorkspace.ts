import type { SystemSchema } from '@blueprint/core';
import { parseSchemaFromYaml, resolveWorkspaceEntityRefs } from '@blueprint/core';
import {
  saveBaselineSchema,
  saveWorkingSchema,
  loadWorkingSchema,
} from '../../../../infrastructure/db/db';
import { resolveSchemaOnWorkspaceOpen } from '../../../../infrastructure/db/schemaCompare';
import { cancelDefaultIdbSeed } from '../diagramState/defaultIdbSeed';

import type { ToastNotification } from '../uiState';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

type OpenWorkspaceDeps = {
  selectDirectory: () => Promise<boolean>;
  readDirectoryFiles: () => Promise<Array<{ name: string; content: string }>>;
  getDirectoryName: () => string;
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
 * Parses YAML files from a workspace folder and applies disk-first draft resolution.
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

  const resolved = resolveWorkspaceEntityRefs(nextLoadedSystems);
  const resolvedSystems = nextLoadedSystems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));

  const { systems, discardedDraftCount } = await applyDiskFirstDraftResolution(
    resolvedSystems,
    resolved,
    logger
  );

  const firstSystem =
    systems.find(s => s.schema.level === 'context') ||
    systems.find(s => s.schema.level === 'container') ||
    systems[0];

  set({
    isWorkspaceOpen: true,
    workspaceName: deps.getDirectoryName(),
    loadedSystems: systems,
    nodeRefMap: resolved.nodeRefMap,
    currentFilePath: firstSystem.path,
  });
  initSchema(firstSystem.schema);

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
      await saveBaselineSchema(sys.path, diskSchema, sysId, fileRefMap);
    } catch {
      /* ignore persistence failures on open */
    }

    let workingSchema: SystemSchema | null = null;
    try {
      workingSchema = await loadWorkingSchema(
        sys.path,
        diskSchema.name,
        diskSchema.version,
        diskSchema.level,
        diskSchema.entityRef
      );
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
      await saveWorkingSchema(sys.path, resolution.schema, sysId, fileRefMap);
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

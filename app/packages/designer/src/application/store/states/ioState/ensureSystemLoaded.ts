import type { SystemSchema } from '@blueprint/core';
import {
  parseSchemaFromYaml,
  resolveWorkspaceEntityRefs,
  type WorkspaceCatalogEntry,
} from '@blueprint/core';
import type { WorkingCopyPort, WorkspacePort, LoggerPort } from '../../../../core';
import { applyDiskFirstDraftResolution } from './openWorkspace';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

export type EnsureSystemLoadedDeps = {
  workspacePort: WorkspacePort;
  workingCopyPort: WorkingCopyPort;
  logger: LoggerPort;
  get: () => {
    loadedSystems: LoadedSystem[];
    workspaceCatalog: WorkspaceCatalogEntry[];
    workspaceName: string;
    nodeRefMap: Record<string, Record<string, string>>;
  };
  set: (partial: Record<string, unknown>) => void;
};

/** In-flight loads keyed by path so concurrent navigations coalesce. */
const inflightLoads = new Map<string, Promise<boolean>>();

/**
 * Parse, resolve, and draft-reconcile a single workspace file into `loadedSystems`.
 * No-ops when already cached. Returns false if the file cannot be loaded.
 */
export async function ensureSystemLoaded(
  path: string,
  deps: EnsureSystemLoadedDeps
): Promise<boolean> {
  const { get, set, logger, workspacePort, workingCopyPort } = deps;
  if (get().loadedSystems.some(s => s.path === path)) {
    return true;
  }

  const existing = inflightLoads.get(path);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const catalogEntry = get().workspaceCatalog.find(e => e.path === path);
      const content = await workspacePort.readFile(path);
      const schema = parseSchemaFromYaml(content);
      const name =
        schema.name ||
        catalogEntry?.name ||
        path
          .split('/')
          .pop()!
          .replace(/\.ya?ml$/, '');

      const { loadedSystems, workspaceCatalog, workspaceName, nodeRefMap } = get();
      const filesForResolve: Array<{ path: string; schema: SystemSchema }> = [
        ...loadedSystems.map(s => ({ path: s.path, schema: s.schema })),
        { path, schema },
      ];

      // Stub context when the context diagram is not yet cached so short refs still resolve.
      const contextEntry = workspaceCatalog.find(e => e.level === 'context');
      if (
        contextEntry &&
        !filesForResolve.some(f => f.path === contextEntry.path) &&
        path !== contextEntry.path
      ) {
        filesForResolve.unshift({
          path: contextEntry.path,
          schema: {
            name: contextEntry.name,
            version: '1.0.0',
            level: 'context',
            entityRef: contextEntry.entityRef,
            nodes: contextEntry.nodeEntityRefs.map(entityRef => ({
              entityRef,
              type: 'software-system',
              name: entityRef,
            })),
            dependencies: [],
          },
        });
      }

      const resolved = resolveWorkspaceEntityRefs(filesForResolve, workspaceName);
      const resolvedSchema = resolved.schemas[path] || schema;
      const candidate: LoadedSystem = { path, name, schema: resolvedSchema };

      const { systems } = await applyDiskFirstDraftResolution(
        [candidate],
        resolved,
        workingCopyPort,
        logger
      );
      const loaded = systems[0];
      if (!loaded) return false;

      const nextLoaded = [...get().loadedSystems];
      if (!nextLoaded.some(s => s.path === path)) {
        nextLoaded.push(loaded);
      }

      set({
        loadedSystems: nextLoaded,
        nodeRefMap: {
          ...nodeRefMap,
          ...resolved.nodeRefMap,
          [path]: resolved.nodeRefMap[path] || {},
        },
      });
      logger.info('Lazy-loaded workspace system', { path, name: loaded.name });
      return true;
    } catch (err) {
      logger.error('Failed to lazy-load workspace system', err, { path });
      return false;
    } finally {
      inflightLoads.delete(path);
    }
  })();

  inflightLoads.set(path, promise);
  return promise;
}

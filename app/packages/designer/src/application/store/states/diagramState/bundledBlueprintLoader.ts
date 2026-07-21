import {
  buildWorkspaceCatalog,
  resolveWorkspaceEntityRefs,
  type C4Level,
  type SystemSchema,
  type WorkspaceCatalogEntry,
} from '@blueprint/core';
import {
  blueprintPaths,
  CONTEXT_BLUEPRINT_PATH,
  defaultLoadedSystems,
  loadBlueprintSchema,
} from '../../defaultData';
import type { HydrateSystem } from './hydrateSandboxDrafts';
import { seedDefaultSchemasSafely } from './defaultIdbSeed';
import type { LoggerPort } from '../../../../core';

const inflightBundledLoads = new Map<string, Promise<boolean>>();

export type BundledSystem = { path: string; name: string; schema: SystemSchema };

export function inferEntityRefFromBundledPath(path: string): string | undefined {
  if (path === CONTEXT_BLUEPRINT_PATH) return 'blueprint';
  const containersMatch = path.match(/^([^/]+)\/containers\.yaml$/);
  if (containersMatch) return `blueprint/${containersMatch[1]}`;
  const componentMatch = path.match(/^(.+)\/([^/]+)-components\.yaml$/);
  if (componentMatch) return `blueprint/${componentMatch[1]}/${componentMatch[2]}`;
  return undefined;
}

function inferLevelFromBundledPath(path: string): C4Level {
  if (path === CONTEXT_BLUEPRINT_PATH) return 'context';
  if (path.endsWith('/containers.yaml') || path === 'containers.yaml') return 'container';
  return 'component';
}

/** Navigation index from bundled YAML paths without parsing every schema body. */
export function buildBundledPathCatalog(paths: string[]): WorkspaceCatalogEntry[] {
  const stubs = paths
    .map(path => {
      const entityRef = inferEntityRefFromBundledPath(path);
      if (!entityRef) return null;
      const leaf =
        path
          .split('/')
          .pop()
          ?.replace(/\.ya?ml$/, '') ?? path;
      const schema: SystemSchema = {
        name: leaf,
        version: '1.0.0',
        level: inferLevelFromBundledPath(path),
        entityRef,
        nodes: [],
        dependencies: [],
      };
      return { path, schema };
    })
    .filter((entry): entry is { path: string; schema: SystemSchema } => entry !== null);

  return buildWorkspaceCatalog(stubs);
}

export async function ensureBundledSystemLoaded(
  path: string,
  deps: {
    get: () => {
      loadedSystems: BundledSystem[];
      workspaceName: string;
      nodeRefMap: Record<string, Record<string, string>>;
      isWorkspaceOpen: boolean;
    };
    set: (partial: Record<string, unknown>) => void;
    logger: LoggerPort;
  }
): Promise<boolean> {
  if (deps.get().isWorkspaceOpen) return false;
  if (deps.get().loadedSystems.some(s => s.path === path)) return true;

  const existing = inflightBundledLoads.get(path);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const schema = await loadBlueprintSchema(path);
      if (!schema) {
        deps.logger.warn('Bundled blueprint path not found', { path });
        return false;
      }

      const name =
        schema.name ||
        path
          .split('/')
          .pop()!
          .replace(/\.ya?ml$/, '');
      const { loadedSystems, workspaceName } = deps.get();
      const filesForResolve = [
        ...loadedSystems.map(s => ({ path: s.path, schema: s.schema })),
        { path, schema },
      ];
      const resolved = resolveWorkspaceEntityRefs(filesForResolve, workspaceName);
      const resolvedSchema = resolved.schemas[path] || schema;
      const candidate: BundledSystem = { path, name, schema: resolvedSchema };

      const nextLoaded = [...deps.get().loadedSystems];
      if (!nextLoaded.some(s => s.path === path)) {
        nextLoaded.push(candidate);
      }

      const mergedResolved = resolveWorkspaceEntityRefs(
        nextLoaded.map(s => ({ path: s.path, schema: s.schema })),
        workspaceName
      );
      const workspaceCatalog = buildWorkspaceCatalog(
        nextLoaded.map(s => ({ path: s.path, schema: mergedResolved.schemas[s.path] || s.schema }))
      );

      deps.set({
        loadedSystems: nextLoaded.map(s => ({
          ...s,
          schema: mergedResolved.schemas[s.path] || s.schema,
        })),
        workspaceCatalog,
        nodeRefMap: mergedResolved.nodeRefMap,
      });
      deps.logger.info('Lazy-loaded bundled blueprint', { path, name });
      return true;
    } catch (err) {
      deps.logger.error('Failed to lazy-load bundled blueprint', err, { path });
      return false;
    } finally {
      inflightBundledLoads.delete(path);
    }
  })();

  inflightBundledLoads.set(path, promise);
  return promise;
}

let prefetchStarted = false;

/**
 * Background-load remaining bundled blueprints after the context diagram is shown.
 * Yields between batches so the UI stays responsive.
 */
export function startBundledBlueprintPrefetch(deps: {
  get: () => {
    loadedSystems: BundledSystem[];
    workspaceName: string;
    isWorkspaceOpen: boolean;
    workingCopyPort?: {
      pathHasStoredData: (filePath: string) => Promise<boolean>;
      saveBaselineSchema: (args: {
        filePath: string;
        schema: SystemSchema;
        systemId: string;
        nodeRefMap: Record<string, string>;
      }) => Promise<void>;
      saveWorkingSchema: (args: {
        filePath: string;
        schema: SystemSchema;
        systemId: string;
        nodeRefMap: Record<string, string>;
      }) => Promise<void>;
    };
  };
  set: (partial: Record<string, unknown>) => void;
}): void {
  if (prefetchStarted || deps.get().isWorkspaceOpen) return;
  prefetchStarted = true;

  const pendingPaths = blueprintPaths.filter(
    path => path !== CONTEXT_BLUEPRINT_PATH && !deps.get().loadedSystems.some(s => s.path === path)
  );
  if (pendingPaths.length === 0) return;

  const BATCH_SIZE = 10;

  void (async () => {
    for (let i = 0; i < pendingPaths.length; i += BATCH_SIZE) {
      if (deps.get().isWorkspaceOpen) return;

      const batchPaths = pendingPaths.slice(i, i + BATCH_SIZE);
      const batchSystems: BundledSystem[] = [];

      for (const path of batchPaths) {
        const schema = await loadBlueprintSchema(path);
        if (!schema) continue;
        batchSystems.push({
          path,
          name:
            schema.name ||
            path
              .split('/')
              .pop()!
              .replace(/\.ya?ml$/, ''),
          schema,
        });
      }

      if (batchSystems.length === 0) continue;

      const merged = [...deps.get().loadedSystems];
      for (const sys of batchSystems) {
        if (!merged.some(s => s.path === sys.path)) merged.push(sys);
      }

      const resolved = resolveWorkspaceEntityRefs(
        merged.map(s => ({ path: s.path, schema: s.schema })),
        deps.get().workspaceName
      );
      const workspaceCatalog = buildWorkspaceCatalog(
        merged.map(s => ({ path: s.path, schema: resolved.schemas[s.path] || s.schema }))
      );

      deps.set({
        loadedSystems: merged.map(s => ({
          ...s,
          schema: resolved.schemas[s.path] || s.schema,
        })),
        workspaceCatalog,
        nodeRefMap: resolved.nodeRefMap,
      });

      const workingCopy = deps.get().workingCopyPort;
      if (workingCopy) {
        await seedDefaultSchemasSafely(
          batchSystems,
          {
            schemas: resolved.schemas,
            nodeRefMap: resolved.nodeRefMap,
          },
          {
            pathHasStoredData: path => workingCopy.pathHasStoredData(path),
            saveBaselineSchema: (filePath, schema, systemId, nodeRefMap) =>
              workingCopy.saveBaselineSchema({ filePath, schema, systemId, nodeRefMap }),
            saveWorkingSchema: (filePath, schema, systemId, nodeRefMap) =>
              workingCopy.saveWorkingSchema({ filePath, schema, systemId, nodeRefMap }),
          }
        ).catch(() => {});
      }

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }
  })();
}

export function resetBundledBlueprintLoaderState(): void {
  prefetchStarted = false;
  inflightBundledLoads.clear();
}

export function guessBundledPathForEntityRef(entityRef: string): string | undefined {
  if (!entityRef) return undefined;
  return blueprintPaths.find(path => inferEntityRefFromBundledPath(path) === entityRef);
}

export function resolveBundledContextSystems(): HydrateSystem[] {
  return defaultLoadedSystems;
}

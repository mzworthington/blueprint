import type {
  EntityRef,
  ExternalCandidateFilters,
  SystemSchema,
  WorkspaceEntity,
} from '@blueprint/core';
import {
  buildWorkspaceEntityIndex,
  computeExternalNodePositions,
  enrichContainerSchemaFromComponentDeps,
  listExternalCandidates,
  materializeExternalNodes,
  suggestExternalDependencies,
} from '@blueprint/core';
import { mapDomainDepToRFEdge, mapDomainNodeToRFNode } from '../../layoutUtils';
import type { BlueprintRFEdge, BlueprintRFNode } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';
import type { ToastNotification } from '../uiState';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

type StoreGet = () => {
  schema: SystemSchema;
  loadedSystems: LoadedSystem[];
  nodes: BlueprintRFNode[];
  edges: unknown[];
  logger: { warn: (m: string) => void; info: (m: string) => void };
  setNotification?: (notification: ToastNotification | null) => void;
};

function requireWorkspaceContext(get: StoreGet) {
  const { schema, loadedSystems, logger } = get();
  if (!loadedSystems.length) {
    logger.warn('Load a workspace to browse external dependencies.');
    return null;
  }
  return { schema, loadedSystems };
}

export function listWorkspaceExternalCandidates(
  get: StoreGet,
  filters: ExternalCandidateFilters = {}
): WorkspaceEntity[] {
  const context = requireWorkspaceContext(get);
  if (!context) return [];

  const index = buildWorkspaceEntityIndex(context.loadedSystems);
  return listExternalCandidates(context.schema, index, filters);
}

function mergeExternalNodesOntoCanvas(
  set: (partial: Record<string, unknown>) => void,
  get: StoreGet,
  entities: WorkspaceEntity[]
): number {
  if (entities.length === 0) return 0;

  const currentNodes = [...get().nodes] as BlueprintRFNode[];
  const entityRefs = new Set(entities.map(e => e.entityRef));
  let changedCount = 0;

  for (let i = 0; i < currentNodes.length; i++) {
    const node = currentNodes[i];
    if (!entityRefs.has(node.id)) continue;
    if (node.data.external) continue;
    currentNodes[i] = {
      ...node,
      data: {
        ...node.data,
        external: true,
      },
    };
    changedCount++;
  }

  const missing = entities.filter(
    entity => !currentNodes.some(node => node.id === entity.entityRef)
  );

  if (missing.length > 0) {
    const positions = computeExternalNodePositions(
      missing.length,
      currentNodes.map(n => n.position)
    );
    const domainNodes = materializeExternalNodes(missing, positions);
    for (const domainNode of domainNodes) {
      currentNodes.push(mapDomainNodeToRFNode(domainNode));
      changedCount++;
    }
  }

  if (changedCount > 0) {
    applyStateUpdates(set, get, currentNodes, get().edges as BlueprintRFEdge[]);
  }

  return changedCount;
}

/**
 * Apply a rolled-up container schema: merge new external container nodes and
 * inter-container edges (with component-pair descriptions) onto the canvas.
 */
function applyContainerRollupToCanvas(
  set: (partial: Record<string, unknown>) => void,
  get: StoreGet,
  enriched: SystemSchema
): { nodesAdded: number; edgesAdded: number } {
  const currentNodes = [...(get().nodes as BlueprintRFNode[])];
  const currentEdges = [...(get().edges as BlueprintRFEdge[])];
  const byId = new Map(currentNodes.map(n => [n.id, n]));

  let nodesAdded = 0;
  for (const domain of enriched.nodes) {
    const existing = byId.get(domain.entityRef);
    if (existing) {
      if (domain.external && !existing.data.external) {
        const idx = currentNodes.findIndex(n => n.id === existing.id);
        currentNodes[idx] = {
          ...existing,
          data: { ...existing.data, external: true, name: domain.name },
        };
        nodesAdded++;
      }
      continue;
    }
    currentNodes.push(mapDomainNodeToRFNode(domain));
    nodesAdded++;
  }

  const edgeKeys = new Set(currentEdges.map(e => `${e.source}\0${e.target}`));
  let edgesAdded = 0;
  for (const dep of enriched.dependencies) {
    const key = `${dep.from}\0${dep.to}`;
    if (edgeKeys.has(key)) {
      // Refresh label when rollup provides a component-pair description
      if (dep.description) {
        const idx = currentEdges.findIndex(e => e.source === dep.from && e.target === dep.to);
        if (idx !== -1 && !currentEdges[idx]!.data?.description) {
          const existing = currentEdges[idx]!;
          currentEdges[idx] = {
            ...existing,
            label: dep.description,
            data: {
              type: existing.data?.type ?? dep.type,
              description: dep.description,
            },
          };
        }
      }
      continue;
    }
    currentEdges.push(mapDomainDepToRFEdge(dep));
    edgeKeys.add(key);
    edgesAdded++;
  }

  if (nodesAdded > 0 || edgesAdded > 0) {
    applyStateUpdates(set, get, currentNodes, currentEdges);
  }

  return { nodesAdded, edgesAdded };
}

export function addExternalDependencies(
  set: (partial: Record<string, unknown>) => void,
  get: StoreGet,
  entityRefs: EntityRef[]
) {
  void set;
  const context = requireWorkspaceContext(get);
  if (!context || entityRefs.length === 0) return;

  const index = buildWorkspaceEntityIndex(context.loadedSystems);
  const entities = entityRefs
    .map(ref => index.byRef.get(ref))
    .filter((entity): entity is WorkspaceEntity => !!entity);

  const addedCount = mergeExternalNodesOntoCanvas(set, get, entities);
  if (addedCount > 0) {
    get().logger.info(`Added ${addedCount} external node(s) to the diagram.`);
    get().setNotification?.({
      type: 'success',
      title: 'External dependencies',
      message: `Added ${addedCount} external node${addedCount === 1 ? '' : 's'} to the diagram.`,
    });
  }
}

export function syncSuggestedExternals(
  set: (partial: Record<string, unknown>) => void,
  get: StoreGet
) {
  void set;
  const context = requireWorkspaceContext(get);
  if (!context) return;

  const index = buildWorkspaceEntityIndex(context.loadedSystems);

  if (context.schema.level === 'container') {
    const rolled = enrichContainerSchemaFromComponentDeps(
      context.schema,
      context.loadedSystems,
      index
    );
    const { nodesAdded, edgesAdded } = applyContainerRollupToCanvas(set, get, rolled);

    if (nodesAdded > 0 || edgesAdded > 0) {
      get().logger.info(
        `Synced container couplings: ${edgesAdded} edge(s), ${nodesAdded} external node(s).`
      );
      get().setNotification?.({
        type: 'success',
        title: 'Sync externals',
        message: `Added ${edgesAdded} coupling line${edgesAdded === 1 ? '' : 's'} from component dependencies${
          nodesAdded > 0
            ? ` and ${nodesAdded} external container${nodesAdded === 1 ? '' : 's'}`
            : ''
        }.`,
      });
    } else {
      get().logger.info('Container diagram already reflects component-level couplings.');
      get().setNotification?.({
        type: 'info',
        title: 'Sync externals',
        message: 'Container couplings from component dependencies are already on the diagram.',
      });
    }
    return;
  }

  const suggested = suggestExternalDependencies(context.schema, context.loadedSystems, index);

  if (suggested.length === 0) {
    get().logger.info('No external dependencies to sync for this diagram.');
    get().setNotification?.({
      type: 'info',
      title: 'Sync externals',
      message: 'No suggested external dependencies for this diagram.',
    });
    return;
  }

  const addedCount = mergeExternalNodesOntoCanvas(set, get, suggested);
  if (addedCount > 0) {
    get().logger.info(`Synced ${addedCount} external node(s).`);
    get().setNotification?.({
      type: 'success',
      title: 'Sync externals',
      message: `Synced ${addedCount} external node${addedCount === 1 ? '' : 's'}.`,
    });
  } else {
    get().logger.info('All suggested external dependencies are already on the canvas.');
    get().setNotification?.({
      type: 'info',
      title: 'Sync externals',
      message: 'All suggested external dependencies are already on the canvas.',
    });
  }
}

/** @deprecated Use syncSuggestedExternals */
export function syncExternalContainers(
  set: (partial: Record<string, unknown>) => void,
  get: StoreGet
) {
  syncSuggestedExternals(set, get);
}

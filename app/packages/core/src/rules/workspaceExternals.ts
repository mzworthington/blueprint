import type {
  C4Level,
  EntityRef,
  NodeType,
  SystemDependency,
  SystemNode,
  SystemSchema,
} from '../models/schema';
import { EntityRef as EntityRefUtil } from '../models/schema';

export interface LoadedSystemInput {
  path: string;
  name: string;
  schema: SystemSchema;
}

export interface WorkspaceEntity {
  entityRef: EntityRef;
  name: string;
  type: NodeType;
  /** C4 level of the schema file that owns this entity. */
  sourceSchemaLevel: C4Level;
  sourcePath: string;
  parentContainerRef?: EntityRef;
  properties?: SystemNode['properties'];
}

export interface WorkspaceEntityIndex {
  byRef: Map<EntityRef, WorkspaceEntity>;
}

export interface ExternalCandidateFilters {
  sourceSchemaLevels?: C4Level[];
  types?: NodeType[];
  search?: string;
}

export type ExternalEnrichMode = 'suggested' | 'unresolved';

export interface EnrichExternalsOptions {
  /** Default: `suggested` (neighbor containers + cross-diagram + unresolved). */
  mode?: ExternalEnrichMode;
  /**
   * On container-level diagrams, only materialize container-level entities.
   * Default: true.
   */
  containersOnlyOnContainerDiagrams?: boolean;
  /**
   * Only enrich schemas at these C4 levels. When set, other levels are returned unchanged.
   * Useful for CLI passes that should never touch context diagrams.
   */
  enrichLevels?: C4Level[];
}

const EXTERNAL_NAME_SUFFIX = ' (External)';

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function isOnActiveDiagram(entityRef: EntityRef, activeSchema: SystemSchema): boolean {
  return activeSchema.nodes.some(n => n.entityRef === entityRef);
}

function isScopedToActiveDiagram(entityRef: EntityRef, activeSchema: SystemSchema): boolean {
  const scope = activeSchema.entityRef?.trim();
  if (!scope) return false;
  if (activeSchema.level !== 'component' && activeSchema.level !== 'code') return false;
  return entityRef === scope || entityRef.startsWith(`${scope}/`);
}

function isExcludedFromExternalCandidates(
  entityRef: EntityRef,
  activeSchema: SystemSchema
): boolean {
  if (isOnActiveDiagram(entityRef, activeSchema)) return true;
  return isScopedToActiveDiagram(entityRef, activeSchema);
}

/**
 * Flatten every node from loaded workspace schemas into a lookup keyed by entityRef.
 */
export function buildWorkspaceEntityIndex(
  loadedSystems: LoadedSystemInput[]
): WorkspaceEntityIndex {
  const byRef = new Map<EntityRef, WorkspaceEntity>();

  for (const system of loadedSystems) {
    const { schema, path } = system;
    for (const node of schema.nodes) {
      if (!node.entityRef) continue;
      const parent = EntityRefUtil.getParent(node.entityRef);
      byRef.set(node.entityRef, {
        entityRef: node.entityRef,
        name: node.name,
        type: node.type,
        sourceSchemaLevel: schema.level,
        sourcePath: path,
        parentContainerRef: schema.level === 'component' && parent ? parent : undefined,
        properties: node.properties,
      });
    }
  }

  return { byRef };
}

/**
 * List workspace entities that can be materialized as external nodes on the active diagram.
 */
export function listExternalCandidates(
  activeSchema: SystemSchema,
  index: WorkspaceEntityIndex,
  filters: ExternalCandidateFilters = {}
): WorkspaceEntity[] {
  const search = filters.search ? normalizeSearch(filters.search) : '';
  const results: WorkspaceEntity[] = [];

  for (const entity of index.byRef.values()) {
    if (isExcludedFromExternalCandidates(entity.entityRef, activeSchema)) continue;

    if (
      filters.sourceSchemaLevels &&
      !filters.sourceSchemaLevels.includes(entity.sourceSchemaLevel)
    ) {
      continue;
    }

    if (filters.types && !filters.types.includes(entity.type)) {
      continue;
    }

    if (search) {
      const haystack = `${entity.name} ${entity.entityRef}`.toLowerCase();
      if (!haystack.includes(search)) continue;
    }

    results.push(entity);
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Assign grid positions for newly materialized external nodes.
 */
export function computeExternalNodePositions(
  count: number,
  occupied: Array<{ x: number; y: number }>,
  start = { x: 100, y: 100 }
): Array<{ x: number; y: number }> {
  let maxX = start.x;
  let maxY = start.y;
  for (const pos of occupied) {
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  }

  const positions: Array<{ x: number; y: number }> = [];
  let x = maxX + 180;
  let y = maxY;

  for (let i = 0; i < count; i++) {
    if (x > 600) {
      x = start.x;
      y += 120;
    }
    positions.push({ x, y });
    x += 180;
  }

  return positions;
}

function externalDisplayName(name: string): string {
  return name.includes('(External)') ? name : `${name}${EXTERNAL_NAME_SUFFIX}`;
}

/**
 * Create external proxy nodes for the active diagram from workspace entities.
 */
export function materializeExternalNodes(
  entities: WorkspaceEntity[],
  positions: Array<{ x: number; y: number }>
): SystemNode[] {
  return entities.map((entity, index) => {
    const position = positions[index] ?? { x: 100 + index * 180, y: 100 };
    return {
      entityRef: entity.entityRef,
      type: entity.type,
      name: externalDisplayName(entity.name),
      external: true,
      properties: entity.properties ? { ...entity.properties } : undefined,
      x: position.x,
      y: position.y,
    };
  });
}

function collectContainerNeighborRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  if (activeSchema.level === 'container') {
    const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
    const related = new Set<EntityRef>();
    for (const dep of activeSchema.dependencies) {
      if (onDiagram.has(dep.from)) related.add(dep.to);
      if (onDiagram.has(dep.to)) related.add(dep.from);
    }
    return [...related];
  }

  if (activeSchema.level === 'context') {
    const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
    const related = new Set<EntityRef>();
    for (const dep of activeSchema.dependencies) {
      if (onDiagram.has(dep.from)) related.add(dep.to);
      if (onDiagram.has(dep.to)) related.add(dep.from);
    }
    return [...related];
  }

  if (activeSchema.level !== 'component' || !activeSchema.entityRef) return [];

  const parentRef = EntityRefUtil.getParent(activeSchema.entityRef);
  const parentSystem = loadedSystems.find(
    s => s.schema.level === 'container' && s.schema.entityRef === parentRef
  );
  if (!parentSystem) return [];

  const activeContainerRef = activeSchema.entityRef;
  const related = new Set<EntityRef>();

  for (const dep of parentSystem.schema.dependencies) {
    if (dep.from === activeContainerRef) related.add(dep.to);
    if (dep.to === activeContainerRef) related.add(dep.from);
  }

  return [...related];
}

function collectCrossDiagramRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  // Context scopes (e.g. `blueprint`) match almost every ref — never fan out here.
  if (activeSchema.level === 'context') return [];

  const scope = activeSchema.entityRef?.trim();
  if (!scope) return [];

  const refs = new Set<EntityRef>();

  const touchesScope = (ref: string) => ref === scope || ref.startsWith(`${scope}/`);

  for (const system of loadedSystems) {
    for (const dep of system.schema.dependencies) {
      const fromExternal = !isExcludedFromExternalCandidates(dep.from, activeSchema);
      const toExternal = !isExcludedFromExternalCandidates(dep.to, activeSchema);

      if (touchesScope(dep.from) && toExternal) refs.add(dep.to);
      if (touchesScope(dep.to) && fromExternal) refs.add(dep.from);
    }
  }

  return [...refs];
}

function collectUnresolvedDependencyRefs(activeSchema: SystemSchema): EntityRef[] {
  const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
  const refs = new Set<EntityRef>();

  for (const dep of activeSchema.dependencies) {
    if (!onDiagram.has(dep.from) && !isExcludedFromExternalCandidates(dep.from, activeSchema)) {
      refs.add(dep.from);
    }
    if (!onDiagram.has(dep.to) && !isExcludedFromExternalCandidates(dep.to, activeSchema)) {
      refs.add(dep.to);
    }
  }

  return [...refs];
}

/**
 * Infer workspace entities that are likely external dependencies for the active diagram.
 */
export function suggestExternalDependencies(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex
): WorkspaceEntity[] {
  const suggestedRefs = new Set<EntityRef>([
    ...collectContainerNeighborRefs(activeSchema, loadedSystems),
    ...collectCrossDiagramRefs(activeSchema, loadedSystems),
    ...collectUnresolvedDependencyRefs(activeSchema),
  ]);

  const entities: WorkspaceEntity[] = [];
  for (const ref of suggestedRefs) {
    const entity = index.byRef.get(ref);
    if (!entity) continue;
    if (isExcludedFromExternalCandidates(ref, activeSchema)) continue;
    entities.push(entity);
  }

  return entities.sort((a, b) => a.name.localeCompare(b.name));
}

function filterEntitiesForDiagramLevel(
  activeSchema: SystemSchema,
  entities: WorkspaceEntity[],
  options: EnrichExternalsOptions
): WorkspaceEntity[] {
  if (activeSchema.level === 'context') {
    return entities.filter(entity => entity.sourceSchemaLevel === 'context');
  }

  const containersOnly = options.containersOnlyOnContainerDiagrams !== false;
  if (containersOnly && activeSchema.level === 'container') {
    return entities.filter(entity => entity.sourceSchemaLevel === 'container');
  }

  return entities;
}

function selectEntitiesForEnrichment(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex,
  options: EnrichExternalsOptions
): WorkspaceEntity[] {
  const mode = options.mode ?? 'suggested';
  const entities =
    mode === 'unresolved'
      ? collectUnresolvedDependencyRefs(activeSchema)
          .map(ref => index.byRef.get(ref))
          .filter((entity): entity is WorkspaceEntity => !!entity)
          .filter(entity => !isExcludedFromExternalCandidates(entity.entityRef, activeSchema))
          .sort((a, b) => a.name.localeCompare(b.name))
      : suggestExternalDependencies(activeSchema, loadedSystems, index);

  return filterEntitiesForDiagramLevel(activeSchema, entities, options);
}

/**
 * Merge suggested (or unresolved) external proxy nodes onto a schema.
 * Idempotent: entities already on the diagram are left unchanged.
 */
export function enrichSchemaWithExternals(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex,
  options: EnrichExternalsOptions = {}
): SystemSchema {
  if (options.enrichLevels && !options.enrichLevels.includes(activeSchema.level)) {
    return activeSchema;
  }

  const entities = selectEntitiesForEnrichment(activeSchema, loadedSystems, index, options);
  const missing = entities.filter(entity => !isOnActiveDiagram(entity.entityRef, activeSchema));
  if (missing.length === 0) return activeSchema;

  const positions = computeExternalNodePositions(
    missing.length,
    activeSchema.nodes.map(n => ({ x: n.x ?? 0, y: n.y ?? 0 }))
  );
  const externalNodes = materializeExternalNodes(missing, positions);

  return {
    ...activeSchema,
    nodes: [...activeSchema.nodes, ...externalNodes],
  };
}

/**
 * Enrich every schema in a workspace using a shared entity index.
 * Index is built from the input schemas (before enrichment) so ownership stays with
 * the canonical non-external definitions.
 *
 * Container diagrams additionally receive inter-container edges rolled up from
 * cross-container component dependencies, then unresolved endpoints are materialized.
 */
export function enrichWorkspaceWithExternals(
  loadedSystems: LoadedSystemInput[],
  options: EnrichExternalsOptions = {}
): LoadedSystemInput[] {
  const index = buildWorkspaceEntityIndex(loadedSystems);
  return loadedSystems.map(system => {
    let schema = system.schema;
    if (schema.level === 'container') {
      schema = enrichContainerSchemaFromComponentDeps(schema, loadedSystems, index);
    }
    schema = enrichSchemaWithExternals(schema, loadedSystems, index, options);
    return { ...system, schema };
  });
}

function displayNameForRef(ref: EntityRef, index: WorkspaceEntityIndex): string {
  const entity = index.byRef.get(ref);
  if (entity?.name) {
    return entity.name.replace(/\s*\(External\)\s*$/i, '').trim();
  }
  return EntityRefUtil.leaf(ref);
}

export interface CrossContainerComponentDep {
  fromComponent: EntityRef;
  toComponent: EntityRef;
  fromContainer: EntityRef;
  toContainer: EntityRef;
  type: SystemDependency['type'];
}

/**
 * List component→component dependencies that cross container boundaries.
 * Uses parent entityRefs (not EntityRef.getLevel) so monorepo paths like
 * `context/system/container/component` still roll up correctly.
 */
export function listCrossContainerComponentDependencies(
  loadedSystems: LoadedSystemInput[]
): CrossContainerComponentDep[] {
  const results: CrossContainerComponentDep[] = [];
  const seen = new Set<string>();

  for (const system of loadedSystems) {
    if (system.schema.level !== 'component') continue;
    for (const dep of system.schema.dependencies) {
      const fromContainer = EntityRefUtil.getParent(dep.from);
      const toContainer = EntityRefUtil.getParent(dep.to);
      if (!fromContainer || !toContainer || fromContainer === toContainer) continue;

      // Ignore edges that are already container↔container (no further parent leaf).
      // Component refs always have a container parent that itself has a parent (system).
      if (!EntityRefUtil.getParent(fromContainer) || !EntityRefUtil.getParent(toContainer)) {
        continue;
      }

      const key = `${dep.from}\0${dep.to}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        fromComponent: dep.from,
        toComponent: dep.to,
        fromContainer,
        toContainer,
        type: dep.type,
      });
    }
  }

  return results;
}

function edgeTouchesContainerDiagram(dep: SystemDependency, schema: SystemSchema): boolean {
  const onDiagram = new Set(schema.nodes.map(n => n.entityRef));
  // Only roll up edges that connect to something already on this diagram.
  return onDiagram.has(dep.from) || onDiagram.has(dep.to);
}

/**
 * Roll cross-container component dependencies up into inter-container edges on a
 * container diagram, and materialize any missing container endpoints as externals.
 */
export function enrichContainerSchemaFromComponentDeps(
  containerSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[],
  index: WorkspaceEntityIndex
): SystemSchema {
  if (containerSchema.level !== 'container') return containerSchema;

  const pairs = listCrossContainerComponentDependencies(loadedSystems);
  if (pairs.length === 0) return containerSchema;

  const existing = new Set(containerSchema.dependencies.map(d => `${d.from}\0${d.to}`));
  const byKey = new Map<string, { dep: SystemDependency; labels: string[] }>();

  for (const pair of pairs) {
    const rolled: SystemDependency = {
      from: pair.fromContainer,
      to: pair.toContainer,
      type: 'inter-container',
    };
    if (!edgeTouchesContainerDiagram(rolled, containerSchema)) continue;

    const key = `${rolled.from}\0${rolled.to}`;
    const label = `${displayNameForRef(pair.fromComponent, index)} → ${displayNameForRef(pair.toComponent, index)}`;
    const entry = byKey.get(key);
    if (entry) {
      entry.labels.push(label);
    } else {
      byKey.set(key, { dep: rolled, labels: [label] });
    }
  }

  const additions: SystemDependency[] = [];
  for (const { dep, labels } of byKey.values()) {
    const key = `${dep.from}\0${dep.to}`;
    if (existing.has(key)) continue;
    const description =
      labels.length === 1 ? labels[0]! : `${labels[0]} (+${labels.length - 1} more)`;
    additions.push({ ...dep, description });
  }

  const describe = (key: string): string | undefined => {
    const entry = byKey.get(key);
    if (!entry) return undefined;
    const { labels } = entry;
    return labels.length === 1 ? labels[0]! : `${labels[0]} (+${labels.length - 1} more)`;
  };

  let depsChanged = additions.length > 0;
  const mergedDeps =
    additions.length === 0
      ? containerSchema.dependencies.map(dep => {
          if (dep.description) return dep;
          const description = describe(`${dep.from}\0${dep.to}`);
          if (!description) return dep;
          depsChanged = true;
          return { ...dep, description };
        })
      : [
          ...containerSchema.dependencies.map(dep => {
            if (dep.description) return dep;
            const description = describe(`${dep.from}\0${dep.to}`);
            return description ? { ...dep, description } : dep;
          }),
          ...additions,
        ];

  let next: SystemSchema = depsChanged
    ? { ...containerSchema, dependencies: mergedDeps }
    : containerSchema;

  const endpointRefs = new Set<EntityRef>();
  for (const dep of next.dependencies) {
    if (dep.type !== 'inter-container') continue;
    endpointRefs.add(dep.from);
    endpointRefs.add(dep.to);
  }

  const missingEntities: WorkspaceEntity[] = [];
  for (const ref of endpointRefs) {
    if (isOnActiveDiagram(ref, next)) continue;
    const entity = resolveContainerEntity(ref, index, loadedSystems);
    if (entity) missingEntities.push(entity);
  }

  if (missingEntities.length === 0) return next;

  const positions = computeExternalNodePositions(
    missingEntities.length,
    next.nodes.map(n => ({ x: n.x ?? 0, y: n.y ?? 0 }))
  );
  return {
    ...next,
    nodes: [...next.nodes, ...materializeExternalNodes(missingEntities, positions)],
  };
}

function resolveContainerEntity(
  ref: EntityRef,
  index: WorkspaceEntityIndex,
  loadedSystems: LoadedSystemInput[]
): WorkspaceEntity | undefined {
  const direct = index.byRef.get(ref);
  if (direct) return direct;

  for (const system of loadedSystems) {
    if (system.schema.level !== 'container') continue;
    const node = system.schema.nodes.find(n => n.entityRef === ref);
    if (node) {
      return {
        entityRef: ref,
        name: node.name,
        type: node.type,
        sourceSchemaLevel: 'container',
        sourcePath: system.path,
        properties: node.properties,
      };
    }
  }

  // Synthesize from a known child component under this container.
  for (const entity of index.byRef.values()) {
    if (EntityRefUtil.getParent(entity.entityRef) !== ref) continue;
    const leaf = EntityRefUtil.leaf(ref);
    const titled = leaf.charAt(0).toUpperCase() + leaf.slice(1);
    return {
      entityRef: ref,
      name: `${titled} Service`,
      type: 'container',
      sourceSchemaLevel: 'container',
      sourcePath: entity.sourcePath,
    };
  }

  return undefined;
}

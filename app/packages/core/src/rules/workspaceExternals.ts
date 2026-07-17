import type { C4Level, EntityRef, NodeType, SystemNode, SystemSchema } from '../models/schema';
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
 */
export function enrichWorkspaceWithExternals(
  loadedSystems: LoadedSystemInput[],
  options: EnrichExternalsOptions = {}
): LoadedSystemInput[] {
  const index = buildWorkspaceEntityIndex(loadedSystems);
  return loadedSystems.map(system => ({
    ...system,
    schema: enrichSchemaWithExternals(system.schema, loadedSystems, index, options),
  }));
}

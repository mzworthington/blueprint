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

  const parentSystem = loadedSystems.find(s => s.schema.level === 'container');
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

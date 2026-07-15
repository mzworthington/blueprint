import Dexie, { type Table } from 'dexie';
import type { SystemSchema } from '@blueprint/core';

export interface DbNode {
  entityRef: string;
  id: string;
  systemId: string;
  containerId?: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
  external?: boolean;
  isTest?: boolean;
  filePath: string;
}

export interface DbDependency {
  id: string;
  fromRef: string;
  toRef: string;
  type: string;
  description?: string;
  filePath: string;
}

export interface SchemaDiff {
  nodes: {
    added: DbNode[];
    modified: { original: DbNode; current: DbNode }[];
    deleted: DbNode[];
  };
  dependencies: {
    added: DbDependency[];
    deleted: DbDependency[];
  };
}

class BlueprintDatabase extends Dexie {
  originalNodes!: Table<DbNode, string>;
  workingNodes!: Table<DbNode, string>;
  originalDependencies!: Table<DbDependency, string>;
  workingDependencies!: Table<DbDependency, string>;

  constructor() {
    super('BlueprintDatabase');
    this.version(1).stores({
      originalNodes: 'entityRef, filePath, systemId, type, name',
      workingNodes: 'entityRef, filePath, systemId, type, name',
      originalDependencies: 'id, filePath, fromRef, toRef',
      workingDependencies: 'id, filePath, fromRef, toRef',
    });
  }
}

export const db = new BlueprintDatabase();

/**
 * Saves a parsed baseline schema to the original tables.
 */
export async function saveBaselineSchema(
  filePath: string,
  schema: SystemSchema,
  systemId: string,
  nodeRefMap: Record<string, string>
) {
  await db.transaction('rw', [db.originalNodes, db.originalDependencies], async () => {
    await db.originalNodes.where('filePath').equals(filePath).delete();
    await db.originalDependencies.where('filePath').equals(filePath).delete();

    const dbNodes: DbNode[] = schema.nodes.map(node => {
      const key = node.entityRef || '';
      const entityRef =
        node.entityRef && node.entityRef.includes('/')
          ? node.entityRef
          : nodeRefMap[key] || `${systemId}/${key}`;
      const refParts = entityRef.split('/');
      const containerId = refParts.length > 2 ? refParts[1] : undefined;
      const localId = refParts[refParts.length - 1];

      return {
        entityRef,
        id: localId,
        systemId,
        containerId,
        type: node.type,
        name: node.name,
        properties: node.properties || {},
        x: node.x,
        y: node.y,
        external: node.external,
        isTest: node.isTest,
        filePath,
      };
    });

    if (dbNodes.length > 0) {
      await db.originalNodes.bulkPut(dbNodes);
    }

    const dbDeps: DbDependency[] = (schema.dependencies || []).map(dep => {
      const fromRef =
        nodeRefMap[dep.from] || (dep.from.includes('/') ? dep.from : `${systemId}/${dep.from}`);
      const toRef = nodeRefMap[dep.to] || (dep.to.includes('/') ? dep.to : `${systemId}/${dep.to}`);
      return {
        id: `${fromRef}->${toRef}`,
        fromRef,
        toRef,
        type: dep.type,
        description: dep.description,
        filePath,
      };
    });

    if (dbDeps.length > 0) {
      await db.originalDependencies.bulkPut(dbDeps);
    }
  });
}

/**
 * Saves the active working state schema to the working tables.
 */
export async function saveWorkingSchema(
  filePath: string,
  schema: SystemSchema,
  systemId: string,
  nodeRefMap: Record<string, string>
) {
  await db.transaction('rw', [db.workingNodes, db.workingDependencies], async () => {
    await db.workingNodes.where('filePath').equals(filePath).delete();
    await db.workingDependencies.where('filePath').equals(filePath).delete();

    const dbNodes: DbNode[] = schema.nodes.map(node => {
      const key = node.entityRef || '';
      const entityRef =
        node.entityRef && node.entityRef.includes('/')
          ? node.entityRef
          : nodeRefMap[key] || `${systemId}/${key}`;
      const refParts = entityRef.split('/');
      const containerId = refParts.length > 2 ? refParts[1] : undefined;
      const localId = refParts[refParts.length - 1];

      return {
        entityRef,
        id: localId,
        systemId,
        containerId,
        type: node.type,
        name: node.name,
        properties: node.properties || {},
        x: node.x,
        y: node.y,
        external: node.external,
        isTest: node.isTest,
        filePath,
      };
    });

    if (dbNodes.length > 0) {
      await db.workingNodes.bulkPut(dbNodes);
    }

    const dbDeps: DbDependency[] = (schema.dependencies || []).map(dep => {
      const fromRef =
        nodeRefMap[dep.from] || (dep.from.includes('/') ? dep.from : `${systemId}/${dep.from}`);
      const toRef = nodeRefMap[dep.to] || (dep.to.includes('/') ? dep.to : `${systemId}/${dep.to}`);
      return {
        id: `${fromRef}->${toRef}`,
        fromRef,
        toRef,
        type: dep.type,
        description: dep.description,
        filePath,
      };
    });

    if (dbDeps.length > 0) {
      await db.workingDependencies.bulkPut(dbDeps);
    }
  });
}

/**
 * Compares original and working states for a file, returning structural changes.
 */
export async function computeSchemaDiff(filePath: string): Promise<SchemaDiff> {
  const originalNodes = await db.originalNodes.where('filePath').equals(filePath).toArray();
  const workingNodes = await db.workingNodes.where('filePath').equals(filePath).toArray();
  const originalDeps = await db.originalDependencies.where('filePath').equals(filePath).toArray();
  const workingDeps = await db.workingDependencies.where('filePath').equals(filePath).toArray();

  const originalNodeMap = new Map(originalNodes.map(n => [n.entityRef, n]));
  const workingNodeMap = new Map(workingNodes.map(n => [n.entityRef, n]));
  const originalDepMap = new Map(originalDeps.map(d => [d.id, d]));
  const workingDepMap = new Map(workingDeps.map(d => [d.id, d]));

  const diff: SchemaDiff = {
    nodes: { added: [], modified: [], deleted: [] },
    dependencies: { added: [], deleted: [] },
  };

  for (const [entityRef, current] of workingNodeMap.entries()) {
    const original = originalNodeMap.get(entityRef);
    if (!original) {
      diff.nodes.added.push(current);
    } else {
      const nameChanged = current.name !== original.name;
      const typeChanged = current.type !== original.type;
      const propertiesChanged =
        JSON.stringify(current.properties) !== JSON.stringify(original.properties);
      const positionChanged = current.x !== original.x || current.y !== original.y;

      if (nameChanged || typeChanged || propertiesChanged || positionChanged) {
        diff.nodes.modified.push({ original, current });
      }
    }
  }

  for (const [entityRef, original] of originalNodeMap.entries()) {
    if (!workingNodeMap.has(entityRef)) {
      diff.nodes.deleted.push(original);
    }
  }

  for (const [depId, current] of workingDepMap.entries()) {
    if (!originalDepMap.has(depId)) {
      diff.dependencies.added.push(current);
    }
  }

  for (const [depId, original] of originalDepMap.entries()) {
    if (!workingDepMap.has(depId)) {
      diff.dependencies.deleted.push(original);
    }
  }

  return diff;
}

/**
 * Reverts draft changes in working tables back to baseline (original) records.
 * Returns the baseline SystemSchema.
 */
export async function revertWorkingSchema(
  filePath: string,
  systemName?: string,
  systemVersion?: string,
  systemLevel?: string,
  systemEntityRef?: string
): Promise<SystemSchema> {
  const originalNodes = await db.originalNodes.where('filePath').equals(filePath).toArray();
  const originalDeps = await db.originalDependencies.where('filePath').equals(filePath).toArray();

  const originalSchema: SystemSchema = {
    name: systemName || 'Restored Schema',
    version: systemVersion || '1.0.0',
    level: (systemLevel as any) || 'container',
    entityRef: systemEntityRef,
    nodes: originalNodes.map(n => ({
      entityRef: n.entityRef,
      type: n.type as any,
      name: n.name,
      properties: n.properties,
      x: n.x,
      y: n.y,
      external: n.external,
      isTest: n.isTest,
    })),
    dependencies: originalDeps.map(d => ({
      from: d.fromRef,
      to: d.toRef,
      type: d.type as any,
      description: d.description,
    })),
  };

  await db.transaction('rw', [db.workingNodes, db.workingDependencies], async () => {
    await db.workingNodes.where('filePath').equals(filePath).delete();
    await db.workingDependencies.where('filePath').equals(filePath).delete();
    if (originalNodes.length > 0) {
      await db.workingNodes.bulkPut(originalNodes);
    }
    if (originalDeps.length > 0) {
      await db.workingDependencies.bulkPut(originalDeps);
    }
  });

  return originalSchema;
}

/**
 * Loads the active working schema from working tables if it exists.
 * Returns the SystemSchema or null if not found.
 */
export async function loadWorkingSchema(
  filePath: string,
  systemName?: string,
  systemVersion?: string,
  systemLevel?: string,
  systemEntityRef?: string
): Promise<SystemSchema | null> {
  const workingNodes = await db.workingNodes.where('filePath').equals(filePath).toArray();
  if (workingNodes.length === 0) {
    return null;
  }
  const workingDeps = await db.workingDependencies.where('filePath').equals(filePath).toArray();

  return {
    name: systemName || 'Working Schema',
    version: systemVersion || '1.0.0',
    level: (systemLevel as any) || 'container',
    entityRef: systemEntityRef,
    nodes: workingNodes.map(n => ({
      entityRef: n.entityRef,
      type: n.type as any,
      name: n.name,
      properties: n.properties,
      x: n.x,
      y: n.y,
      external: n.external,
      isTest: n.isTest,
    })),
    dependencies: workingDeps.map(d => ({
      from: d.fromRef,
      to: d.toRef,
      type: d.type as any,
      description: d.description,
    })),
  };
}

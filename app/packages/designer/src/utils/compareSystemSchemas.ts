import type { SystemDependency, SystemNode, SystemSchema } from '@blueprint/core';
import type { SchemaDiff, WorkingCopyDependency, WorkingCopyNode } from '../core';

function depId(dep: SystemDependency): string {
  return `${dep.from}::${dep.to}::${dep.type}`;
}

function nodeToWorkingCopy(node: SystemNode, filePath: string): WorkingCopyNode {
  const entityRef = node.entityRef;
  const refParts = entityRef.split('/');
  const localId = refParts[refParts.length - 1] || entityRef;
  const systemId = refParts[0] || filePath;

  return {
    entityRef,
    id: localId,
    systemId,
    containerId: refParts.length > 2 ? refParts[1] : undefined,
    name: node.name,
    type: node.type,
    properties: node.properties ?? {},
    x: node.x,
    y: node.y,
    external: node.external,
    isTest: node.isTest,
    filePath,
  };
}

function depToWorkingCopy(dep: SystemDependency, filePath: string): WorkingCopyDependency {
  const fromRef = dep.from;
  const toRef = dep.to;
  return {
    id: `${fromRef}->${toRef}`,
    fromRef,
    toRef,
    type: dep.type,
    description: dep.description,
    filePath,
  };
}

/**
 * Structural diff of two in-memory schemas (right relative to left baseline).
 * Reuses the same shape as IndexedDB draft diffs for UI reuse.
 */
export function compareSystemSchemas(
  baseline: SystemSchema,
  current: SystemSchema,
  baselinePath = 'baseline',
  currentPath = 'current'
): SchemaDiff {
  const baselineNodeMap = new Map(
    baseline.nodes.map(n => [n.entityRef, nodeToWorkingCopy(n, baselinePath)])
  );
  const currentNodeMap = new Map(
    current.nodes.map(n => [n.entityRef, nodeToWorkingCopy(n, currentPath)])
  );
  const baselineDepMap = new Map(
    baseline.dependencies.map(d => [depId(d), depToWorkingCopy(d, baselinePath)])
  );
  const currentDepMap = new Map(
    current.dependencies.map(d => [depId(d), depToWorkingCopy(d, currentPath)])
  );

  const diff: SchemaDiff = {
    nodes: { added: [], modified: [], deleted: [] },
    dependencies: { added: [], deleted: [] },
  };

  for (const [entityRef, node] of currentNodeMap.entries()) {
    const original = baselineNodeMap.get(entityRef);
    if (!original) {
      diff.nodes.added.push(node);
    } else {
      const nameChanged = node.name !== original.name;
      const typeChanged = node.type !== original.type;
      const propertiesChanged =
        JSON.stringify(node.properties) !== JSON.stringify(original.properties);
      const positionChanged = node.x !== original.x || node.y !== original.y;

      if (nameChanged || typeChanged || propertiesChanged || positionChanged) {
        diff.nodes.modified.push({ original, current: node });
      }
    }
  }

  for (const [entityRef, original] of baselineNodeMap.entries()) {
    if (!currentNodeMap.has(entityRef)) {
      diff.nodes.deleted.push(original);
    }
  }

  for (const [id, dep] of currentDepMap.entries()) {
    if (!baselineDepMap.has(id)) {
      diff.dependencies.added.push(dep);
    }
  }

  for (const [id, dep] of baselineDepMap.entries()) {
    if (!currentDepMap.has(id)) {
      diff.dependencies.deleted.push(dep);
    }
  }

  return diff;
}

export function schemaDiffHasChanges(diff: SchemaDiff): boolean {
  return (
    diff.nodes.added.length > 0 ||
    diff.nodes.modified.length > 0 ||
    diff.nodes.deleted.length > 0 ||
    diff.dependencies.added.length > 0 ||
    diff.dependencies.deleted.length > 0
  );
}

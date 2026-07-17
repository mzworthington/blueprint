import type { SystemNode, SystemDependency, SystemSchema } from '../models/schema';

export type ConflictResolution = 'skip' | 'rename' | 'overwrite';

export type ConflictResolutions = Record<string, ConflictResolution>;

export interface ImportMergePlan {
  additions: { nodes: SystemNode[]; dependencies: SystemDependency[] };
  conflicts: Array<{
    entityRef: string;
    existing: SystemNode;
    imported: SystemNode;
  }>;
  unchanged: { nodes: SystemNode[]; dependencies: SystemDependency[] };
  skippedEdges: SystemDependency[];
}

function nodeTopologyKey(node: SystemNode): string {
  return JSON.stringify({
    entityRef: node.entityRef,
    type: node.type,
    name: node.name,
    external: !!node.external,
    isTest: !!node.isTest,
  });
}

function nodesTopologicallyEqual(a: SystemNode, b: SystemNode): boolean {
  return nodeTopologyKey(a) === nodeTopologyKey(b);
}

function edgeKey(dep: SystemDependency): string {
  return `${dep.from}|${dep.to}|${dep.type}|${dep.description || ''}`;
}

function edgesEqual(a: SystemDependency, b: SystemDependency): boolean {
  return edgeKey(a) === edgeKey(b);
}

/**
 * Computes a merge plan between an existing schema and an imported schema.
 */
export function computeImportMergePlan(
  base: SystemSchema,
  imported: SystemSchema
): ImportMergePlan {
  const baseNodeMap = new Map(base.nodes.map(n => [n.entityRef, n]));
  const baseEdgeSet = new Set(base.dependencies.map(edgeKey));

  const additions: SystemNode[] = [];
  const conflicts: ImportMergePlan['conflicts'] = [];
  const unchangedNodes: SystemNode[] = [];

  const importedRefs = new Set(imported.nodes.map(n => n.entityRef));

  for (const node of imported.nodes) {
    const existing = baseNodeMap.get(node.entityRef);
    if (!existing) {
      additions.push(node);
    } else if (nodesTopologicallyEqual(existing, node)) {
      unchangedNodes.push(existing);
    } else {
      conflicts.push({ entityRef: node.entityRef, existing, imported: node });
    }
  }

  for (const baseNode of base.nodes) {
    if (!importedRefs.has(baseNode.entityRef)) {
      unchangedNodes.push(baseNode);
    }
  }

  const unchangedNodeRefs = new Set([
    ...unchangedNodes.map(n => n.entityRef),
    ...base.nodes
      .filter(n => !imported.nodes.some(i => i.entityRef === n.entityRef))
      .map(n => n.entityRef),
    ...additions.map(n => n.entityRef),
  ]);

  const additionDeps: SystemDependency[] = [];
  const unchangedDeps: SystemDependency[] = [];
  const skippedEdges: SystemDependency[] = [];

  for (const dep of imported.dependencies) {
    if (baseEdgeSet.has(edgeKey(dep))) {
      const existing = base.dependencies.find(d => edgesEqual(d, dep));
      if (existing) unchangedDeps.push(existing);
      continue;
    }
    if (!unchangedNodeRefs.has(dep.from) && !additions.some(n => n.entityRef === dep.from)) {
      skippedEdges.push(dep);
      continue;
    }
    if (!unchangedNodeRefs.has(dep.to) && !additions.some(n => n.entityRef === dep.to)) {
      skippedEdges.push(dep);
      continue;
    }
    const conflictFrom = conflicts.some(c => c.entityRef === dep.from);
    const conflictTo = conflicts.some(c => c.entityRef === dep.to);
    if (conflictFrom || conflictTo) {
      skippedEdges.push(dep);
      continue;
    }
    additionDeps.push(dep);
  }

  return {
    additions: { nodes: additions, dependencies: additionDeps },
    conflicts,
    unchanged: { nodes: unchangedNodes, dependencies: unchangedDeps },
    skippedEdges,
  };
}

function findRenameRef(base: SystemSchema, originalRef: string): string {
  const leaf = originalRef.split('/').pop() || originalRef;
  const parent = originalRef.includes('/')
    ? originalRef.slice(0, originalRef.lastIndexOf('/'))
    : '';
  const candidates = [`${originalRef}-imported`, `${originalRef}-2`];
  if (parent) {
    candidates.unshift(`${parent}/${leaf}-imported`);
  }
  for (const candidate of candidates) {
    if (!base.nodes.some(n => n.entityRef === candidate)) {
      return candidate;
    }
  }
  return `${originalRef}-imported-${Date.now().toString(36)}`;
}

function remapDependencyRefs(dep: SystemDependency, refMap: Map<string, string>): SystemDependency {
  return {
    ...dep,
    from: refMap.get(dep.from) ?? dep.from,
    to: refMap.get(dep.to) ?? dep.to,
  };
}

/**
 * Applies an import merge plan with per-conflict resolutions (default: skip).
 */
export function applyImportMergePlan(
  base: SystemSchema,
  imported: SystemSchema,
  resolutions: ConflictResolutions
): SystemSchema {
  const plan = computeImportMergePlan(base, imported);
  const refMap = new Map<string, string>();
  const resultNodes: SystemNode[] = base.nodes.map(n => ({ ...n }));

  for (const conflict of plan.conflicts) {
    const resolution = resolutions[conflict.entityRef] ?? 'skip';
    if (resolution === 'overwrite') {
      const idx = resultNodes.findIndex(n => n.entityRef === conflict.entityRef);
      if (idx >= 0) {
        const preserved = { x: resultNodes[idx].x, y: resultNodes[idx].y };
        resultNodes[idx] = { ...conflict.imported, ...preserved };
      }
    } else if (resolution === 'rename') {
      const newRef = findRenameRef({ ...base, nodes: resultNodes }, conflict.entityRef);
      refMap.set(conflict.entityRef, newRef);
      resultNodes.push({ ...conflict.imported, entityRef: newRef });
    }
  }

  for (const node of plan.additions.nodes) {
    resultNodes.push({ ...node });
  }

  const existingEdgeKeys = new Set(base.dependencies.map(edgeKey));
  const resultDeps: SystemDependency[] = [...base.dependencies];

  for (const dep of plan.additions.dependencies) {
    const remapped = remapDependencyRefs(dep, refMap);
    if (!existingEdgeKeys.has(edgeKey(remapped))) {
      resultDeps.push(remapped);
      existingEdgeKeys.add(edgeKey(remapped));
    }
  }

  return {
    ...base,
    nodes: resultNodes,
    dependencies: resultDeps,
  };
}

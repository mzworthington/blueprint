import type { C4Level, SystemNode } from '../models/schema';

/** Child entry nested under a group node in context YAML wire format. */
export type WireChildNode = SystemNode & { parentEntityRef?: never; children?: never };

/** Top-level wire node; group nodes may nest children instead of using parentEntityRef. */
export type WireSystemNode = SystemNode & {
  children?: WireChildNode[];
};

export function shouldNestContextNodes(level: C4Level): boolean {
  return level === 'context';
}

/**
 * Expand nested `children` on group nodes into a flat list with `parentEntityRef`.
 * Flat `parentEntityRef` entries (legacy wire format) pass through unchanged.
 */
export function flattenWireNodes(wireNodes: WireSystemNode[]): SystemNode[] {
  const flat: SystemNode[] = [];
  const seen = new Set<string>();

  const pushNode = (node: SystemNode) => {
    if (seen.has(node.entityRef)) {
      throw new Error(`Duplicate node entityRef "${node.entityRef}" in wire nodes`);
    }
    seen.add(node.entityRef);
    flat.push(node);
  };

  for (const wire of wireNodes) {
    const { children, ...rest } = wire;
    const parent = { ...rest } as SystemNode;

    if (parent.parentEntityRef && children?.length) {
      throw new Error(`Node "${parent.entityRef}" cannot set both parentEntityRef and children`);
    }

    pushNode(parent);

    if (!children?.length) continue;

    if (parent.type !== 'group') {
      throw new Error(`children is only allowed on group nodes (got "${parent.entityRef}")`);
    }

    for (const child of children) {
      if (child.type === 'group') {
        throw new Error(`Nested group nodes are not supported ("${child.entityRef}")`);
      }
      if (child.parentEntityRef) {
        throw new Error(
          `Child "${child.entityRef}" must not set parentEntityRef when listed under children`
        );
      }
      const wireChild = child as WireSystemNode;
      if (wireChild.children?.length) {
        throw new Error(`Nested children are not supported ("${child.entityRef}")`);
      }
      pushNode({ ...child, parentEntityRef: parent.entityRef });
    }
  }

  return flat;
}

export function toWireNodeRecord(
  node: SystemNode,
  options: { includeParentRef: boolean },
  cleanForensics: (f: NonNullable<SystemNode['forensics']>) => Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {
    entityRef: node.entityRef,
    type: node.type,
    name: node.name,
  };
  if (node.external !== undefined) cleaned.external = node.external;
  if (node.isTest !== undefined) cleaned.isTest = node.isTest;
  if (options.includeParentRef && node.parentEntityRef) {
    cleaned.parentEntityRef = node.parentEntityRef;
  }
  if (node.properties && Object.keys(node.properties).length > 0) {
    cleaned.properties = node.properties;
  }
  if (typeof node.x === 'number') cleaned.x = Math.round(node.x);
  if (typeof node.y === 'number') cleaned.y = Math.round(node.y);
  if (node.forensics) cleaned.forensics = cleanForensics(node.forensics);
  return cleaned;
}

/** Nest group children under `children` for context-level YAML (omits parentEntityRef on children). */
export function nestContextWireNodes(
  nodes: SystemNode[],
  cleanForensics: (f: NonNullable<SystemNode['forensics']>) => Record<string, unknown>
): Record<string, unknown>[] {
  const childrenByParent = new Map<string, SystemNode[]>();
  for (const node of nodes) {
    if (!node.parentEntityRef) continue;
    const list = childrenByParent.get(node.parentEntityRef) ?? [];
    list.push(node);
    childrenByParent.set(node.parentEntityRef, list);
  }

  const sortByRef = (a: SystemNode, b: SystemNode) => a.entityRef.localeCompare(b.entityRef);
  const wire: Record<string, unknown>[] = [];

  for (const node of nodes) {
    if (node.parentEntityRef) continue;

    const cleaned = toWireNodeRecord(node, { includeParentRef: false }, cleanForensics);
    if (node.type === 'group') {
      const children = (childrenByParent.get(node.entityRef) ?? []).sort(sortByRef);
      if (children.length > 0) {
        cleaned.children = children.map(child =>
          toWireNodeRecord(child, { includeParentRef: false }, cleanForensics)
        );
      }
    }
    wire.push(cleaned);
  }

  return wire;
}

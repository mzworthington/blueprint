import type { C4Level, NodeType, SystemSchema } from '../models/schema';
import { getSchemaEntityRef } from './entityRef';

export type LoadedSystemSchemaRef = { path: string; schema: SystemSchema };

/** External proxy node materialized on a child diagram one level below a parent node. */
export type ChildDiagramExternal = {
  entityRef: string;
  name: string;
  type: NodeType;
};

/** Lightweight navigation metadata for a workspace diagram file. */
export type WorkspaceCatalogEntry = {
  path: string;
  name: string;
  level: C4Level;
  entityRef: string;
  /** Resolved node entityRefs on this diagram (used for parent/child discovery). */
  nodeEntityRefs: string[];
  /** entityRef of the parent diagram, if another catalog entry owns this schema's entityRef as a node. */
  parentEntityRef?: string;
};

/**
 * Build a navigation catalog from resolved workspace schemas.
 * Does not retain full schema bodies — only identity and hierarchy hints.
 */
export function buildWorkspaceCatalog(
  files: Array<{ path: string; schema: SystemSchema }>,
  workspaceName?: string | null
): WorkspaceCatalogEntry[] {
  const entries: WorkspaceCatalogEntry[] = files.map(({ path, schema }) => {
    const entityRef = getSchemaEntityRef(schema, workspaceName);
    const nodeEntityRefs = schema.nodes
      .filter(n => !n.external)
      .map(n => n.entityRef)
      .filter((ref): ref is string => typeof ref === 'string' && ref.length > 0);
    return {
      path,
      name: schema.name,
      level: schema.level,
      entityRef,
      nodeEntityRefs,
    };
  });

  const ownerByNodeRef = new Map<string, string>();
  for (const entry of entries) {
    for (const nodeRef of entry.nodeEntityRefs) {
      if (!ownerByNodeRef.has(nodeRef)) {
        ownerByNodeRef.set(nodeRef, entry.entityRef);
      }
    }
  }

  return entries.map(entry => {
    const parentEntityRef = ownerByNodeRef.get(entry.entityRef);
    if (parentEntityRef && parentEntityRef !== entry.entityRef) {
      return { ...entry, parentEntityRef };
    }
    return entry;
  });
}

/**
 * Resolve the diagram that canonically owns an entity in the workspace stack.
 * Returns the diagram entry when `entityRef` is the diagram identity, or the
 * first diagram that lists the ref as a native node.
 */
export function resolveEntityHome(
  catalog: WorkspaceCatalogEntry[],
  entityRef: string
): WorkspaceCatalogEntry | undefined {
  if (!entityRef) return undefined;

  const ownDiagram = catalog.find(entry => entry.entityRef === entityRef);
  if (ownDiagram) return ownDiagram;

  return catalog.find(entry => entry.nodeEntityRefs.includes(entityRef));
}

/**
 * Resolve the diagram one level below `parentEntityRef`.
 * Child diagrams use `schema.entityRef === parentNode.entityRef`.
 */
export function resolveChildDiagramEntry(
  catalog: WorkspaceCatalogEntry[],
  parentEntityRef: string
): WorkspaceCatalogEntry | undefined {
  if (!parentEntityRef) return undefined;
  return catalog.find(entry => entry.entityRef === parentEntityRef);
}

/** External nodes on the child diagram for a parent canvas node, when that child exists. */
export function listChildDiagramExternals(
  catalog: WorkspaceCatalogEntry[],
  loadedSystems: LoadedSystemSchemaRef[],
  parentEntityRef: string
): ChildDiagramExternal[] {
  const child = resolveChildDiagramEntry(catalog, parentEntityRef);
  if (!child) return [];

  const system = loadedSystems.find(s => s.path === child.path);
  if (!system) return [];

  return system.schema.nodes
    .filter(
      (node): node is typeof node & { entityRef: string } => !!node.external && !!node.entityRef
    )
    .map(node => ({
      entityRef: node.entityRef,
      name: node.name,
      type: node.type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

import type { C4Level, SystemSchema } from '../models/schema';
import { getSchemaEntityRef } from './entityRef';

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

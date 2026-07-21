import type { SystemSchema } from '@blueprint/core';

/**
 * Stable fingerprint of schema topology (nodes + deps), ignoring canvas
 * coordinates so layout-only draft tweaks don't force a reset.
 */
export function schemaTopologyKey(schema: SystemSchema): string {
  const nodes = [...(schema.nodes || [])]
    .map(n =>
      JSON.stringify({
        entityRef: n.entityRef,
        type: n.type,
        name: n.name,
        parentEntityRef: n.parentEntityRef,
        external: !!n.external,
        isTest: !!n.isTest,
        properties: n.properties || {},
      })
    )
    .sort();

  const dependencies = [...(schema.dependencies || [])]
    .map(d =>
      JSON.stringify({
        from: d.from,
        to: d.to,
        type: d.type,
        description: d.description || '',
      })
    )
    .sort();

  return JSON.stringify({
    entityRef: schema.entityRef || '',
    level: schema.level,
    name: schema.name,
    version: schema.version,
    nodes,
    dependencies,
  });
}

export function schemasTopologicallyEqual(a: SystemSchema, b: SystemSchema): boolean {
  return schemaTopologyKey(a) === schemaTopologyKey(b);
}

export type OpenSchemaResolution =
  | { schema: SystemSchema; discardedStaleDraft: false }
  | { schema: SystemSchema; discardedStaleDraft: true };

/**
 * Disk is source of truth on workspace open.
 * - No draft → use disk
 * - Draft matches topology → keep draft (preserves positions / in-session layout)
 * - Draft topology differs → discard draft, use disk (avoids stale CLI/regenerated edges)
 */
export function resolveSchemaOnWorkspaceOpen(
  diskSchema: SystemSchema,
  workingDraft: SystemSchema | null
): OpenSchemaResolution {
  if (!workingDraft) {
    return { schema: diskSchema, discardedStaleDraft: false };
  }

  if (schemasTopologicallyEqual(diskSchema, workingDraft)) {
    return { schema: workingDraft, discardedStaleDraft: false };
  }

  return { schema: diskSchema, discardedStaleDraft: true };
}

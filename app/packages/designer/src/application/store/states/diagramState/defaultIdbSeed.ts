/**
 * Startup seed of bundled blueprints into IndexedDB.
 * Must never overwrite real workspace drafts (path collisions after open).
 */

let cancelled = false;

export function cancelDefaultIdbSeed(): void {
  cancelled = true;
}

export function isDefaultIdbSeedCancelled(): boolean {
  return cancelled;
}

/** Test helper */
export function resetDefaultIdbSeedFlag(): void {
  cancelled = false;
}

export type DefaultSeedSystem = {
  path: string;
  schema: {
    entityRef?: string;
    name: string;
    version: string;
    level: string;
    nodes: unknown[];
    dependencies?: unknown[];
  };
};

/**
 * Seeds baseline + working copies only when the path has no existing IDB rows.
 * Skips entirely once a workspace has been opened (`cancelDefaultIdbSeed`).
 */
export async function seedDefaultSchemasSafely(
  systems: Array<{
    path: string;
    schema: import('@blueprint/core').SystemSchema;
  }>,
  resolved: {
    schemas: Record<string, import('@blueprint/core').SystemSchema>;
    nodeRefMap: Record<string, Record<string, string>>;
  },
  deps: {
    pathHasStoredData: (filePath: string) => Promise<boolean>;
    saveBaselineSchema: (
      filePath: string,
      schema: import('@blueprint/core').SystemSchema,
      systemId: string,
      nodeRefMap: Record<string, string>
    ) => Promise<void>;
    saveWorkingSchema: (
      filePath: string,
      schema: import('@blueprint/core').SystemSchema,
      systemId: string,
      nodeRefMap: Record<string, string>
    ) => Promise<void>;
  }
): Promise<void> {
  if (cancelled) return;

  for (const sys of systems) {
    if (cancelled) return;

    const alreadyStored = await deps.pathHasStoredData(sys.path);
    if (alreadyStored) continue;

    const resolvedSysSchema = resolved.schemas[sys.path] || sys.schema;
    const sysId = resolvedSysSchema.entityRef || 'default';
    const fileRefMap = resolved.nodeRefMap[sys.path] || {};

    await deps.saveBaselineSchema(sys.path, sys.schema, sysId, fileRefMap);
    if (cancelled) return;
    await deps.saveWorkingSchema(sys.path, sys.schema, sysId, fileRefMap);
  }
}

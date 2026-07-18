import type { SystemSchema } from '@blueprint/core';
import { schemasTopologicallyEqual } from '../../../../infrastructure/db/schemaCompare';
import type { WorkingCopyPort } from '../../../../core';

export type HydrateSystem = { path: string; name: string; schema: SystemSchema };

/**
 * Prefer IndexedDB working drafts over in-memory sandbox defaults when topology matches
 * (or when there is no disk baseline yet). Preserves uncommitted edits across refresh.
 */
export async function hydrateSandboxDrafts(
  systems: HydrateSystem[],
  workingCopy: WorkingCopyPort
): Promise<{ systems: HydrateSystem[]; restoredCount: number }> {
  let restoredCount = 0;
  const next: HydrateSystem[] = [];

  for (const sys of systems) {
    let draft: SystemSchema | null = null;
    try {
      draft = await workingCopy.loadWorkingSchema({
        filePath: sys.path,
        systemName: sys.schema.name,
        systemVersion: sys.schema.version,
        systemLevel: sys.schema.level,
        systemEntityRef: sys.schema.entityRef,
      });
    } catch {
      draft = null;
    }

    if (draft && schemasTopologicallyEqual(sys.schema, draft)) {
      next.push({ ...sys, schema: draft });
      restoredCount += 1;
    } else if (draft && (await workingCopy.pathHasStoredData(sys.path))) {
      // Same path with stored data but topology drifted — keep memory default
      // (workspace open path uses disk-first resolution instead).
      next.push(sys);
    } else {
      next.push(sys);
    }
  }

  return { systems: next, restoredCount };
}

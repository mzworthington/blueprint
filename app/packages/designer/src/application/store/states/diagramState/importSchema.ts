import type { SystemSchema } from '@blueprint/core';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

/**
 * Shared path for YAML/JSON import: register schema in loadedSystems and activate it.
 */
export function importSchemaContent(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    loadedSystems: LoadedSystem[];
    initSchema: (schema: SystemSchema) => void;
    logger: { error: (message: string, err: unknown) => void };
  },
  schema: SystemSchema,
  formatLabel: 'YAML' | 'JSON'
): boolean {
  try {
    set({ lastError: null });
    const name = schema.name || 'imported_schema';
    const path = `${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.yaml`;

    const existingIndex = get().loadedSystems.findIndex(s => s.path === path);
    const newLoadedSystems = [...get().loadedSystems];
    if (existingIndex >= 0) {
      newLoadedSystems[existingIndex] = { path, name, schema };
    } else {
      newLoadedSystems.push({ path, name, schema });
    }

    set({
      currentFilePath: path,
      loadedSystems: newLoadedSystems,
    });
    get().initSchema(schema);
    return true;
  } catch (e: unknown) {
    const errorMsg =
      (e instanceof Error ? e.message : undefined) ||
      `Failed to import ${formatLabel} schema configuration`;
    set({ lastError: errorMsg });
    get().logger.error(`Failed to import ${formatLabel} schema configuration`, e);
    return false;
  }
}

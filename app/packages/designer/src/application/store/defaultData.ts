import { type SystemSchema, parseSchemaFromYaml, getFileName } from '@blueprint/core';
import contextYaml from '../../../../../../blueprints/context.yaml?raw';

export const CONTEXT_BLUEPRINT_PATH = 'context.yaml';

const allBlueprintModuleLoaders = import.meta.glob<{ default: string }>(
  '../../../../../../blueprints/**/*.{yaml,yml}',
  {
    query: '?raw',
    eager: false,
  }
);

const blueprintModuleLoaders = Object.fromEntries(
  Object.entries(allBlueprintModuleLoaders).filter(
    ([filePath]) => globKeyToCleanPath(filePath) !== CONTEXT_BLUEPRINT_PATH
  )
);

function globKeyToCleanPath(filePath: string): string {
  const blueprintsMarker = 'blueprints/';
  const markerIdx = filePath.lastIndexOf(blueprintsMarker);
  return markerIdx >= 0
    ? filePath.slice(markerIdx + blueprintsMarker.length)
    : getFileName(filePath);
}

export const blueprintPaths = [
  CONTEXT_BLUEPRINT_PATH,
  ...Object.keys(blueprintModuleLoaders).map(globKeyToCleanPath),
].sort((a, b) => {
  const levelFromPath = (path: string) => {
    if (path === CONTEXT_BLUEPRINT_PATH) return 1;
    if (path.endsWith('containers.yaml')) return 2;
    if (path.includes('-components.yaml') || path.endsWith('components.yaml')) return 3;
    return 5;
  };
  const levelA = levelFromPath(a);
  const levelB = levelFromPath(b);
  if (levelA !== levelB) return levelA - levelB;
  return a.localeCompare(b);
});

function findGlobKey(cleanPath: string): string | undefined {
  return Object.keys(blueprintModuleLoaders).find(key => globKeyToCleanPath(key) === cleanPath);
}

let parsedContextSchema: SystemSchema | null = null;

function getContextSchema(): SystemSchema {
  if (!parsedContextSchema) {
    try {
      parsedContextSchema = parseSchemaFromYaml(contextYaml);
    } catch {
      parsedContextSchema = {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      };
    }
  }
  return parsedContextSchema;
}

/** Eagerly available context diagram — all other blueprints load lazily. */
export let defaultInitialSchema: SystemSchema = getContextSchema();

export const defaultLoadedSystems: Array<{ path: string; name: string; schema: SystemSchema }> = [
  {
    path: CONTEXT_BLUEPRINT_PATH,
    name: defaultInitialSchema.name || 'Blueprint Context',
    schema: defaultInitialSchema,
  },
];

/** @deprecated Use blueprintPaths — kept for callers that enumerate modules. */
export const defaultBlueprintModules = blueprintModuleLoaders;

export async function loadBlueprintSchema(cleanPath: string): Promise<SystemSchema | null> {
  if (cleanPath === CONTEXT_BLUEPRINT_PATH) {
    return getContextSchema();
  }

  const globKey = findGlobKey(cleanPath);
  if (!globKey) return null;

  const loader = blueprintModuleLoaders[globKey];
  if (!loader) return null;

  try {
    const module = await loader();
    return parseSchemaFromYaml(module.default);
  } catch {
    return null;
  }
}

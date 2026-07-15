import type { SystemSchema } from '@blueprint/core';
import { parseSchemaFromYaml, getFileName } from '../../core';

export const defaultBlueprintModules = import.meta.glob<{ default: string }>(
  '../../../../../../blueprints/**/*.{yaml,yml}',
  {
    query: '?raw',
    eager: true,
  }
);

export let defaultInitialSchema: SystemSchema = {
  name: 'Empty Workspace',
  version: '1.0.0',
  level: 'context',
  nodes: [],
  dependencies: [],
};

export const defaultLoadedSystems: Array<{ path: string; name: string; schema: SystemSchema }> = [];

Object.entries(defaultBlueprintModules).forEach(([filePath, module]) => {
  const fileName = getFileName(filePath);
  const cleanPath = filePath.replace('../../../../../blueprints/', '');

  if (fileName === 'workspace.yaml' || fileName.endsWith('-workspace.yaml')) {
    // Skip workspace manifest files
    return;
  }
  try {
    const yamlContent = module.default;
    const parsed = parseSchemaFromYaml(yamlContent);
    defaultLoadedSystems.push({
      path: cleanPath,
      name: parsed.name || fileName.replace(/\.ya?ml$/, ''),
      schema: parsed,
    });
  } catch {
    // Ignore non-schema files during eager build-time load
  }
});

defaultLoadedSystems.sort((a, b) => {
  const levels: Record<string, number> = { context: 1, container: 2, component: 3, code: 4 };
  const levelA = levels[a.schema.level] || 5;
  const levelB = levels[b.schema.level] || 5;
  if (levelA !== levelB) return levelA - levelB;
  return a.path.localeCompare(b.path);
});

if (defaultLoadedSystems.length > 0) {
  const rootSystem =
    defaultLoadedSystems.find(s => s.schema.level === 'context') ||
    defaultLoadedSystems.find(s => s.schema.level === 'container') ||
    defaultLoadedSystems[0];
  defaultInitialSchema = rootSystem.schema;
} else {
  defaultLoadedSystems.push({
    path: 'blueprint.yaml',
    name: defaultInitialSchema.name,
    schema: defaultInitialSchema,
  });
}

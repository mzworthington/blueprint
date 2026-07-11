import * as yaml from 'js-yaml';
import type { SystemSchema, WorkspaceManifest } from '@blueprint/core';
import { parseSchemaFromYaml } from '@blueprint/core';
import { getFileName, getClosestManifest } from '@blueprint/core';

export const defaultBlueprintModules = import.meta.glob<{ default: string }>(
  '../../../../../blueprints/**/*.{yaml,yml}',
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
export const defaultLoadedManifests: Array<{
  path: string;
  manifest: WorkspaceManifest;
  yaml: string;
}> = [];
export let defaultWorkspaceManifest: WorkspaceManifest | null = null;
export let defaultWorkspaceManifestYaml: string | null = null;

Object.entries(defaultBlueprintModules).forEach(([filePath, module]) => {
  const fileName = getFileName(filePath);
  const cleanPath = filePath.replace('../../../../../blueprints/', '');

  if (fileName === 'workspace.yaml' || fileName.endsWith('-workspace.yaml')) {
    try {
      const yamlContent = module.default;
      const parsed = yaml.load(yamlContent) as WorkspaceManifest;
      defaultLoadedManifests.push({
        path: cleanPath,
        manifest: parsed,
        yaml: yamlContent,
      });
    } catch (e) {
      console.error('Failed to parse default workspace manifest:', filePath, e);
    }
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
  let initialManifest = defaultLoadedManifests.find(
    m => m.path === 'blueprint/workspace.yaml' || m.path === 'blueprint\\workspace.yaml'
  );
  if (!initialManifest) {
    initialManifest =
      getClosestManifest(defaultLoadedSystems[0].path, defaultLoadedManifests) ?? undefined;
  }

  let resolvedRootSystem = defaultLoadedSystems[0];
  if (initialManifest) {
    defaultWorkspaceManifest = initialManifest.manifest;
    defaultWorkspaceManifestYaml = initialManifest.yaml;
    if (initialManifest.manifest.root) {
      const resolvedRootName = getFileName(initialManifest.manifest.root);
      const foundRoot = defaultLoadedSystems.find(
        s =>
          s.path === initialManifest.manifest.root ||
          s.path === resolvedRootName ||
          s.path.endsWith('/' + resolvedRootName)
      );
      if (foundRoot) {
        resolvedRootSystem = foundRoot;
      }
    }
  }
  defaultInitialSchema = resolvedRootSystem.schema;
} else {
  defaultLoadedSystems.push({
    path: 'blueprint.yaml',
    name: defaultInitialSchema.name,
    schema: defaultInitialSchema,
  });
}

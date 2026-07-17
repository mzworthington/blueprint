import {
  enrichWorkspaceWithExternals,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  type LoadedSystemInput,
  type SystemSchema,
} from '@blueprint/core';
import type { AnalysisFileSystemPort, LoggerPort } from '../analysis/domain/ports.ts';
import { resolveLocalSchemaUrl } from './baseWriter.ts';

export interface ExternalDependenciesPassResult {
  schemasScanned: number;
  schemasUpdated: number;
}

function isYamlFileName(name: string): boolean {
  return name.endsWith('.yaml') || name.endsWith('.yml');
}

/**
 * Recursively collect blueprint YAML paths under rootDir.
 * Directories are discovered when listDirectoryNames returns children.
 */
export function listBlueprintSchemaPaths(
  rootDir: string,
  fileSystem: AnalysisFileSystemPort
): string[] {
  const results: string[] = [];

  const walk = (dir: string) => {
    for (const name of fileSystem.listDirectoryNames(dir)) {
      const full = fileSystem.getAbsolutePath(dir, name);
      if (isYamlFileName(name)) {
        results.push(full);
        continue;
      }
      if (fileSystem.listDirectoryNames(full).length > 0) {
        walk(full);
      }
    }
  };

  walk(rootDir);
  return results.sort();
}

function schemasEqualForExternals(a: SystemSchema, b: SystemSchema): boolean {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.dependencies.length !== b.dependencies.length) return false;

  const aRefs = new Set(a.nodes.map(n => `${n.entityRef}:${!!n.external}`));
  const bRefs = new Set(b.nodes.map(n => `${n.entityRef}:${!!n.external}`));
  if (aRefs.size !== bRefs.size) return false;
  for (const ref of aRefs) {
    if (!bRefs.has(ref)) return false;
  }

  const aDeps = new Set(
    a.dependencies.map(d => `${d.from}\0${d.to}\0${d.type}\0${d.description ?? ''}`)
  );
  const bDeps = new Set(
    b.dependencies.map(d => `${d.from}\0${d.to}\0${d.type}\0${d.description ?? ''}`)
  );
  if (aDeps.size !== bDeps.size) return false;
  for (const dep of aDeps) {
    if (!bDeps.has(dep)) return false;
  }
  return true;
}

/**
 * Load all blueprint schemas under rootDir, materialize suggested externals
 * workspace-wide, and rewrite changed YAML files.
 */
export async function applyExternalDependenciesPass(
  rootDir: string,
  fileSystem: AnalysisFileSystemPort,
  logger: LoggerPort
): Promise<ExternalDependenciesPassResult> {
  const paths = listBlueprintSchemaPaths(rootDir, fileSystem);
  const loaded: LoadedSystemInput[] = [];

  for (const path of paths) {
    try {
      const yaml = await fileSystem.readSchema(path);
      const schema = parseSchemaFromYaml(yaml);
      if (!schema.level || !Array.isArray(schema.nodes)) continue;
      loaded.push({
        path,
        name: schema.name || path,
        schema,
      });
    } catch (err) {
      logger.warn(`Skipping non-schema YAML during externals pass: ${path}`, {
        error: String(err),
      });
    }
  }

  if (loaded.length === 0) {
    return { schemasScanned: 0, schemasUpdated: 0 };
  }

  const enriched = enrichWorkspaceWithExternals(loaded, {
    mode: 'unresolved',
    enrichLevels: ['component', 'container'],
  });
  let schemasUpdated = 0;

  for (let i = 0; i < loaded.length; i++) {
    const before = loaded[i]!;
    const after = enriched[i]!;
    if (schemasEqualForExternals(before.schema, after.schema)) continue;

    const schemaUrl = resolveLocalSchemaUrl(after.path);
    const yaml = serializeSchemaToYaml(after.schema, schemaUrl ? { schemaUrl } : undefined);
    await fileSystem.writeSchema(after.path, yaml);
    schemasUpdated++;
  }

  if (schemasUpdated > 0) {
    logger.info(
      `🔗 External dependencies: updated ${schemasUpdated} schema(s) (proxy nodes + container couplings).`
    );
  }

  return { schemasScanned: loaded.length, schemasUpdated };
}

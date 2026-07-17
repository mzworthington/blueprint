import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@blueprint/core';
import type { AnalysisFileSystemPort, LayoutPort, LoggerPort } from '../analysis/domain/ports.ts';
import { resolveLocalSchemaUrl } from './baseWriter.ts';
import { listBlueprintSchemaPaths } from './externalDependenciesPass.ts';

export interface LayoutPassResult {
  schemasScanned: number;
  schemasUpdated: number;
}

function positionsChanged(before: SystemSchema, after: SystemSchema): boolean {
  if (before.nodes.length !== after.nodes.length) return true;
  const afterByRef = new Map(after.nodes.map(n => [n.entityRef, n]));
  for (const node of before.nodes) {
    const next = afterByRef.get(node.entityRef);
    if (!next) return true;
    if (node.x !== next.x || node.y !== next.y) return true;
  }
  return false;
}

/**
 * Final pass: layout every blueprint schema after structure + externals are fixed.
 * Runs dagre (or grid fallback) on the full node/edge set including proxy externals.
 */
export async function applyLayoutPass(
  rootDir: string,
  layout: LayoutPort,
  fileSystem: AnalysisFileSystemPort,
  logger: LoggerPort
): Promise<LayoutPassResult> {
  const paths = listBlueprintSchemaPaths(rootDir, fileSystem);
  let schemasUpdated = 0;
  let schemasScanned = 0;

  for (const path of paths) {
    let schema: SystemSchema;
    try {
      const yaml = await fileSystem.readSchema(path);
      schema = parseSchemaFromYaml(yaml);
      if (!schema.level || !Array.isArray(schema.nodes)) continue;
    } catch (err) {
      logger.warn(`Skipping non-schema YAML during layout pass: ${path}`, {
        error: String(err),
      });
      continue;
    }

    schemasScanned++;
    const laidOut = await layout.computeLayout(schema.nodes, schema.dependencies);
    const next: SystemSchema = { ...schema, nodes: laidOut };
    if (!positionsChanged(schema, next)) continue;

    const schemaUrl = resolveLocalSchemaUrl(path);
    const yaml = serializeSchemaToYaml(next, schemaUrl ? { schemaUrl } : undefined);
    await fileSystem.writeSchema(path, yaml);
    schemasUpdated++;
  }

  if (schemasUpdated > 0) {
    logger.info(`📐 Layout: updated positions on ${schemasUpdated} schema(s).`);
  }

  return { schemasScanned, schemasUpdated };
}

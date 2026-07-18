import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@blueprint/core';
import type { AnalysisFileSystemPort, LayoutPort, LoggerPort } from '../analysis/domain/ports.ts';
import { listBlueprintSchemaPaths } from './externalDependenciesPass.ts';
import { layoutWithPreservation } from './layoutWithPreservation.ts';

export interface LayoutPassResult {
  schemasScanned: number;
  schemasUpdated: number;
}

export interface LayoutPassOptions {
  /**
   * When true (default), recompute all positions.
   * Pass `false` (CLI `--no-relayout`) to preserve existing finite x/y.
   */
  forceRelayout?: boolean;
  /**
   * Layout engine for `level: context` schemas (e.g. d3-hierarchy).
   * When omitted, `layout` is used for every level.
   */
  contextLayout?: LayoutPort;
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
 * By default recomputes all positions. Pass `forceRelayout: false` (CLI `--no-relayout`)
 * to preserve existing finite x/y and only lay out gap nodes.
 * Context schemas use `contextLayout` when provided (d3-hierarchy); other levels use dagre.
 */
export async function applyLayoutPass(
  rootDir: string,
  layout: LayoutPort,
  fileSystem: AnalysisFileSystemPort,
  logger: LoggerPort,
  options: LayoutPassOptions = {}
): Promise<LayoutPassResult> {
  const forceRelayout = options.forceRelayout !== false;
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
    const previous = schema.nodes;
    const engine =
      schema.level === 'context' && options.contextLayout ? options.contextLayout : layout;
    const laidOut = await layoutWithPreservation(
      engine,
      forceRelayout ? [] : previous,
      previous,
      schema.dependencies,
      { forceRelayout }
    );
    const next: SystemSchema = { ...schema, nodes: laidOut };
    if (!positionsChanged(schema, next)) continue;

    const yaml = serializeSchemaToYaml(next);
    await fileSystem.writeSchema(path, yaml);
    schemasUpdated++;
  }

  if (schemasUpdated > 0) {
    logger.info(
      forceRelayout
        ? `📐 Layout: updated positions on ${schemasUpdated} schema(s).`
        : `📐 Layout: preserved existing positions; updated ${schemasUpdated} schema(s).`
    );
  }

  return { schemasScanned, schemasUpdated };
}

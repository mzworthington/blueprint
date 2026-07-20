import type { C4Level, NodeForensics, SystemNode, SystemSchema } from '@blueprint/core';
import {
  EntityRef,
  FORENSICS_AUTHOR_BUCKET_LABELS,
  FORENSICS_COMPLEXITY_BUCKET_LABELS,
  bucketAuthorActivity,
  bucketComplexityCounts,
  rollupChurnByWeek,
} from '@blueprint/core';

export type LoadedSystemRef = {
  path: string;
  name: string;
  schema: SystemSchema;
};

function isComponentLevel(level: SystemSchema['level']): boolean {
  return level === 'component' || level === 'code';
}

function isRollupSchemaLevel(level: C4Level): boolean {
  return level === 'container' || level === 'context';
}

function nodeMatchesRollupTarget(
  node: SystemNode,
  entityRef: string,
  schemaLevel: C4Level
): boolean {
  if (node.entityRef === entityRef || node.entityRef.startsWith(`${entityRef}/`)) {
    return true;
  }
  if (schemaLevel === 'container') {
    const containerId = EntityRef.leaf(entityRef);
    return node.properties?.containerId === containerId;
  }
  return false;
}

/**
 * Collect component-level forensics under a container or context system node.
 */
export function collectDescendantForensics(
  systems: readonly LoadedSystemRef[],
  entityRef: string,
  schemaLevel: C4Level
): NodeForensics[] {
  const collected: NodeForensics[] = [];

  for (const system of systems) {
    if (!isComponentLevel(system.schema.level)) continue;
    for (const node of system.schema.nodes) {
      if (!node.forensics) continue;
      if (nodeMatchesRollupTarget(node, entityRef, schemaLevel)) {
        collected.push(node.forensics);
      }
    }
  }

  return collected;
}

export type ForensicsTrendDashboard = {
  scope: 'component' | 'rollup';
  churnByWeek?: number[];
  authorBuckets: number[];
  authorBucketLabels: readonly string[];
  complexityBuckets: number[];
  complexityBucketLabels: readonly string[];
  fileCount: number;
};

function hasTrendData(dashboard: ForensicsTrendDashboard): boolean {
  return (
    (dashboard.churnByWeek?.some(v => v > 0) ?? false) ||
    dashboard.authorBuckets.some(v => v > 0) ||
    dashboard.complexityBuckets.some(v => v > 0)
  );
}

/**
 * Build micro-chart series for churn, author activity, and complexity spread.
 */
export function buildForensicsTrendDashboard(
  forensics: NodeForensics,
  descendants: readonly NodeForensics[],
  schemaLevel: C4Level
): ForensicsTrendDashboard | undefined {
  const isRollup = isRollupSchemaLevel(schemaLevel);
  const source = descendants.length > 0 ? descendants : [forensics];

  const churnByWeek =
    forensics.churnByWeek ??
    (descendants.length > 0 ? rollupChurnByWeek(descendants.map(d => d.churnByWeek)) : undefined);

  const complexities = source
    .map(d => d.complexity)
    .filter((value): value is number => value != null && value > 0);
  const authorCounts = source
    .map(d => d.authorCount)
    .filter((value): value is number => value != null && value > 0);

  const dashboard: ForensicsTrendDashboard = {
    scope: isRollup && descendants.length > 0 ? 'rollup' : 'component',
    churnByWeek,
    authorBuckets: bucketAuthorActivity(authorCounts),
    authorBucketLabels: FORENSICS_AUTHOR_BUCKET_LABELS,
    complexityBuckets: bucketComplexityCounts(complexities),
    complexityBucketLabels: FORENSICS_COMPLEXITY_BUCKET_LABELS,
    fileCount: isRollup ? descendants.length || forensics.fileCount || source.length : 1,
  };

  return hasTrendData(dashboard) ? dashboard : undefined;
}

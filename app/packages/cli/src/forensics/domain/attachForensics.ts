import type { NodeForensics, SystemNode, SystemSchema } from '@blueprint/core';
import { EntityRef, rollupChurnByWeek } from '@blueprint/core';
import type { FileMetrics } from './types.ts';

export function normalizeFilePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function fileMetricsToNodeForensics(metrics: FileMetrics): NodeForensics {
  return {
    complexity: metrics.complexity,
    loc: metrics.loc,
    sloc: metrics.sloc,
    churn: metrics.churn,
    churnByWeek: metrics.churnByWeek,
    authorCount: metrics.authorCount,
    topAuthorPercent: metrics.topAuthorPercent,
    hotspotScore: metrics.hotspotScore,
    classifications: [...metrics.classifications],
    coupledFiles: metrics.coupledFiles.map(c => ({
      path: c.path,
      score: c.score,
      sharedCommits: c.sharedCommits,
    })),
    ...(metrics.sinceDays !== undefined ? { sinceDays: metrics.sinceDays } : {}),
  };
}

export function aggregateNodeForensics(nodes: readonly SystemNode[]): NodeForensics | undefined {
  const withForensics = nodes.filter(n => n.forensics);
  if (withForensics.length === 0) return undefined;

  let complexity = 0;
  let churn = 0;
  let hotspotScore = 0;
  let authorCount = 0;
  let hotspotCount = 0;
  let knowledgeSiloCount = 0;
  let sinceDays: number | undefined;
  let ownershipWeight = 0;
  let weightedOwnership = 0;
  const classificationSet = new Set<'hotspot' | 'knowledge-silo'>();
  const churnByWeekSeries: (number[] | undefined)[] = [];

  for (const node of withForensics) {
    const f = node.forensics!;
    if ((f.complexity ?? 0) > complexity) complexity = f.complexity ?? 0;
    churn += f.churn ?? 0;
    if ((f.hotspotScore ?? 0) > hotspotScore) hotspotScore = f.hotspotScore ?? 0;
    if ((f.authorCount ?? 0) > authorCount) authorCount = f.authorCount ?? 0;
    if (sinceDays === undefined && f.sinceDays !== undefined) sinceDays = f.sinceDays;
    churnByWeekSeries.push(f.churnByWeek);
    const childChurn = f.churn ?? 0;
    if (childChurn > 0 && f.topAuthorPercent != null) {
      ownershipWeight += childChurn;
      weightedOwnership += f.topAuthorPercent * childChurn;
    }
    for (const c of f.classifications ?? []) {
      classificationSet.add(c);
      if (c === 'hotspot') hotspotCount++;
      if (c === 'knowledge-silo') knowledgeSiloCount++;
    }
  }

  const churnByWeek = rollupChurnByWeek(churnByWeekSeries);
  const topAuthorPercent = ownershipWeight > 0 ? weightedOwnership / ownershipWeight : undefined;

  return {
    complexity,
    churn,
    hotspotScore,
    authorCount,
    fileCount: withForensics.length,
    hotspotCount,
    knowledgeSiloCount,
    classifications: [...classificationSet],
    ...(churnByWeek ? { churnByWeek } : {}),
    ...(topAuthorPercent !== undefined ? { topAuthorPercent } : {}),
    ...(sinceDays !== undefined ? { sinceDays } : {}),
  };
}

export interface AttachForensicsOptions {
  /** Component nodes used to roll up container / system forensics. */
  componentNodes?: readonly SystemNode[];
}

function attachToComponentNodes(
  nodes: readonly SystemNode[],
  byPath: ReadonlyMap<string, FileMetrics>
): SystemNode[] {
  return nodes.map(node => {
    const filepath = node.properties?.filepath;
    if (typeof filepath !== 'string') return node;
    const metrics = byPath.get(normalizeFilePath(filepath));
    if (!metrics) return node;
    return { ...node, forensics: fileMetricsToNodeForensics(metrics) };
  });
}

function attachContainerRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    if (node.type !== 'container') return node;
    const containerId = EntityRef.leaf(node.entityRef);
    const children = componentNodes.filter(c => {
      const cid = c.properties?.containerId;
      if (typeof cid === 'string' && cid === containerId) return true;
      try {
        return EntityRef.getParent(c.entityRef) === node.entityRef;
      } catch {
        return false;
      }
    });
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

function attachSystemRollups(
  nodes: readonly SystemNode[],
  componentNodes: readonly SystemNode[]
): SystemNode[] {
  return nodes.map(node => {
    const prefix = `${node.entityRef}/`;
    const children = componentNodes.filter(
      c => c.entityRef === node.entityRef || c.entityRef.startsWith(prefix)
    );
    const forensics = aggregateNodeForensics(children);
    return forensics ? { ...node, forensics } : node;
  });
}

/**
 * Immutably attach forensics onto a schema:
 * - component level: join FileMetrics by properties.filepath
 * - container level: roll up from componentNodes
 * - context level: roll up system nodes from componentNodes under that system FQN
 */
export function attachForensicsToSchema(
  schema: SystemSchema,
  byPath: ReadonlyMap<string, FileMetrics>,
  options: AttachForensicsOptions = {}
): SystemSchema {
  const componentNodes = options.componentNodes ?? [];

  let nodes = schema.nodes;
  if (schema.level === 'component') {
    nodes = attachToComponentNodes(nodes, byPath);
  } else if (schema.level === 'container') {
    nodes = attachContainerRollups(nodes, componentNodes);
  } else if (schema.level === 'context') {
    nodes = attachSystemRollups(nodes, componentNodes);
  }

  return { ...schema, nodes };
}

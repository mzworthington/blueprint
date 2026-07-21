import type { NodeForensics } from '../models/schema';
import { computeRefactorScore } from './refactorScore';

export type RefactorBoundarySignal =
  'hotspot' | 'knowledge-silo' | 'high-coupling' | 'distributed-ownership' | 'cross-container';

export interface RefactorBoundaryMember {
  entityRef: string;
  name: string;
  filepath?: string;
  refactorScore: number;
}

export interface RefactorBoundary {
  id: string;
  seedEntityRef: string;
  seedName: string;
  members: RefactorBoundaryMember[];
  memberEntityRefs: string[];
  memberFilepaths: string[];
  aggregateRefactorScore: number;
  signals: RefactorBoundarySignal[];
  rationale: string[];
  spansContainers: boolean;
}

export interface RefactorBoundaryNodeInput {
  entityRef: string;
  name: string;
  type: string;
  containerId?: string;
  filepath?: string;
  forensics?: NodeForensics;
}

export interface BuildRefactorBoundaryOptions {
  couplingThreshold?: number;
  maxMembers?: number;
}

const DEFAULT_COUPLING_THRESHOLD = 0.3;
const DEFAULT_MAX_MEMBERS = 8;

function normalizeFilepath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function isContainerLike(node: RefactorBoundaryNodeInput): boolean {
  return (
    node.type === 'container' ||
    (!node.filepath && node.type !== 'component' && node.type !== 'code')
  );
}

function containerKey(node: RefactorBoundaryNodeInput): string | undefined {
  return node.containerId ?? undefined;
}

function nodeInContainer(node: RefactorBoundaryNodeInput, containerEntityRef: string): boolean {
  const leaf = containerEntityRef.split('/').pop();
  if (leaf && node.containerId === leaf) return true;
  return (
    node.entityRef === containerEntityRef || node.entityRef.startsWith(`${containerEntityRef}/`)
  );
}

function buildByFilepath(
  nodes: readonly RefactorBoundaryNodeInput[]
): Map<string, RefactorBoundaryNodeInput> {
  const map = new Map<string, RefactorBoundaryNodeInput>();
  for (const node of nodes) {
    if (!node.filepath) continue;
    map.set(normalizeFilepath(node.filepath), node);
  }
  return map;
}

function stableBoundaryId(memberEntityRefs: readonly string[]): string {
  return [...memberEntityRefs].sort().join('|');
}

function memberFromNode(node: RefactorBoundaryNodeInput): RefactorBoundaryMember {
  return {
    entityRef: node.entityRef,
    name: node.name,
    filepath: node.filepath,
    refactorScore: computeRefactorScore(node.forensics ?? {}),
  };
}

function buildRationale(
  members: RefactorBoundaryMember[],
  signals: RefactorBoundarySignal[],
  forensicsByRef: Map<string, NodeForensics | undefined>
): string[] {
  const rationale: string[] = [];
  const hasHotspot = members.some(m =>
    (forensicsByRef.get(m.entityRef)?.classifications ?? []).includes('hotspot')
  );
  const hasSilo = members.some(m =>
    (forensicsByRef.get(m.entityRef)?.classifications ?? []).includes('knowledge-silo')
  );

  if (hasHotspot) rationale.push('Hotspot files — high complexity and churn together.');
  if (hasSilo) rationale.push('Knowledge silo risk — complex code with concentrated authorship.');
  if (signals.includes('high-coupling')) {
    rationale.push('Files change together — consider extracting as a module.');
  }
  if (signals.includes('distributed-ownership')) {
    rationale.push('Distributed ownership — coordinate before splitting.');
  }
  if (signals.includes('cross-container')) {
    rationale.push('Spans containers — define an API boundary before refactoring.');
  }
  if (rationale.length === 0 && members.length > 1) {
    rationale.push('Related components share refactor pressure — review as a unit.');
  }
  if (rationale.length === 0) {
    rationale.push('Single high-priority refactor candidate.');
  }
  return rationale;
}

function detectSignals(
  members: RefactorBoundaryMember[],
  forensicsByRef: Map<string, NodeForensics | undefined>,
  spansContainers: boolean,
  internalCouplingCount: number
): RefactorBoundarySignal[] {
  const signals: RefactorBoundarySignal[] = [];
  for (const member of members) {
    const f = forensicsByRef.get(member.entityRef);
    for (const c of f?.classifications ?? []) {
      if (c === 'hotspot' && !signals.includes('hotspot')) signals.push('hotspot');
      if (c === 'knowledge-silo' && !signals.includes('knowledge-silo'))
        signals.push('knowledge-silo');
    }
    if ((f?.topAuthorPercent ?? 1) < 0.5 && !signals.includes('distributed-ownership')) {
      signals.push('distributed-ownership');
    }
  }
  if (internalCouplingCount > 0 && !signals.includes('high-coupling')) {
    signals.push('high-coupling');
  }
  if (spansContainers && !signals.includes('cross-container')) {
    signals.push('cross-container');
  }
  return signals;
}

function expandCouplingCluster(
  start: RefactorBoundaryNodeInput,
  pool: RefactorBoundaryNodeInput[],
  byFilepath: Map<string, RefactorBoundaryNodeInput>,
  options: BuildRefactorBoundaryOptions
): RefactorBoundaryNodeInput[] {
  const threshold = options.couplingThreshold ?? DEFAULT_COUPLING_THRESHOLD;
  const maxMembers = options.maxMembers ?? DEFAULT_MAX_MEMBERS;
  const poolByRef = new Map(pool.map(n => [n.entityRef, n]));
  const visited = new Set<string>();
  const members: RefactorBoundaryNodeInput[] = [];

  const findCoupledPeers = (node: RefactorBoundaryNodeInput): RefactorBoundaryNodeInput[] => {
    const peers: RefactorBoundaryNodeInput[] = [];
    const seenPaths = new Set<string>();

    for (const edge of node.forensics?.coupledFiles ?? []) {
      if (edge.score < threshold) continue;
      const peer = byFilepath.get(normalizeFilepath(edge.path));
      if (peer && poolByRef.has(peer.entityRef)) peers.push(peer);
      seenPaths.add(normalizeFilepath(edge.path));
    }

    if (node.filepath) {
      const selfPath = normalizeFilepath(node.filepath);
      for (const candidate of pool) {
        if (candidate.entityRef === node.entityRef) continue;
        for (const edge of candidate.forensics?.coupledFiles ?? []) {
          if (edge.score < threshold) continue;
          if (normalizeFilepath(edge.path) !== selfPath) continue;
          if (!seenPaths.has(candidate.filepath ? normalizeFilepath(candidate.filepath) : '')) {
            peers.push(candidate);
          }
        }
      }
    }

    return peers;
  };

  const queue: RefactorBoundaryNodeInput[] = [start];
  visited.add(start.entityRef);

  while (queue.length > 0 && members.length < maxMembers) {
    const current = queue.shift()!;
    members.push(current);

    for (const peer of findCoupledPeers(current)) {
      if (visited.has(peer.entityRef)) continue;
      visited.add(peer.entityRef);
      queue.push(peer);
    }
  }

  return members;
}

function candidatePoolForSeed(
  seed: RefactorBoundaryNodeInput,
  nodes: readonly RefactorBoundaryNodeInput[]
): RefactorBoundaryNodeInput[] {
  if (!isContainerLike(seed)) {
    return nodes.filter(n => n.filepath);
  }
  return nodes.filter(n => nodeInContainer(n, seed.entityRef) && n.filepath);
}

function pickClusterStart(
  seed: RefactorBoundaryNodeInput,
  pool: RefactorBoundaryNodeInput[]
): RefactorBoundaryNodeInput {
  if (!isContainerLike(seed)) return seed;
  const ranked = [...pool].sort(
    (a, b) => computeRefactorScore(b.forensics ?? {}) - computeRefactorScore(a.forensics ?? {})
  );
  return ranked[0] ?? seed;
}

/**
 * Build a derived refactor boundary from forensics-enriched nodes.
 * Display-only — never written to schema YAML.
 */
export function buildRefactorBoundary(
  seedEntityRef: string,
  nodes: readonly RefactorBoundaryNodeInput[],
  options: BuildRefactorBoundaryOptions = {}
): RefactorBoundary | undefined {
  const seed = nodes.find(n => n.entityRef === seedEntityRef);
  if (!seed) return undefined;

  const pool = candidatePoolForSeed(seed, nodes);
  const byFilepath = buildByFilepath(nodes);
  const clusterStart = pickClusterStart(seed, pool);
  const clusterNodes = expandCouplingCluster(clusterStart, pool, byFilepath, options);

  if (clusterNodes.length === 0) return undefined;

  const forensicsByRef = new Map(nodes.map(n => [n.entityRef, n.forensics]));
  const members = clusterNodes.map(memberFromNode);
  const memberEntityRefs = members.map(m => m.entityRef);
  const memberFilepaths = members.map(m => m.filepath).filter((p): p is string => !!p);

  const containerKeys = new Set(
    clusterNodes.map(n => containerKey(n)).filter((k): k is string => !!k)
  );
  const spansContainers = containerKeys.size > 1;

  let internalCouplingCount = 0;
  const memberRefs = new Set(memberEntityRefs);
  for (const node of clusterNodes) {
    for (const edge of node.forensics?.coupledFiles ?? []) {
      const peer = byFilepath.get(normalizeFilepath(edge.path));
      if (
        peer &&
        memberRefs.has(peer.entityRef) &&
        edge.score >= (options.couplingThreshold ?? DEFAULT_COUPLING_THRESHOLD)
      ) {
        internalCouplingCount++;
      }
    }
  }

  const signals = detectSignals(members, forensicsByRef, spansContainers, internalCouplingCount);
  const rationale = buildRationale(members, signals, forensicsByRef);
  const aggregateRefactorScore = members.reduce((sum, m) => sum + m.refactorScore, 0);

  return {
    id: stableBoundaryId(memberEntityRefs),
    seedEntityRef: seed.entityRef,
    seedName: seed.name,
    members,
    memberEntityRefs,
    memberFilepaths,
    aggregateRefactorScore,
    signals,
    rationale,
    spansContainers,
  };
}

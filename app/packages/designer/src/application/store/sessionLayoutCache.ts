import type { SystemSchema } from '@blueprint/core';
import type { BlueprintRFEdge, BlueprintRFNode } from './layoutUtils';

type SessionLayout = {
  fingerprint: string;
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
};

const sessionLayouts = new Map<string, SessionLayout>();

export function schemaLayoutFingerprint(schema: SystemSchema): string {
  const nodeRefs = schema.nodes
    .map(node => node.entityRef)
    .filter((ref): ref is string => typeof ref === 'string' && ref.length > 0)
    .sort();
  const deps = (schema.dependencies ?? []).map(dep => `${dep.from}->${dep.to}`).sort();
  return `${nodeRefs.join('\0')}|${deps.join('\0')}`;
}

export function hasSessionLayout(filePath: string, fingerprint: string): boolean {
  const entry = sessionLayouts.get(filePath);
  return entry?.fingerprint === fingerprint;
}

export function getSessionLayout(
  filePath: string,
  fingerprint: string
): { nodes: BlueprintRFNode[]; edges: BlueprintRFEdge[] } | undefined {
  const entry = sessionLayouts.get(filePath);
  if (!entry || entry.fingerprint !== fingerprint) return undefined;
  return {
    nodes: structuredClone(entry.nodes),
    edges: structuredClone(entry.edges),
  };
}

export function setSessionLayout(
  filePath: string,
  fingerprint: string,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): void {
  sessionLayouts.set(filePath, {
    fingerprint,
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  });
}

export function clearSessionLayout(filePath?: string): void {
  if (filePath) {
    sessionLayouts.delete(filePath);
    return;
  }
  sessionLayouts.clear();
}

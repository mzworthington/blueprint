import type { NodeForensics } from '@blueprint/core';

export type ConcernLevel = 'none' | 'info' | 'warning' | 'danger';

export interface ForensicsConcern {
  level: ConcernLevel;
  reasons: string[];
}

const HOTSPOT_SCORE_THRESHOLD = 0.5;
const COMPLEXITY_THRESHOLD = 10;

/**
 * Rank forensics risk for UI highlighting.
 * Classifications from CLI scoring take precedence over raw thresholds.
 */
export function evaluateForensicsConcern(forensics?: NodeForensics): ForensicsConcern {
  if (!forensics) {
    return { level: 'none', reasons: [] };
  }

  const reasons: string[] = [];
  const classifications = forensics.classifications ?? [];
  const hasHotspot = classifications.includes('hotspot');
  const hasSilo = classifications.includes('knowledge-silo');

  if (hasHotspot) reasons.push('Hotspot');
  if (hasSilo) reasons.push('Knowledge silo');

  if (hasHotspot) {
    return { level: 'danger', reasons };
  }
  if (hasSilo) {
    return { level: 'warning', reasons };
  }

  if ((forensics.hotspotScore ?? 0) >= HOTSPOT_SCORE_THRESHOLD) {
    return { level: 'danger', reasons: ['High hotspot score'] };
  }

  const complexity = forensics.complexity ?? 0;
  if (complexity >= COMPLEXITY_THRESHOLD && forensics.authorCount === 1) {
    return { level: 'warning', reasons: ['Knowledge silo risk'] };
  }
  if (complexity >= COMPLEXITY_THRESHOLD) {
    return { level: 'info', reasons: ['Elevated complexity'] };
  }

  return { level: 'none', reasons: [] };
}

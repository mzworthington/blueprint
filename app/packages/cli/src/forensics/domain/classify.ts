import type { ForensicClassification } from './types.ts';

export function classifyFile(metrics: {
  hotspotScore: number;
  complexity: number;
  authorCount: number;
  hotspotThreshold: number;
  complexityThreshold: number;
}): ForensicClassification[] {
  const out: ForensicClassification[] = [];
  if (metrics.hotspotScore >= metrics.hotspotThreshold) {
    out.push('hotspot');
  }
  if (metrics.complexity >= metrics.complexityThreshold && metrics.authorCount === 1) {
    out.push('knowledge-silo');
  }
  return out;
}

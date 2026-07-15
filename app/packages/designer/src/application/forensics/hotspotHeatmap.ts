import type { NodeForensics } from '@blueprint/core';
import type { BlueprintRFNode } from '../store/layoutUtils';

/**
 * Continuous heatmap intensity from schema forensics.
 * Display-only — never write this back into YAML.
 */
export function hotspotHeatIntensity(forensics?: NodeForensics): number {
  if (!forensics || forensics.hotspotScore == null || Number.isNaN(forensics.hotspotScore)) {
    return 0;
  }
  return Math.min(1, Math.max(0, forensics.hotspotScore));
}

/**
 * Attach transient `hotspotHeat` on RF nodes for canvas styling.
 * Does not mutate input node objects or schema forensics payloads.
 */
export function applyHotspotHeatmap(nodes: BlueprintRFNode[], enabled: boolean): BlueprintRFNode[] {
  return nodes.map(n => {
    const heat = enabled ? hotspotHeatIntensity(n.data.forensics) : 0;
    if (enabled) {
      if (n.data.hotspotHeat === heat) return n;
      return { ...n, data: { ...n.data, hotspotHeat: heat } };
    }
    if (n.data.hotspotHeat == null || n.data.hotspotHeat === 0) return n;
    return { ...n, data: { ...n.data, hotspotHeat: 0 } };
  });
}

/** MiniMap node color when heatmap is active; null means fall back to type color. */
export function hotspotHeatmapMinimapColor(intensity: number): string | null {
  if (intensity <= 0) return null;
  const t = Math.min(1, Math.max(0, intensity));
  // Dark slate → red; keep readable on dark MiniMap bg.
  const r = Math.round(30 + t * (239 - 30));
  const g = Math.round(41 + t * (68 - 41));
  const b = Math.round(59 + t * (68 - 59));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

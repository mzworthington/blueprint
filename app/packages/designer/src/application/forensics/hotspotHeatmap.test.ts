import { describe, it, expect } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import {
  applyHotspotHeatmap,
  hotspotHeatIntensity,
  hotspotHeatmapMinimapColor,
} from './hotspotHeatmap';

describe('hotspotHeatIntensity', () => {
  it('returns 0 when forensics is missing', () => {
    expect(hotspotHeatIntensity(undefined)).toBe(0);
  });

  it('returns 0 when hotspotScore is missing', () => {
    expect(hotspotHeatIntensity({ complexity: 12 })).toBe(0);
  });

  it('returns the score when in range', () => {
    expect(hotspotHeatIntensity({ hotspotScore: 0.42 })).toBe(0.42);
  });

  it('clamps out-of-range scores', () => {
    expect(hotspotHeatIntensity({ hotspotScore: 1.5 })).toBe(1);
    expect(hotspotHeatIntensity({ hotspotScore: -0.2 })).toBe(0);
  });
});

describe('applyHotspotHeatmap', () => {
  const nodes: BlueprintRFNode[] = [
    {
      id: 'hot',
      type: 'blueprintNode',
      position: { x: 0, y: 0 },
      data: {
        id: 'hot',
        type: 'component',
        name: 'Hot',
        properties: {},
        forensics: { hotspotScore: 0.9 },
      },
    },
    {
      id: 'cold',
      type: 'blueprintNode',
      position: { x: 0, y: 0 },
      data: {
        id: 'cold',
        type: 'component',
        name: 'Cold',
        properties: {},
      },
    },
  ];

  it('sets transient hotspotHeat from scores when enabled', () => {
    const next = applyHotspotHeatmap(nodes, true);
    expect(next[0].data.hotspotHeat).toBe(0.9);
    expect(next[1].data.hotspotHeat).toBe(0);
    expect(nodes[0].data.hotspotHeat).toBeUndefined();
    expect(nodes[0].data.forensics).toEqual({ hotspotScore: 0.9 });
  });

  it('clears heat when disabled', () => {
    const heated = applyHotspotHeatmap(nodes, true);
    const cleared = applyHotspotHeatmap(heated, false);
    expect(cleared[0].data.hotspotHeat).toBe(0);
    expect(cleared[1].data.hotspotHeat).toBe(0);
  });
});

describe('hotspotHeatmapMinimapColor', () => {
  it('returns null for zero intensity', () => {
    expect(hotspotHeatmapMinimapColor(0)).toBeNull();
  });

  it('returns a red-scale hex for positive intensity', () => {
    const low = hotspotHeatmapMinimapColor(0.2);
    const high = hotspotHeatmapMinimapColor(0.9);
    expect(low).toMatch(/^#[0-9a-f]{6}$/i);
    expect(high).toMatch(/^#[0-9a-f]{6}$/i);
    expect(low).not.toBe(high);
  });
});

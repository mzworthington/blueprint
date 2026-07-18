import { describe, expect, it } from 'vitest';
import { MarkerType } from '@xyflow/react';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  mapDomainDepToRFEdge,
  shouldAnimateDependencyEdge,
} from './layoutUtils.ts';

describe('dependency edge direction visuals', () => {
  it('maps domain deps with a closed arrow marker toward the target', () => {
    const edge = mapDomainDepToRFEdge({
      from: 'a',
      to: 'b',
      type: 'direct-call',
      description: 'calls b',
    });

    expect(edge.markerEnd).toEqual(dependencyArrowMarker(DEPENDENCY_EDGE_STROKE));
    expect(edge.animated).toBe(false);
    expect((edge.markerEnd as { type: MarkerType }).type).toBe(MarkerType.ArrowClosed);
  });

  it('keeps publish-subscribe edges animated by default', () => {
    const edge = mapDomainDepToRFEdge({
      from: 'a',
      to: 'b',
      type: 'publish-subscribe',
    });
    expect(edge.animated).toBe(true);
  });

  it('animates edges incident to the selected node', () => {
    expect(
      shouldAnimateDependencyEdge({ source: 'a', target: 'b', animated: false }, 'a', false)
    ).toBe(true);
    expect(
      shouldAnimateDependencyEdge({ source: 'a', target: 'b', animated: false }, 'b', false)
    ).toBe(true);
    expect(
      shouldAnimateDependencyEdge({ source: 'a', target: 'b', animated: false }, 'c', false)
    ).toBe(false);
  });

  it('animates all edges when selected-dependencies focus mode is on', () => {
    expect(
      shouldAnimateDependencyEdge({ source: 'a', target: 'b', animated: false }, 'c', true)
    ).toBe(true);
  });

  it('preserves already-animated edges', () => {
    expect(
      shouldAnimateDependencyEdge({ source: 'a', target: 'b', animated: true }, null, false)
    ).toBe(true);
  });
});

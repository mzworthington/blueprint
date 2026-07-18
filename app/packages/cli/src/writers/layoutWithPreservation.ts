import {
  mergeLayoutPositions,
  nodesNeedingLayout,
  type SystemNode,
  type SystemDependency,
} from '@blueprint/core';
import type { LayoutPort } from '../analysis/domain/ports.ts';

export type LayoutWithPreservationOptions = {
  forceRelayout?: boolean;
  gap?: number;
};

/**
 * Layout nodes while preserving finite x/y from `previous` for matching entityRefs.
 * Only gap nodes (missing coords, or all nodes when forceRelayout) are sent to the engine.
 */
export async function layoutWithPreservation(
  layout: LayoutPort,
  previous: SystemNode[],
  next: SystemNode[],
  dependencies: SystemDependency[],
  options: LayoutWithPreservationOptions = {}
): Promise<SystemNode[]> {
  if (options.forceRelayout || previous.length === 0) {
    const laidOut = await layout.computeLayout(next, dependencies);
    return mergeLayoutPositions(previous, next, laidOut, {
      forceRelayout: true,
      gap: options.gap,
    });
  }

  const withSeeded = next.map(n => {
    const prev = previous.find(p => p.entityRef === n.entityRef);
    if (prev && Number.isFinite(prev.x) && Number.isFinite(prev.y)) {
      return { ...n, x: prev.x, y: prev.y };
    }
    return { ...n, x: undefined, y: undefined };
  });

  const gaps = nodesNeedingLayout(withSeeded);
  if (gaps.length === 0) {
    return withSeeded;
  }

  const gapDeps = dependencies.filter(
    d => gaps.some(g => g.entityRef === d.from) || gaps.some(g => g.entityRef === d.to)
  );
  const laidOutGaps = await layout.computeLayout(gaps, gapDeps);
  return mergeLayoutPositions(previous, next, laidOutGaps, { gap: options.gap });
}

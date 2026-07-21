import type { NodeForensics } from '../models/schema';

/**
 * Heuristic refactor priority: high complexity × churn × distributed ownership.
 * Returns 0 when complexity or churn is missing/zero.
 */
export function computeRefactorScore(
  forensics: Pick<NodeForensics, 'complexity' | 'churn' | 'topAuthorPercent'>
): number {
  const complexity = forensics.complexity ?? 0;
  const churn = forensics.churn ?? 0;
  if (complexity <= 0 || churn <= 0) return 0;
  const ownership = forensics.topAuthorPercent ?? 0;
  return complexity * churn * (1 - ownership);
}

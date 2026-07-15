/**
 * Min-max normalize a value into [0, 1].
 * When max === min, returns 0 (no discriminative range).
 */
export function minMaxNormalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Hotspot score = normalize(complexity) * normalize(churn), both min-max across the set.
 */
export function computeHotspotScores(
  files: ReadonlyArray<{ path: string; complexity: number; churn: number }>
): Map<string, number> {
  const scores = new Map<string, number>();
  if (files.length === 0) return scores;

  let minC = Infinity;
  let maxC = -Infinity;
  let minH = Infinity;
  let maxH = -Infinity;

  for (const f of files) {
    if (f.complexity < minC) minC = f.complexity;
    if (f.complexity > maxC) maxC = f.complexity;
    if (f.churn < minH) minH = f.churn;
    if (f.churn > maxH) maxH = f.churn;
  }

  for (const f of files) {
    const nC = minMaxNormalize(f.complexity, minC, maxC);
    const nH = minMaxNormalize(f.churn, minH, maxH);
    scores.set(f.path, nC * nH);
  }

  return scores;
}

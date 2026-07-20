/**
 * Pure helpers for forensics trend charts (weekly churn rollups and histogram buckets).
 */

/** Sum aligned weekly churn buckets; returns undefined when no series have data. */
export function rollupChurnByWeek(
  series: readonly (readonly number[] | undefined)[]
): number[] | undefined {
  const populated = series.filter((s): s is readonly number[] => !!s && s.length > 0);
  if (populated.length === 0) return undefined;

  const weekCount = Math.max(...populated.map(s => s.length));
  const totals = new Array<number>(weekCount).fill(0);
  for (const buckets of populated) {
    for (let i = 0; i < buckets.length; i++) {
      totals[i] += buckets[i] ?? 0;
    }
  }
  return totals;
}

const COMPLEXITY_BUCKET_LABELS = ['1–5', '6–10', '11–20', '21+'] as const;
const AUTHOR_BUCKET_LABELS = ['1 author', '2–3', '4+'] as const;

/** File counts per complexity band for micro-chart display. */
export function bucketComplexityCounts(complexities: readonly number[]): number[] {
  const buckets = [0, 0, 0, 0];
  for (const value of complexities) {
    if (value <= 0) continue;
    if (value <= 5) buckets[0] += 1;
    else if (value <= 10) buckets[1] += 1;
    else if (value <= 20) buckets[2] += 1;
    else buckets[3] += 1;
  }
  return buckets;
}

/** File counts by author diversity for micro-chart display. */
export function bucketAuthorActivity(authorCounts: readonly number[]): number[] {
  const buckets = [0, 0, 0];
  for (const count of authorCounts) {
    if (count <= 0) continue;
    if (count === 1) buckets[0] += 1;
    else if (count <= 3) buckets[1] += 1;
    else buckets[2] += 1;
  }
  return buckets;
}

export const FORENSICS_COMPLEXITY_BUCKET_LABELS = COMPLEXITY_BUCKET_LABELS;
export const FORENSICS_AUTHOR_BUCKET_LABELS = AUTHOR_BUCKET_LABELS;

export interface ForensicsOptions {
  /** Lookback window for churn / authors / coupling. Default 90. */
  sinceDays: number;
  /** Minimum hotspotScore to classify as Hotspot. Default 0.5. */
  hotspotThreshold: number;
  /** Minimum complexity to consider for Knowledge Silo. Default 10. */
  complexityThreshold: number;
  /** Minimum shared commits before a coupling pair is reported. Default 5. */
  minSharedCommits: number;
  /** Minimum coupling Jaccard score to report a pair. Default 0.75. */
  couplingThreshold: number;
  /**
   * When > 0, skip AST complexity for files with churn below this value.
   * Default 0 (always compute structural metrics).
   */
  minChurnForComplexity: number;
  /** Glob for structural scan. Default all TypeScript source files. */
  glob: string;
  ignore: string[];
  include: string[];
}

export const DEFAULT_FORENSICS_OPTIONS: ForensicsOptions = {
  sinceDays: 90,
  hotspotThreshold: 0.5,
  complexityThreshold: 10,
  minSharedCommits: 5,
  couplingThreshold: 0.75,
  minChurnForComplexity: 0,
  glob: '**/*.{ts,tsx}',
  ignore: [],
  include: [],
};

export function mergeForensicsOptions(
  base: ForensicsOptions,
  overrides: Partial<ForensicsOptions> = {}
): ForensicsOptions {
  return {
    sinceDays: overrides.sinceDays ?? base.sinceDays,
    hotspotThreshold: overrides.hotspotThreshold ?? base.hotspotThreshold,
    complexityThreshold: overrides.complexityThreshold ?? base.complexityThreshold,
    minSharedCommits: overrides.minSharedCommits ?? base.minSharedCommits,
    couplingThreshold: overrides.couplingThreshold ?? base.couplingThreshold,
    minChurnForComplexity: overrides.minChurnForComplexity ?? base.minChurnForComplexity,
    glob: overrides.glob ?? base.glob,
    ignore: overrides.ignore !== undefined ? overrides.ignore : base.ignore,
    include: overrides.include !== undefined ? overrides.include : base.include,
  };
}

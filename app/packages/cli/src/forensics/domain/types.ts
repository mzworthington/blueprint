export type ForensicClassification = 'hotspot' | 'knowledge-silo';

export interface CoupledFileRef {
  path: string;
  score: number;
  sharedCommits: number;
}

export interface FileMetrics {
  path: string;
  complexity: number;
  loc: number;
  sloc: number;
  churn: number;
  authorCount: number;
  topAuthorPercent: number;
  coupledFiles: CoupledFileRef[];
  hotspotScore: number;
  classifications: ForensicClassification[];
}

export interface CoupledPair {
  a: string;
  b: string;
  score: number;
  sharedCommits: number;
}

export interface GitCommit {
  hash: string;
  authorEmail: string;
  authorDate: Date;
  paths: string[];
}

export interface StructuralMetrics {
  path: string;
  complexity: number;
  loc: number;
  sloc: number;
}

export interface FileHistoryTraits {
  path: string;
  churn: number;
  authorCount: number;
  topAuthorPercent: number;
  /** Commit hashes that touched this file (within the analysis window). */
  commitHashes: string[];
}

export interface ForensicReport {
  generatedAt: string;
  rootPath: string;
  options: import('./options.ts').ForensicsOptions;
  files: FileMetrics[];
  coupledPairs: CoupledPair[];
}

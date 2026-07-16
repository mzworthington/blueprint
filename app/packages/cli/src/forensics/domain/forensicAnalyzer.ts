import { throwIfAborted } from '../../analysis/domain/cancellation.ts';
import { aggregateFileHistory } from './aggregateHistory.ts';
import { classifyFile } from './classify.ts';
import { computeHotspotScores } from './hotspotScoring.ts';
import {
  DEFAULT_FORENSICS_OPTIONS,
  mergeForensicsOptions,
  type ForensicsOptions,
} from './options.ts';
import type { ForensicAnalyzerPorts } from './ports.ts';
import { computeTemporalCoupling } from './temporalCoupling.ts';
import type { CoupledFileRef, FileMetrics, ForensicReport, StructuralMetrics } from './types.ts';

export interface RunForensicsInput {
  rootPath: string;
  options?: Partial<ForensicsOptions>;
  /** When true, only include files classified as hotspot in `files` (pairs still full). */
  hotspotsOnly?: boolean;
  signal?: AbortSignal;
  /** Override clock for generatedAt (tests). */
  now?: () => Date;
}

export class ForensicAnalyzer {
  constructor(private readonly ports: ForensicAnalyzerPorts) {}

  async run(input: RunForensicsInput): Promise<ForensicReport> {
    const options = mergeForensicsOptions(DEFAULT_FORENSICS_OPTIONS, input.options);
    const signal = input.signal;
    throwIfAborted(signal);

    const paths = await this.ports.fileLister.listSourceFiles(options, signal);
    throwIfAborted(signal);

    const commits = await this.ports.gitHistory.loadHistory(
      input.rootPath,
      { sinceDays: options.sinceDays },
      signal
    );
    throwIfAborted(signal);

    const history = aggregateFileHistory(commits, paths);
    const historyByPath = new Map(history.map(h => [h.path, h]));

    const pathsForComplexity =
      options.minChurnForComplexity > 0
        ? paths.filter(p => (historyByPath.get(p)?.churn ?? 0) >= options.minChurnForComplexity)
        : paths;

    const structural = await this.ports.complexity.analyze(pathsForComplexity, options, signal);
    throwIfAborted(signal);
    const structuralByPath = new Map(structural.map(s => [s.path, s]));

    const coupledPairs = computeTemporalCoupling(
      commits,
      {
        minSharedCommits: options.minSharedCommits,
        couplingThreshold: options.couplingThreshold,
      },
      new Set(paths)
    );

    const couplingByPath = new Map<string, CoupledFileRef[]>();
    for (const pair of coupledPairs) {
      const forA = couplingByPath.get(pair.a) ?? [];
      forA.push({ path: pair.b, score: pair.score, sharedCommits: pair.sharedCommits });
      couplingByPath.set(pair.a, forA);

      const forB = couplingByPath.get(pair.b) ?? [];
      forB.push({ path: pair.a, score: pair.score, sharedCommits: pair.sharedCommits });
      couplingByPath.set(pair.b, forB);
    }

    const emptyStructural: StructuralMetrics = {
      path: '',
      complexity: 0,
      loc: 0,
      sloc: 0,
    };

    const scoreInputs = paths.map(path => {
      const s = structuralByPath.get(path) ?? { ...emptyStructural, path };
      const h = historyByPath.get(path)!;
      return { path, complexity: s.complexity, churn: h.churn };
    });
    const hotspotScores = computeHotspotScores(scoreInputs);

    let files: FileMetrics[] = paths.map(path => {
      const s = structuralByPath.get(path) ?? { ...emptyStructural, path };
      const h = historyByPath.get(path)!;
      const hotspotScore = hotspotScores.get(path) ?? 0;
      const classifications = classifyFile({
        hotspotScore,
        complexity: s.complexity,
        authorCount: h.authorCount,
        hotspotThreshold: options.hotspotThreshold,
        complexityThreshold: options.complexityThreshold,
      });
      return {
        path,
        complexity: s.complexity,
        loc: s.loc,
        sloc: s.sloc,
        churn: h.churn,
        authorCount: h.authorCount,
        topAuthorPercent: h.topAuthorPercent,
        contributors: h.contributors,
        coupledFiles: couplingByPath.get(path) ?? [],
        hotspotScore,
        classifications,
      };
    });

    if (input.hotspotsOnly) {
      files = files.filter(f => f.classifications.includes('hotspot'));
    }

    files.sort((a, b) => b.hotspotScore - a.hotspotScore || a.path.localeCompare(b.path));

    const report: ForensicReport = {
      generatedAt: (input.now ?? (() => new Date()))().toISOString(),
      rootPath: input.rootPath,
      options,
      files,
      coupledPairs,
    };

    for (const reporter of this.ports.reporters) {
      throwIfAborted(signal);
      await reporter.report(report, signal);
    }

    return report;
  }
}

import { describe, expect, it } from 'vitest';
import { buildRefactorBoundary, type RefactorBoundaryNodeInput } from './refactorBoundary';

function node(partial: RefactorBoundaryNodeInput): RefactorBoundaryNodeInput {
  return partial;
}

describe('buildRefactorBoundary', () => {
  it('expands a component seed via temporal coupling', () => {
    const nodes: RefactorBoundaryNodeInput[] = [
      node({
        entityRef: 'app/a',
        name: 'A',
        type: 'component',
        filepath: 'src/a.ts',
        forensics: {
          complexity: 20,
          churn: 10,
          topAuthorPercent: 0.2,
          coupledFiles: [{ path: 'src/b.ts', score: 0.8, sharedCommits: 5 }],
          classifications: ['hotspot'],
        },
      }),
      node({
        entityRef: 'app/b',
        name: 'B',
        type: 'component',
        filepath: 'src/b.ts',
        forensics: {
          complexity: 15,
          churn: 8,
          topAuthorPercent: 0.3,
          coupledFiles: [{ path: 'src/a.ts', score: 0.8, sharedCommits: 5 }],
        },
      }),
      node({
        entityRef: 'app/c',
        name: 'C',
        type: 'component',
        filepath: 'src/c.ts',
        forensics: { complexity: 2, churn: 1, topAuthorPercent: 1 },
      }),
    ];

    const boundary = buildRefactorBoundary('app/a', nodes)!;
    expect(boundary.memberEntityRefs).toEqual(expect.arrayContaining(['app/a', 'app/b']));
    expect(boundary.memberEntityRefs).not.toContain('app/c');
    expect(boundary.signals).toContain('high-coupling');
    expect(boundary.rationale.length).toBeGreaterThan(0);
  });

  it('builds container rollup from high-refactor children', () => {
    const nodes: RefactorBoundaryNodeInput[] = [
      node({
        entityRef: 'app/svc',
        name: 'Service',
        type: 'container',
        containerId: 'svc',
        forensics: { fileCount: 2, churn: 12, complexity: 30 },
      }),
      node({
        entityRef: 'app/svc/db',
        name: 'DB',
        type: 'component',
        containerId: 'svc',
        filepath: 'src/db.ts',
        forensics: {
          complexity: 20,
          churn: 10,
          topAuthorPercent: 0.4,
          classifications: ['hotspot'],
        },
      }),
      node({
        entityRef: 'app/svc/api',
        name: 'API',
        type: 'component',
        containerId: 'svc',
        filepath: 'src/api.ts',
        forensics: {
          complexity: 10,
          churn: 2,
          topAuthorPercent: 0.9,
          coupledFiles: [{ path: 'src/db.ts', score: 0.7, sharedCommits: 4 }],
        },
      }),
    ];

    const boundary = buildRefactorBoundary('app/svc', nodes)!;
    expect(boundary.memberEntityRefs).toEqual(
      expect.arrayContaining(['app/svc/db', 'app/svc/api'])
    );
    expect(boundary.seedEntityRef).toBe('app/svc');
  });

  it('flags cross-container members', () => {
    const nodes: RefactorBoundaryNodeInput[] = [
      node({
        entityRef: 'app/x/a',
        name: 'A',
        type: 'component',
        containerId: 'x',
        filepath: 'src/a.ts',
        forensics: {
          complexity: 20,
          churn: 10,
          topAuthorPercent: 0.2,
          coupledFiles: [{ path: 'src/b.ts', score: 0.9, sharedCommits: 6 }],
        },
      }),
      node({
        entityRef: 'app/y/b',
        name: 'B',
        type: 'component',
        containerId: 'y',
        filepath: 'src/b.ts',
        forensics: { complexity: 15, churn: 8, topAuthorPercent: 0.3 },
      }),
    ];

    const boundary = buildRefactorBoundary('app/x/a', nodes)!;
    expect(boundary.signals).toContain('cross-container');
    expect(boundary.spansContainers).toBe(true);
  });

  it('returns undefined when seed is missing', () => {
    expect(buildRefactorBoundary('missing', [])).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import { resolveCouplingEdges, findNodeIdByFilepath } from './resolveCouplingEdges';

function node(
  id: string,
  filepath?: string,
  coupledFiles: Array<{ path: string; score: number; sharedCommits: number }> = []
): BlueprintRFNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      properties: filepath ? { filepath } : {},
      entityRef: id,
      forensics: coupledFiles.length > 0 ? { coupledFiles } : undefined,
    },
  };
}

describe('resolveCouplingEdges', () => {
  it('returns empty when selected node has no coupled files', () => {
    const nodes = [node('a', 'src/a.ts'), node('b', 'src/b.ts')];
    expect(resolveCouplingEdges('a', nodes)).toEqual([]);
  });

  it('maps coupledFiles paths to nodes on the canvas via properties.filepath', () => {
    const nodes = [
      node('a', 'src/a.ts', [
        { path: 'src/b.ts', score: 0.9, sharedCommits: 8 },
        { path: 'src/missing.ts', score: 0.8, sharedCommits: 5 },
      ]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];

    expect(resolveCouplingEdges('a', nodes)).toEqual([
      {
        sourceId: 'a',
        targetId: 'b',
        score: 0.9,
        sharedCommits: 8,
        path: 'src/b.ts',
      },
    ]);
  });

  it('normalizes path separators and leading ./ when matching', () => {
    const nodes = [
      node('a', './src/a.ts', [{ path: 'src\\b.ts', score: 0.75, sharedCommits: 4 }]),
      node('b', 'src/b.ts'),
    ];

    expect(resolveCouplingEdges('a', nodes)).toEqual([
      {
        sourceId: 'a',
        targetId: 'b',
        score: 0.75,
        sharedCommits: 4,
        path: 'src\\b.ts',
      },
    ]);
  });

  it('returns empty when selected node is missing', () => {
    expect(resolveCouplingEdges('missing', [node('a', 'src/a.ts')])).toEqual([]);
  });

  it('skips self-coupling if filepath matches the selected node', () => {
    const nodes = [node('a', 'src/a.ts', [{ path: 'src/a.ts', score: 1, sharedCommits: 10 }])];
    expect(resolveCouplingEdges('a', nodes)).toEqual([]);
  });
});

describe('findNodeIdByFilepath', () => {
  it('resolves normalized filepaths to canvas node ids', () => {
    const nodes = [node('peer', 'src/b.ts'), node('a', './src/a.ts')];
    expect(findNodeIdByFilepath('src/b.ts', nodes)).toBe('peer');
    expect(findNodeIdByFilepath('./src/b.ts', nodes)).toBe('peer');
    expect(findNodeIdByFilepath('src/missing.ts', nodes)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { SystemNode, SystemSchema } from '@blueprint/core';
import { attachForensicsToSchema, aggregateNodeForensics } from './attachForensics.ts';
import type { FileMetrics } from './types.ts';

function metrics(partial: Partial<FileMetrics> & { path: string }): FileMetrics {
  return {
    complexity: 0,
    loc: 0,
    sloc: 0,
    churn: 0,
    authorCount: 0,
    topAuthorPercent: 0,
    coupledFiles: [],
    hotspotScore: 0,
    classifications: [],
    ...partial,
  };
}

describe('aggregateNodeForensics', () => {
  it('rolls up max/sum/counts from child forensics', () => {
    const children: SystemNode[] = [
      {
        entityRef: 'a/b/c1',
        type: 'component',
        name: 'c1',
        forensics: {
          complexity: 10,
          churn: 3,
          hotspotScore: 0.4,
          authorCount: 2,
          classifications: ['hotspot'],
        },
      },
      {
        entityRef: 'a/b/c2',
        type: 'component',
        name: 'c2',
        forensics: {
          complexity: 20,
          churn: 5,
          hotspotScore: 0.9,
          authorCount: 1,
          classifications: ['knowledge-silo'],
        },
      },
    ];

    expect(aggregateNodeForensics(children)).toEqual({
      complexity: 20,
      churn: 8,
      hotspotScore: 0.9,
      authorCount: 2,
      fileCount: 2,
      hotspotCount: 1,
      knowledgeSiloCount: 1,
      classifications: ['hotspot', 'knowledge-silo'],
    });
  });
});

describe('attachForensicsToSchema', () => {
  it('attaches file metrics to component nodes by filepath', () => {
    const schema: SystemSchema = {
      name: 'Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'sys/svc/domain',
      nodes: [
        {
          entityRef: 'sys/svc/domain/foo',
          type: 'component',
          name: 'Foo',
          properties: { filepath: 'src/foo.ts', containerId: 'domain' },
        },
        {
          entityRef: 'sys/svc/domain/bar',
          type: 'component',
          name: 'Bar',
          properties: { filepath: 'src/bar.ts', containerId: 'domain' },
        },
      ],
      dependencies: [],
    };

    const byPath = new Map([
      [
        'src/foo.ts',
        metrics({
          path: 'src/foo.ts',
          complexity: 15,
          churn: 4,
          hotspotScore: 0.7,
          classifications: ['hotspot'],
          coupledFiles: [{ path: 'src/bar.ts', score: 0.8, sharedCommits: 5 }],
        }),
      ],
    ]);

    const next = attachForensicsToSchema(schema, byPath);
    expect(next.nodes[0].forensics).toMatchObject({
      complexity: 15,
      churn: 4,
      hotspotScore: 0.7,
      classifications: ['hotspot'],
    });
    expect(next.nodes[1].forensics).toBeUndefined();
  });

  it('aggregates onto container nodes from matching components', () => {
    const components: SystemSchema = {
      name: 'Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'sys/svc/domain',
      nodes: [
        {
          entityRef: 'sys/svc/domain/foo',
          type: 'component',
          name: 'Foo',
          properties: { filepath: 'src/foo.ts', containerId: 'domain' },
          forensics: {
            complexity: 10,
            churn: 2,
            hotspotScore: 0.5,
            classifications: ['hotspot'],
            authorCount: 1,
          },
        },
      ],
      dependencies: [],
    };

    const containers: SystemSchema = {
      name: 'Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'sys/svc',
      nodes: [
        { entityRef: 'sys/svc/domain', type: 'container', name: 'domain' },
        { entityRef: 'sys/svc/other', type: 'container', name: 'other' },
      ],
      dependencies: [],
    };

    const withComponents = attachForensicsToSchema(components, new Map());
    // components already have forensics; attach with empty map keeps existing when joining by filepath miss — actually join overwrites only when match. Keep existing.

    const next = attachForensicsToSchema(containers, new Map(), {
      componentNodes: withComponents.nodes,
    });

    expect(next.nodes[0].forensics?.fileCount).toBe(1);
    expect(next.nodes[0].forensics?.hotspotCount).toBe(1);
    expect(next.nodes[1].forensics).toBeUndefined();
  });

  it('aggregates onto context system nodes from system components', () => {
    const context: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'sys',
      nodes: [
        {
          entityRef: 'sys/svc',
          type: 'software-system',
          name: 'svc',
          properties: { rootPath: 'packages/svc', role: 'subsystem' },
        },
      ],
      dependencies: [],
    };

    const componentNodes: SystemNode[] = [
      {
        entityRef: 'sys/svc/domain/foo',
        type: 'component',
        name: 'Foo',
        properties: { filepath: 'src/foo.ts', containerId: 'domain' },
        forensics: {
          complexity: 8,
          churn: 3,
          hotspotScore: 0.2,
          authorCount: 2,
          classifications: [],
        },
      },
    ];

    const next = attachForensicsToSchema(context, new Map(), { componentNodes });
    expect(next.nodes[0].forensics).toMatchObject({
      fileCount: 1,
      complexity: 8,
      churn: 3,
    });
  });

  it('normalizes backslashes in filepath joins', () => {
    const schema: SystemSchema = {
      name: 'Components',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'a/b/c',
          type: 'component',
          name: 'C',
          properties: { filepath: 'src\\win.ts' },
        },
      ],
      dependencies: [],
    };
    const byPath = new Map([
      ['src/win.ts', metrics({ path: 'src/win.ts', complexity: 3, churn: 1 })],
    ]);
    const next = attachForensicsToSchema(schema, byPath);
    expect(next.nodes[0].forensics?.complexity).toBe(3);
  });
});

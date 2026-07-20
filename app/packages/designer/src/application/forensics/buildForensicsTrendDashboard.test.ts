import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import {
  buildForensicsTrendDashboard,
  collectDescendantForensics,
} from './buildForensicsTrendDashboard';

const componentSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'Components',
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies: [],
});

describe('collectDescendantForensics', () => {
  it('collects components under a container by entityRef prefix and containerId', () => {
    const systems = [
      {
        path: 'app/cli-components.yaml',
        name: 'cli',
        schema: componentSchema([
          {
            entityRef: 'blueprint/app/cli/foo',
            type: 'component',
            name: 'Foo',
            properties: { containerId: 'cli' },
            forensics: { complexity: 5, authorCount: 1, churnByWeek: [1, 0] },
          },
          {
            entityRef: 'blueprint/app/other/bar',
            type: 'component',
            name: 'Bar',
            properties: { containerId: 'other' },
            forensics: { complexity: 2, authorCount: 2 },
          },
        ]),
      },
    ];

    const collected = collectDescendantForensics(systems, 'blueprint/app/cli', 'container');
    expect(collected).toHaveLength(1);
    expect(collected[0].complexity).toBe(5);
  });
});

describe('buildForensicsTrendDashboard', () => {
  it('builds component-level trends from direct forensics', () => {
    const dashboard = buildForensicsTrendDashboard(
      {
        complexity: 12,
        authorCount: 1,
        churnByWeek: [0, 2, 1],
      },
      [],
      'component'
    );

    expect(dashboard).toMatchObject({
      scope: 'component',
      churnByWeek: [0, 2, 1],
      authorBuckets: [1, 0, 0],
      complexityBuckets: [0, 0, 1, 0],
      fileCount: 1,
    });
  });

  it('rolls up descendant trends for containers', () => {
    const descendants = [
      { complexity: 4, authorCount: 1, churnByWeek: [1, 0, 1] },
      { complexity: 18, authorCount: 3, churnByWeek: [0, 2, 0] },
      { complexity: 30, authorCount: 5, churnByWeek: [1, 1, 0] },
    ];

    const dashboard = buildForensicsTrendDashboard(
      { fileCount: 3, churn: 6, sinceDays: 90 },
      descendants,
      'container'
    );

    expect(dashboard).toMatchObject({
      scope: 'rollup',
      churnByWeek: [2, 3, 1],
      authorBuckets: [1, 1, 1],
      complexityBuckets: [1, 0, 1, 1],
      fileCount: 3,
    });
  });

  it('returns undefined when there is no chartable data', () => {
    expect(buildForensicsTrendDashboard({}, [], 'component')).toBeUndefined();
  });
});

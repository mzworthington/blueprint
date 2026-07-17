import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@blueprint/core';
import { rankForensicsOffenders, resolveLookbackDays } from './rankOffenders';

const componentSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'Designer Components',
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies: [],
});

const containerSchema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'App Containers',
  version: '1.0.0',
  level: 'container',
  nodes,
  dependencies: [],
});

describe('rankForensicsOffenders', () => {
  it('ranks component hotspots by score and classification', () => {
    const systems = [
      {
        path: 'designer-components.yaml',
        name: 'designer',
        schema: componentSchema([
          {
            entityRef: 'app/designer/ok',
            name: 'OK',
            type: 'component',
            forensics: { hotspotScore: 0.1, complexity: 2, churn: 1, classifications: [] },
          },
          {
            entityRef: 'app/designer/db',
            name: 'DB',
            type: 'component',
            properties: { containerId: 'designer' },
            forensics: {
              hotspotScore: 0.9,
              complexity: 40,
              churn: 8,
              authorCount: 2,
              classifications: ['hotspot'],
              sinceDays: 90,
            },
          },
          {
            entityRef: 'app/designer/mid',
            name: 'Mid',
            type: 'component',
            forensics: {
              hotspotScore: 0.55,
              complexity: 12,
              churn: 3,
              classifications: [],
              sinceDays: 90,
            },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    expect(ranked.map(r => r.entityRef)).toEqual([
      'app/designer/db',
      'app/designer/mid',
      'app/designer/ok',
    ]);
    expect(ranked[0].parentLabel).toBe('designer');
    expect(ranked[0].concern.level).toBe('danger');
  });

  it('filters hotspots and silos', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/hot',
            name: 'Hot',
            type: 'component',
            forensics: {
              hotspotScore: 0.8,
              classifications: ['hotspot'],
            },
          },
          {
            entityRef: 'a/silo',
            name: 'Silo',
            type: 'component',
            forensics: {
              hotspotScore: 0.2,
              complexity: 20,
              authorCount: 1,
              classifications: ['knowledge-silo'],
            },
          },
        ]),
      },
    ];

    expect(rankForensicsOffenders(systems, 'components', 'hotspots')).toHaveLength(1);
    expect(rankForensicsOffenders(systems, 'components', 'hotspots')[0].entityRef).toBe('a/hot');
    expect(rankForensicsOffenders(systems, 'components', 'silos')[0].entityRef).toBe('a/silo');
  });

  it('includes dependency count as structural context on ranked rows', () => {
    const systems = [
      {
        path: 'c.yaml',
        name: 'c',
        schema: componentSchema([
          {
            entityRef: 'a/ext',
            name: 'Ext',
            type: 'component',
            external: true,
            forensics: { hotspotScore: 0.6, classifications: ['hotspot'] },
          },
          {
            entityRef: 'a/test',
            name: 'Test',
            type: 'component',
            isTest: true,
            forensics: { hotspotScore: 0.2, complexity: 3, classifications: [] },
          },
          {
            entityRef: 'a/plain',
            name: 'Plain',
            type: 'component',
            forensics: { hotspotScore: 0.1, classifications: [] },
          },
        ]),
      },
    ];
    systems[0].schema.dependencies = [
      { from: 'a/ext', to: 'a/test', type: 'direct-call' },
      { from: 'a/plain', to: 'a/ext', type: 'direct-call' },
    ];

    const ranked = rankForensicsOffenders(systems, 'components', 'all');
    expect(ranked.find(r => r.entityRef === 'a/ext')?.dependencyCount).toBe(2);
    expect(ranked.find(r => r.entityRef === 'a/test')?.dependencyCount).toBe(1);
    expect(ranked.find(r => r.entityRef === 'a/plain')?.dependencyCount).toBe(1);
  });

  it('ranks container rollups and ignores component diagrams in containers scope', () => {
    const systems = [
      {
        path: 'containers.yaml',
        name: 'containers',
        schema: containerSchema([
          {
            entityRef: 'app/cli',
            name: 'CLI',
            type: 'container',
            forensics: {
              hotspotScore: 0.4,
              hotspotCount: 3,
              knowledgeSiloCount: 1,
              classifications: [],
              sinceDays: 120,
            },
          },
          {
            entityRef: 'app/designer',
            name: 'Designer',
            type: 'container',
            forensics: {
              hotspotScore: 0.7,
              hotspotCount: 5,
              knowledgeSiloCount: 0,
              classifications: ['hotspot'],
              sinceDays: 90,
            },
          },
        ]),
      },
      {
        path: 'comps.yaml',
        name: 'comps',
        schema: componentSchema([
          {
            entityRef: 'app/designer/db',
            name: 'DB',
            type: 'component',
            forensics: { hotspotScore: 0.99, classifications: ['hotspot'] },
          },
        ]),
      },
    ];

    const ranked = rankForensicsOffenders(systems, 'containers', 'all');
    expect(ranked).toHaveLength(2);
    expect(ranked[0].entityRef).toBe('app/designer');
    expect(resolveLookbackDays(ranked)).toBe(120);
  });
});

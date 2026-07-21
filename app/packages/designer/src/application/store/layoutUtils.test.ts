import { describe, expect, it } from 'vitest';
import {
  mapDomainDepToRFEdge,
  mapDomainDepsToRFEdges,
  mapDomainNodeToRFNode,
  mapDomainNodesToRFNodes,
  rebuildSchemaFromCanvas,
  getAbsoluteNodePosition,
  shouldAutoLayoutOnLoad,
} from './layoutUtils.ts';
import type { SystemNode } from '@blueprint/core';

describe('layoutUtils forensics plumbing', () => {
  it('maps node forensics onto RF node data', () => {
    const domain: SystemNode = {
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
      properties: { filepath: 'src/a.ts' },
      forensics: {
        complexity: 20,
        churn: 5,
        hotspotScore: 0.9,
        classifications: ['hotspot'],
      },
    };

    const rf = mapDomainNodeToRFNode(domain);
    expect(rf.data.forensics).toEqual(domain.forensics);
  });

  it('preserves forensics when rebuilding schema from canvas', () => {
    const rf = mapDomainNodeToRFNode({
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
      x: 10,
      y: 20,
      forensics: {
        complexity: 12,
        authorCount: 1,
        classifications: ['knowledge-silo'],
      },
    });

    const schema = rebuildSchemaFromCanvas('S', '1.0.0', 'component', [rf], [], 'sys/svc');
    expect(schema.nodes[0]?.forensics).toEqual({
      complexity: 12,
      authorCount: 1,
      classifications: ['knowledge-silo'],
    });
  });

  it('preserves git source provenance when rebuilding schema from canvas', () => {
    const rf = mapDomainNodeToRFNode({
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
    });

    const schema = rebuildSchemaFromCanvas('S', '1.0.0', 'component', [rf], [], 'sys/svc', {
      remoteUrl: 'https://github.com/org/repo',
      scannedAtCommit: 'abc123',
    });
    expect(schema.source).toEqual({
      remoteUrl: 'https://github.com/org/repo',
      scannedAtCommit: 'abc123',
    });
  });
});

describe('mapDomainNodesToRFNodes', () => {
  it('maps group parents and nested children with parentId', () => {
    const rfNodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', x: 100, y: 100 },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        x: 48,
        y: 48,
      },
    ]);

    const group = rfNodes.find(n => n.id === 'ctx/hub');
    const child = rfNodes.find(n => n.id === 'ctx/child');
    expect(group?.type).toBe('blueprintGroup');
    expect(group?.style).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(child?.parentId).toBe('ctx/hub');
    expect(child?.position).toEqual({ x: 48, y: 88 });
    expect(child?.extent).toBe('parent');
  });

  it('round-trips parentEntityRef through rebuildSchemaFromCanvas', () => {
    const rfNodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', x: 0, y: 0 },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        x: 10,
        y: 20,
      },
    ]);

    const schema = rebuildSchemaFromCanvas('Context', '1.0.0', 'context', rfNodes, [], 'ctx');
    expect(schema.nodes.find(n => n.entityRef === 'ctx/child')?.parentEntityRef).toBe('ctx/hub');
    expect(schema.nodes.find(n => n.entityRef === 'ctx/hub')?.type).toBe('group');
  });
});

describe('getAbsoluteNodePosition', () => {
  it('accumulates parent offsets for nested nodes', () => {
    const nodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', x: 100, y: 50 },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        x: 48,
        y: 48,
      },
    ]);
    const child = nodes.find(n => n.id === 'ctx/child')!;
    const byId = new Map(nodes.map(n => [n.id, n]));
    expect(getAbsoluteNodePosition(child, byId)).toEqual({ x: 148, y: 138 });
  });
});

describe('shouldAutoLayoutOnLoad', () => {
  it('skips auto layout when any node has saved coordinates', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          { entityRef: 'ctx/hub', type: 'group', name: 'Hub', x: 0, y: 0 },
          {
            entityRef: 'ctx/child',
            type: 'software-system',
            name: 'Child',
            parentEntityRef: 'ctx/hub',
            x: 48,
            y: 48,
          },
        ],
        dependencies: [],
      })
    ).toBe(false);
  });

  it('runs auto layout for grouped context when coordinates are absent', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
          {
            entityRef: 'ctx/child',
            type: 'software-system',
            name: 'Child',
            parentEntityRef: 'ctx/hub',
          },
        ],
        dependencies: [],
      })
    ).toBe(true);
  });

  it('runs auto layout when nodes are missing coordinates', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Containers',
        version: '1.0.0',
        level: 'container',
        nodes: [{ entityRef: 'app/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      })
    ).toBe(true);
  });
});

describe('mapDomainDepsToRFEdges', () => {
  it('drops duplicate from→to edges that would share a React key', () => {
    const dep = {
      from: 'a',
      to: 'b',
      type: 'direct-call' as const,
      description: 'once',
    };
    const edges = mapDomainDepsToRFEdges([dep, { ...dep, description: 'again' }, dep]);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe(mapDomainDepToRFEdge(dep).id);
    expect(edges[0]?.data?.description).toBe('once');
  });
});

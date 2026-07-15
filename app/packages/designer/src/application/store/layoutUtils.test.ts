import { describe, expect, it } from 'vitest';
import { mapDomainNodeToRFNode, rebuildSchemaFromCanvas } from './layoutUtils.ts';
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
});

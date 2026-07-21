import { describe, expect, it } from 'vitest';
import type { SystemNode } from '../models/schema';
import { flattenWireNodes, nestContextWireNodes, shouldNestContextNodes } from './nodeWireFormat';

const cleanForensics = (f: NonNullable<SystemNode['forensics']>) => ({ ...f });

describe('nodeWireFormat', () => {
  it('flattens nested children under group nodes', () => {
    const flat = flattenWireNodes([
      {
        entityRef: 'ctx/hub',
        type: 'group',
        name: 'Hub',
        children: [
          { entityRef: 'ctx/a', type: 'software-system', name: 'A' },
          { entityRef: 'ctx/b', type: 'software-system', name: 'B' },
        ],
      },
      { entityRef: 'ctx/user', type: 'person', name: 'User' },
    ]);

    expect(flat).toHaveLength(4);
    expect(flat.find(n => n.entityRef === 'ctx/a')?.parentEntityRef).toBe('ctx/hub');
    expect(flat.find(n => n.entityRef === 'ctx/user')?.parentEntityRef).toBeUndefined();
  });

  it('passes through flat parentEntityRef wire nodes', () => {
    const flat = flattenWireNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
      {
        entityRef: 'ctx/a',
        type: 'software-system',
        name: 'A',
        parentEntityRef: 'ctx/hub',
      },
    ]);

    expect(flat).toHaveLength(2);
    expect(flat[1]?.parentEntityRef).toBe('ctx/hub');
  });

  it('rejects children on non-group nodes', () => {
    expect(() =>
      flattenWireNodes([
        {
          entityRef: 'ctx/bad',
          type: 'software-system',
          name: 'Bad',
          children: [{ entityRef: 'ctx/x', type: 'software-system', name: 'X' }],
        },
      ])
    ).toThrow(/only allowed on group/);
  });

  it('nests context group children for YAML output', () => {
    const nodes: SystemNode[] = [
      { entityRef: 'ctx/user', type: 'person', name: 'User' },
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
      {
        entityRef: 'ctx/a',
        type: 'software-system',
        name: 'A',
        parentEntityRef: 'ctx/hub',
      },
    ];

    const wire = nestContextWireNodes(nodes, cleanForensics);
    expect(wire).toHaveLength(2);
    const hub = wire.find(n => n.entityRef === 'ctx/hub');
    expect(hub?.children).toEqual([{ entityRef: 'ctx/a', type: 'software-system', name: 'A' }]);
    expect(wire.some(n => n.entityRef === 'ctx/a')).toBe(false);
  });

  it('only nests for context level', () => {
    expect(shouldNestContextNodes('context')).toBe(true);
    expect(shouldNestContextNodes('container')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { partitionLayoutComponents } from './partitionLayoutComponents';

const nodes = (ids: string[]) => ids.map(id => ({ id, width: 100, height: 50 }));
const edges = (pairs: Array<[string, string]>) =>
  pairs.map(([source, target], index) => ({ id: `e${index}`, source, target }));

describe('partitionLayoutComponents', () => {
  it('splits disconnected subgraphs', () => {
    const components = partitionLayoutComponents(
      nodes(['a', 'b', 'c', 'd']),
      edges([
        ['a', 'b'],
        ['c', 'd'],
      ])
    );

    expect(components).toHaveLength(2);
    expect([...components[0]!.nodeIds].sort()).toEqual(['a', 'b']);
    expect([...components[1]!.nodeIds].sort()).toEqual(['c', 'd']);
  });
});

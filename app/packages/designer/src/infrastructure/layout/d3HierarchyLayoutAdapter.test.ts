import { describe, expect, it } from 'vitest';
import { D3HierarchyLayoutAdapter } from './d3HierarchyLayoutAdapter';

const sized = (ids: string[]) => ids.map(id => ({ id, width: 280, height: 120 }));
const links = (pairs: Array<[string, string]>) =>
  pairs.map(([source, target], i) => ({ id: `e${i}`, source, target }));

describe('D3HierarchyLayoutAdapter', () => {
  it('places tree children below the root', async () => {
    const adapter = new D3HierarchyLayoutAdapter();
    const positions = await adapter.computeLayout(
      sized(['root', 'left', 'right']),
      links([
        ['root', 'left'],
        ['root', 'right'],
      ])
    );

    expect(positions.size).toBe(3);
    expect(positions.get('root')!.y).toBeLessThan(positions.get('left')!.y);
    expect(positions.get('root')!.y).toBeLessThan(positions.get('right')!.y);
  });
});

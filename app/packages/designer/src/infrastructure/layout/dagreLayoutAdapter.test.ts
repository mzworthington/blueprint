import { describe, expect, it } from 'vitest';
import { DagreLayoutAdapter } from './dagreLayoutAdapter';

const sized = (ids: string[]) => ids.map(id => ({ id, width: 280, height: 120 }));
const links = (pairs: Array<[string, string]>) =>
  pairs.map(([source, target], i) => ({ id: `e${i}`, source, target }));

describe('DagreLayoutAdapter', () => {
  it('places a chain top-to-bottom', async () => {
    const adapter = new DagreLayoutAdapter();
    const positions = await adapter.computeLayout(
      sized(['a', 'b', 'c']),
      links([
        ['a', 'b'],
        ['b', 'c'],
      ])
    );

    expect(positions.size).toBe(3);
    expect(positions.get('a')!.y).toBeLessThan(positions.get('c')!.y);
  });

  it('centers a hub node above its children', async () => {
    const adapter = new DagreLayoutAdapter();
    const children = ['a', 'b', 'c', 'd', 'e'];
    const positions = await adapter.computeLayout(
      sized(['user', ...children]),
      links(children.map(child => ['user', child] as [string, string]))
    );

    const user = positions.get('user')!;
    const childXs = children.map(id => positions.get(id)!.x + 140);
    const childCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    expect(user.x + 140).toBeCloseTo(childCenter, 0);
  });
});

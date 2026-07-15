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
});

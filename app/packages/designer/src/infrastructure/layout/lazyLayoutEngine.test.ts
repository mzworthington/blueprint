import { describe, it, expect, vi } from 'vitest';
import type { LayoutEnginePort } from '../../core';
import { lazyLayoutEngine } from './lazyLayoutEngine';

describe('lazyLayoutEngine', () => {
  it('does not call the loader until computeLayout runs', async () => {
    const computeLayout = vi.fn(async () => new Map([['a', { x: 1, y: 2 }]]));
    const load = vi.fn(async (): Promise<LayoutEnginePort> => ({ computeLayout }));

    const engine = lazyLayoutEngine(load);
    expect(load).not.toHaveBeenCalled();

    const result = await engine.computeLayout([{ id: 'a', width: 10, height: 10 }], []);

    expect(load).toHaveBeenCalledOnce();
    expect(computeLayout).toHaveBeenCalledOnce();
    expect(result.get('a')).toEqual({ x: 1, y: 2 });
  });

  it('reuses the loaded adapter on subsequent calls', async () => {
    const computeLayout = vi.fn(async () => new Map());
    const load = vi.fn(async (): Promise<LayoutEnginePort> => ({ computeLayout }));

    const engine = lazyLayoutEngine(load);
    await engine.computeLayout([], []);
    await engine.computeLayout([], []);

    expect(load).toHaveBeenCalledOnce();
    expect(computeLayout).toHaveBeenCalledTimes(2);
  });
});

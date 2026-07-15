import { describe, expect, it, vi } from 'vitest';
import type { LayoutEnginePort, LayoutRegistryPort } from '../../core';
import { computeClientLayout } from './computeClientLayout';
import { shouldUseGrid } from './gridFallback';

const nodes = (ids: string[]) => ids.map(id => ({ id }));
const edges = (pairs: Array<[string, string]>) =>
  pairs.map(([source, target], i) => ({
    id: `e${i}`,
    source,
    target,
  }));

function fakeEngine(
  impl: LayoutEnginePort['computeLayout'] = async nodes =>
    new Map(nodes.map((n, i) => [n.id, { x: i * 10, y: i * 100 }]))
): LayoutEnginePort {
  return { computeLayout: vi.fn(impl) };
}

function registryWith(engine: LayoutEnginePort): LayoutRegistryPort {
  return {
    get: id => (id === 'dagre' ? engine : undefined),
  };
}

describe('shouldUseGrid', () => {
  it('uses grid for empty edge sets', () => {
    expect(shouldUseGrid(5, 0)).toBe(true);
  });

  it('uses an engine when edges are dense enough', () => {
    expect(shouldUseGrid(5, 3)).toBe(false);
  });
});

describe('computeClientLayout', () => {
  it('normalizes missing sizes and delegates to the registry engine', async () => {
    const engine = fakeEngine();
    const positions = await computeClientLayout(
      'dagre',
      nodes(['a', 'b', 'c']),
      edges([
        ['a', 'b'],
        ['b', 'c'],
      ]),
      registryWith(engine)
    );

    expect(engine.computeLayout).toHaveBeenCalledOnce();
    const [layoutNodes, layoutEdges] = vi.mocked(engine.computeLayout).mock.calls[0];
    expect(layoutNodes[0]).toMatchObject({ id: 'a', width: 280, height: 120 });
    expect(layoutEdges).toHaveLength(2);
    expect(positions.get('b')).toEqual({ x: 10, y: 100 });
  });

  it('uses measured dimensions when present', async () => {
    const engine = fakeEngine();
    await computeClientLayout(
      'dagre',
      [
        { id: 'a', measured: { width: 300, height: 140 } },
        { id: 'b', measured: { width: 300, height: 140 } },
      ],
      edges([['a', 'b']]),
      registryWith(engine)
    );

    const [layoutNodes] = vi.mocked(engine.computeLayout).mock.calls[0];
    expect(layoutNodes[0]).toMatchObject({ width: 300, height: 140 });
  });

  it('applies grid policy without calling the engine when sparse', async () => {
    const engine = fakeEngine();
    const positions = await computeClientLayout(
      'dagre',
      nodes(['z', 'a', 'm']),
      [],
      registryWith(engine)
    );

    expect(engine.computeLayout).not.toHaveBeenCalled();
    expect(positions.get('a')).toEqual({ x: 40, y: 40 });
  });

  it('falls back to grid when the registry has no engine', async () => {
    const positions = await computeClientLayout('elk', nodes(['a', 'b']), edges([['a', 'b']]), {
      get: () => undefined,
    });

    expect(positions.size).toBe(2);
    expect(positions.get('a')).toEqual({ x: 40, y: 40 });
  });
});

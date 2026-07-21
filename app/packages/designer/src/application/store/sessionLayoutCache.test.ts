import { describe, expect, it } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from './layoutUtils';
import {
  clearSessionLayout,
  getSessionLayout,
  hasSessionLayout,
  schemaLayoutFingerprint,
  setSessionLayout,
} from './sessionLayoutCache';

const node = (id: string): BlueprintRFNode =>
  ({
    id,
    type: 'blueprintNode',
    position: { x: 10, y: 20 },
    data: { name: id, type: 'rest-api', entityRef: id },
  }) as BlueprintRFNode;

const edge = (id: string): BlueprintRFEdge =>
  ({
    id,
    source: 'a',
    target: 'b',
  }) as BlueprintRFEdge;

const schema = (refs: string[]) => ({
  name: 'Test',
  version: '1.0.0',
  level: 'container' as const,
  nodes: refs.map(ref => ({ entityRef: ref, type: 'rest-api' as const, name: ref })),
  dependencies: [],
});

describe('sessionLayoutCache', () => {
  it('stores and retrieves layouts by file path and schema fingerprint', () => {
    clearSessionLayout();
    const fingerprint = schemaLayoutFingerprint(schema(['a', 'b']));
    setSessionLayout('context.yaml', fingerprint, [node('a')], [edge('e1')]);
    expect(hasSessionLayout('context.yaml', fingerprint)).toBe(true);
    const cached = getSessionLayout('context.yaml', fingerprint);
    expect(cached?.nodes[0]?.position).toEqual({ x: 10, y: 20 });
  });

  it('misses when the schema fingerprint changes', () => {
    clearSessionLayout();
    const first = schemaLayoutFingerprint(schema(['a']));
    setSessionLayout('context.yaml', first, [node('a')], []);
    const second = schemaLayoutFingerprint(schema(['a', 'b']));
    expect(hasSessionLayout('context.yaml', second)).toBe(false);
  });
});

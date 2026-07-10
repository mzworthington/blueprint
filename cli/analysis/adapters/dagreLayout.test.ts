import { describe, it, expect } from 'vitest';
import { DagreLayoutAdapter } from './dagreLayout.ts';
import type { SystemNode, SystemDependency } from '../../../src/domain/schema.ts';

describe('DagreLayoutAdapter', () => {
  const adapter = new DagreLayoutAdapter();

  it('should compute node coordinates successfully', async () => {
    const nodes: SystemNode[] = [
      { id: 'nodeA', name: 'Node A', type: 'component' },
      { id: 'nodeB', name: 'Node B', type: 'component' },
    ];
    const dependencies: SystemDependency[] = [{ from: 'nodeA', to: 'nodeB', type: 'direct-call' }];

    const result = await adapter.computeLayout(nodes, dependencies);

    expect(result).toHaveLength(2);
    const nodeA = result.find(n => n.id === 'nodeA')!;
    const nodeB = result.find(n => n.id === 'nodeB')!;

    expect(nodeA.x).toBeDefined();
    expect(nodeA.y).toBeDefined();
    expect(nodeB.x).toBeDefined();
    expect(nodeB.y).toBeDefined();
  });

  it('should use different configurations for container-level systems', async () => {
    const nodes: SystemNode[] = [
      { id: 'domain-logic', name: 'Domain Logic', type: 'microservice' },
      { id: 'frontend-ui', name: 'Frontend UI', type: 'web-app' },
    ];
    const dependencies: SystemDependency[] = [];

    const result = await adapter.computeLayout(nodes, dependencies);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBeDefined();
  });
});

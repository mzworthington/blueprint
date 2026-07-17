import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  buildWorkspaceEntityIndex,
  listExternalCandidates,
  materializeExternalNodes,
  suggestExternalDependencies,
  computeExternalNodePositions,
} from './workspaceExternals';

const containerSchema: SystemSchema = {
  name: 'Cli Containers',
  version: '1.0.0',
  level: 'container',
  entityRef: 'blueprint/cli',
  nodes: [
    { entityRef: 'blueprint/cli/vhs', type: 'container', name: 'Vhs Service' },
    { entityRef: 'blueprint/cli/analysis', type: 'container', name: 'Analysis Service' },
    { entityRef: 'blueprint/cli/writers', type: 'container', name: 'Writers Service' },
  ],
  dependencies: [
    { from: 'blueprint/cli/vhs', to: 'blueprint/cli/analysis', type: 'inter-container' },
    { from: 'blueprint/cli/writers', to: 'blueprint/cli/vhs', type: 'inter-container' },
  ],
};

const vhsComponents: SystemSchema = {
  name: 'Vhs Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'blueprint/cli/vhs',
  nodes: [
    {
      entityRef: 'blueprint/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service',
    },
  ],
  dependencies: [],
};

const writersComponents: SystemSchema = {
  name: 'Writers Components',
  version: '1.0.0',
  level: 'component',
  entityRef: 'blueprint/cli/writers',
  nodes: [
    {
      entityRef: 'blueprint/cli/writers/context-level-writer',
      type: 'background-worker',
      name: 'Context Level Writer',
    },
  ],
  dependencies: [
    {
      from: 'blueprint/cli/writers/context-level-writer',
      to: 'blueprint/cli/vhs/cli-demo-test',
      type: 'direct-call',
    },
  ],
};

const loadedSystems = [
  { path: 'containers.yaml', name: 'Containers', schema: containerSchema },
  { path: 'vhs-components.yaml', name: 'Vhs', schema: vhsComponents },
  { path: 'writers-components.yaml', name: 'Writers', schema: writersComponents },
];

describe('workspaceExternals', () => {
  describe('buildWorkspaceEntityIndex', () => {
    it('indexes every node across workspace schemas', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      expect(index.byRef.get('blueprint/cli/analysis')).toMatchObject({
        name: 'Analysis Service',
        sourceSchemaLevel: 'container',
        sourcePath: 'containers.yaml',
      });
      expect(index.byRef.get('blueprint/cli/writers/context-level-writer')).toMatchObject({
        sourceSchemaLevel: 'component',
        sourcePath: 'writers-components.yaml',
      });
    });
  });

  describe('listExternalCandidates', () => {
    it('lists sibling containers and cross-container components for a component diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const candidates = listExternalCandidates(vhsComponents, index, {});

      const refs = candidates.map(c => c.entityRef);
      expect(refs).toContain('blueprint/cli/analysis');
      expect(refs).toContain('blueprint/cli/writers/context-level-writer');
      expect(refs).not.toContain('blueprint/cli/vhs/cli-demo-test');
      expect(refs).not.toContain('blueprint/cli/vhs');
    });

    it('lists cross-container components on container diagrams', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const active: SystemSchema = {
        ...containerSchema,
        nodes: [containerSchema.nodes[0]],
      };
      const candidates = listExternalCandidates(active, index, {});
      const refs = candidates.map(c => c.entityRef);
      expect(refs).toContain('blueprint/cli/writers/context-level-writer');
      expect(refs).not.toContain('blueprint/cli/vhs');
    });

    it('filters by source schema level', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const containersOnly = listExternalCandidates(vhsComponents, index, {
        sourceSchemaLevels: ['container'],
      });
      expect(containersOnly.every(c => c.sourceSchemaLevel === 'container')).toBe(true);
      expect(containersOnly.map(c => c.entityRef)).toContain('blueprint/cli/analysis');

      const componentsOnly = listExternalCandidates(vhsComponents, index, {
        sourceSchemaLevels: ['component'],
      });
      expect(componentsOnly.every(c => c.sourceSchemaLevel === 'component')).toBe(true);
      expect(componentsOnly.map(c => c.entityRef)).toContain(
        'blueprint/cli/writers/context-level-writer'
      );
    });

    it('filters by node type and search text', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const filtered = listExternalCandidates(vhsComponents, index, {
        types: ['background-worker'],
        search: 'writer',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].entityRef).toBe('blueprint/cli/writers/context-level-writer');
    });

    it('excludes entities already on the active diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const active: SystemSchema = {
        ...vhsComponents,
        nodes: [
          ...vhsComponents.nodes,
          {
            entityRef: 'blueprint/cli/analysis',
            type: 'container',
            name: 'Analysis Service (External)',
            external: true,
          },
        ],
      };
      const candidates = listExternalCandidates(active, index, {});
      expect(candidates.map(c => c.entityRef)).not.toContain('blueprint/cli/analysis');
    });
  });

  describe('materializeExternalNodes', () => {
    it('creates external proxy nodes with canonical refs and layout positions', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const entity = index.byRef.get('blueprint/cli/analysis')!;
      const [node] = materializeExternalNodes([entity], [{ x: 200, y: 300 }]);

      expect(node).toMatchObject({
        entityRef: 'blueprint/cli/analysis',
        type: 'container',
        external: true,
        x: 200,
        y: 300,
      });
      expect(node.name).toContain('Analysis Service');
      expect(node.name).toContain('External');
    });
  });

  describe('suggestExternalDependencies', () => {
    it('suggests related containers from parent container diagram', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(vhsComponents, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain('blueprint/cli/analysis');
    });

    it('suggests cross-container components referenced from other diagrams', () => {
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(vhsComponents, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain(
        'blueprint/cli/writers/context-level-writer'
      );
    });

    it('suggests unresolved dependency endpoints in the active schema', () => {
      const active: SystemSchema = {
        ...vhsComponents,
        dependencies: [
          {
            from: 'blueprint/cli/vhs/cli-demo-test',
            to: 'blueprint/cli/analysis',
            type: 'direct-call',
          },
        ],
      };
      const index = buildWorkspaceEntityIndex(loadedSystems);
      const suggested = suggestExternalDependencies(active, loadedSystems, index);
      expect(suggested.map(s => s.entityRef)).toContain('blueprint/cli/analysis');
    });
  });

  describe('computeExternalNodePositions', () => {
    it('returns non-overlapping grid positions', () => {
      const positions = computeExternalNodePositions(3, [{ x: 100, y: 100 }]);
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ x: 280, y: 100 });
    });
  });
});

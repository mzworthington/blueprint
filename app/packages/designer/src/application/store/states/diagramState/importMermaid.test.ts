import { describe, it, expect } from 'vitest';
import { previewMermaidImport } from './importMermaid';
import type { SystemSchema } from '@blueprint/core';

const baseSchema: SystemSchema = {
  name: 'Test Workspace',
  version: '1.0.0',
  level: 'container',
  entityRef: 'test-workspace',
  nodes: [
    { entityRef: 'test-workspace/gateway', type: 'rest-api', name: 'Gateway', x: 0, y: 0 },
    { entityRef: 'test-workspace/auth', type: 'grpc-service', name: 'Auth', x: 100, y: 100 },
  ],
  dependencies: [
    { from: 'test-workspace/gateway', to: 'test-workspace/auth', type: 'direct-call' },
  ],
};

describe('previewMermaidImport', () => {
  it('returns parse result and merge plan for new nodes', () => {
    const mermaid = `graph TD
      Cache[("Redis Cache")]
      Gateway --> Cache`;

    const preview = previewMermaidImport(mermaid, {
      baseSchema,
      loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
      currentFilePath: 'blueprint.yaml',
      workspaceName: 'Test Workspace',
      isWorkspaceOpen: true,
    });

    expect(preview.parseResult.format).toBe('flowchart');
    expect(preview.mergePlan.additions.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect } from 'vitest';
import { previewIacImport } from './importIac';
import type { SystemSchema } from '@blueprint/core';

const baseSchema: SystemSchema = {
  name: 'Test Workspace',
  version: '1.0.0',
  level: 'container',
  entityRef: 'test-workspace',
  nodes: [{ entityRef: 'test-workspace/gateway', type: 'rest-api', name: 'Gateway', x: 0, y: 0 }],
  dependencies: [],
};

describe('previewIacImport', () => {
  it('returns parse result and merge plan for terraform resources', () => {
    const preview = previewIacImport(
      [
        {
          path: 'main.tf',
          content: 'resource "aws_lambda_function" "api" { function_name = "api" }',
        },
      ],
      {
        baseSchema,
        loadedSystems: [{ path: 'blueprint.yaml', name: 'Test Workspace', schema: baseSchema }],
        currentFilePath: 'blueprint.yaml',
        workspaceName: 'Test Workspace',
        isWorkspaceOpen: true,
      }
    );

    expect(preview.parseResult.vendor).toBe('terraform');
    expect(preview.mergePlan.additions.nodes.length).toBeGreaterThanOrEqual(1);
  });
});

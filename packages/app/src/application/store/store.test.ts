import { describe, it, expect } from 'vitest';
import {
  resolveRelativePath,
  defaultInitialSchema,
  defaultWorkspaceManifest,
  defaultWorkspaceManifestYaml,
} from './store';

describe('Default Initial Schema & Hierarchical C4 Linking', () => {
  it('should verify initial default workspace structure', () => {
    expect(defaultInitialSchema).toBeDefined();
    expect(defaultInitialSchema.name).toBeDefined();
    expect(defaultInitialSchema.nodes).toBeDefined();
  });
});

describe('Blueprint Store Integration Helper Actions', () => {
  it('should resolve relative path correctly', () => {
    expect(resolveRelativePath('blueprint.yaml', './web/container.yaml')).toBe(
      'web/container.yaml'
    );
    expect(resolveRelativePath('services/auth/components.yaml', '../billing/container.yaml')).toBe(
      'services/billing/container.yaml'
    );
  });

  it('should initialize with default workspace manifest values on startup', () => {
    expect(defaultWorkspaceManifest).not.toBeNull();
    expect(defaultWorkspaceManifest?.name).toBeDefined();
    expect(defaultWorkspaceManifestYaml).toContain(`name: ${defaultWorkspaceManifest?.name}`);
  });
});

import { describe, it, expect } from 'vitest';
import {
  resolveRelativePath,
  getClosestManifest,
  resolveWorkspaceManifestState,
  getFileName,
} from './path';
import type { WorkspaceManifest } from './schema';

describe('Domain Path Utilities', () => {
  describe('resolveRelativePath', () => {
    it('should resolve standard relative files in same folder', () => {
      expect(resolveRelativePath('blueprints/containers.yaml', './child.yaml')).toBe(
        'blueprints/child.yaml'
      );
    });

    it('should resolve subfolders correctly', () => {
      expect(resolveRelativePath('blueprints/containers.yaml', './sub/child.yaml')).toBe(
        'blueprints/sub/child.yaml'
      );
    });

    it('should traverse up directories using ..', () => {
      expect(
        resolveRelativePath('blueprints/eshop/containers.yaml', '../blueprint/child.yaml')
      ).toBe('blueprints/blueprint/child.yaml');
    });

    it('should return absolute path if input is absolute or web url', () => {
      expect(resolveRelativePath('blueprints/containers.yaml', '/absolute/path')).toBe(
        '/absolute/path'
      );
      expect(resolveRelativePath('blueprints/containers.yaml', 'http://example.com/file')).toBe(
        'http://example.com/file'
      );
    });
  });

  describe('getClosestManifest', () => {
    const mockManifests: Array<{ path: string; manifest: WorkspaceManifest; yaml: string }> = [
      {
        path: 'blueprints/blueprint/workspace.yaml',
        manifest: { name: 'Blueprint Workspace', root: './containers.yaml', hierarchy: [] },
        yaml: 'name: Blueprint Workspace',
      },
      {
        path: 'blueprints/eshop/workspace.yaml',
        manifest: { name: 'EShop Workspace', root: './containers.yaml', hierarchy: [] },
        yaml: 'name: EShop Workspace',
      },
    ];

    it('should return null if empty manifests array provided', () => {
      expect(getClosestManifest('blueprints/eshop/containers.yaml', [])).toBeNull();
    });

    it('should match closest folder prefix in subfolder manifest paths', () => {
      const match = getClosestManifest('blueprints/eshop/containers.yaml', mockManifests);
      expect(match).not.toBeNull();
      expect(match?.manifest.name).toBe('EShop Workspace');
    });

    it('should match closest parent when deep nesting', () => {
      const match = getClosestManifest(
        'blueprints/blueprint/sub/child/components.yaml',
        mockManifests
      );
      expect(match).not.toBeNull();
      expect(match?.manifest.name).toBe('Blueprint Workspace');
    });
  });

  describe('resolveWorkspaceManifestState', () => {
    const mockManifests: Array<{ path: string; manifest: WorkspaceManifest; yaml: string }> = [
      {
        path: 'blueprints/eshop/workspace.yaml',
        manifest: { name: 'EShop Workspace', root: './containers.yaml', hierarchy: [] },
        yaml: 'name: EShop Workspace',
      },
    ];

    it('should return populated manifest state if match exists', () => {
      const state = resolveWorkspaceManifestState(
        'blueprints/eshop/components.yaml',
        mockManifests
      );
      expect(state.workspaceManifest).not.toBeNull();
      expect(state.workspaceManifestPath).toBe('blueprints/eshop/workspace.yaml');
      expect(state.workspaceManifestYaml).toBe('name: EShop Workspace');
    });

    it('should return nulls if no matching manifest is found', () => {
      const state = resolveWorkspaceManifestState(
        'blueprints/other/components.yaml',
        mockManifests
      );
      expect(state.workspaceManifest).toBeNull();
      expect(state.workspaceManifestPath).toBeNull();
      expect(state.workspaceManifestYaml).toBeNull();
    });
  });

  describe('getFileName', () => {
    it('should extract filename correctly from paths', () => {
      expect(getFileName('blueprints/eshop/containers.yaml')).toBe('containers.yaml');
      expect(getFileName('containers.yaml')).toBe('containers.yaml');
    });
  });
});

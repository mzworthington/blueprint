import { describe, it, expect } from 'vitest';
import { resolveRelativePath, getFileName } from './path';

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

  describe('getFileName', () => {
    it('should extract filename correctly from paths', () => {
      expect(getFileName('blueprints/eshop/containers.yaml')).toBe('containers.yaml');
      expect(getFileName('containers.yaml')).toBe('containers.yaml');
    });
  });
});

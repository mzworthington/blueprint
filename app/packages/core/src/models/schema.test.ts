import { describe, it, expect } from 'vitest';
import {
  EntityRef,
  slugify,
  type SystemSchema,
  type SystemNode,
  type SystemDependency,
} from './schema';

describe('slugify Helper Utility', () => {
  it('should transform spaces to hyphens and drop special characters', () => {
    expect(slugify('My Super API!')).toBe('my-super-api');
    expect(slugify('order---service')).toBe('order-service');
    expect(slugify('  Trim Me Now  ')).toBe('trim-me-now');
  });
});

describe('EntityRef Utilities with Unified Parsing', () => {
  describe('parse()', () => {
    it('should correctly parse and slugify a root context reference when parent is not provided', () => {
      expect(EntityRef.parse('My Context')).toBe('my-context');
    });

    it('should correctly parse, slugify, and nest under parent reference when parent is provided', () => {
      const parent = EntityRef.parse('My Context');
      const containerRef = EntityRef.parse('Core API', parent);
      expect(containerRef).toBe('my-context/core-api');

      const componentRef = EntityRef.parse('Auth Component', containerRef);
      expect(componentRef).toBe('my-context/core-api/auth-component');
    });

    it('should throw an error if the value input is missing or empty', () => {
      expect(() => EntityRef.parse('')).toThrowError(/Value is required/);
      expect(() => EntityRef.parse('   ')).toThrowError(/Value is required/);
    });
  });

  describe('getLevel()', () => {
    it('should resolve C4 levels perfectly from slugified outputs', () => {
      expect(EntityRef.getLevel('e-commerce')).toBe('context');
      expect(EntityRef.getLevel('e-commerce/order-api')).toBe('container');
      expect(EntityRef.getLevel('e-commerce/order-api/order-processor')).toBe('component');
      expect(EntityRef.getLevel('e-commerce/order-api/order-processor/validate-method')).toBe(
        'code'
      );
    });

    it('should throw an error if evaluated path exceeds 4 segments or has no segments', () => {
      expect(() => EntityRef.getLevel('')).toThrowError(/Invalid EntityRef structure layout/);
      expect(() => EntityRef.getLevel('one/two/three/four/five')).toThrowError(
        /Invalid EntityRef structure layout/
      );
    });
  });

  describe('leaf()', () => {
    it('should correctly retrieve the last segment from an EntityRef', () => {
      expect(EntityRef.leaf('my-context/my-system/frontend-ui')).toBe('frontend-ui');
      expect(EntityRef.leaf('my-context')).toBe('my-context');
      expect(EntityRef.leaf('')).toBe('');
    });
  });
});

describe('End-to-End Schema Validation Test', () => {
  it('should naturally flow slugified strings through integrated dependency configurations', () => {
    const systemContext = 'My System Context';
    const contextRef = EntityRef.parse(systemContext);

    // Asserting system node properties compile cleanly with slugified references
    const apiRef = EntityRef.parse('Core Gateway', contextRef);
    const cacheRef = EntityRef.parse('Redis Cache', contextRef);

    const node1: SystemNode = {
      entityRef: apiRef,
      type: 'gateway-api',
      name: 'Core Gateway',
    };

    const node2: SystemNode = {
      entityRef: cacheRef,
      type: 'cache-store',
      name: 'Redis Cache',
    };

    const dependency: SystemDependency = {
      from: apiRef,
      to: cacheRef,
      type: 'direct-call',
      description: 'Reads user fast state profiles',
    };

    const schema: SystemSchema = {
      entityRef: contextRef,
      name: 'E2E Testing System',
      version: '1.0.0',
      level: 'container',
      nodes: [node1, node2],
      dependencies: [dependency],
    };

    expect(schema.entityRef).toBe('my-system-context');
    expect(schema.dependencies[0].from).toBe('my-system-context/core-gateway');
    expect(schema.dependencies[0].to).toBe('my-system-context/redis-cache');
  });
});

import { describe, it, expect } from 'vitest';
import {
  getSystemIdFromPath,
  getFileSlug,
  resolveWorkspaceEntityRefs,
  isEntityRef,
  getSchemaEntityRef,
} from './entityRef';
import type { SystemSchema } from '../models/schema';

describe('entityRef Rules', () => {
  describe('isEntityRef', () => {
    it('should identify valid entity references and filter out file paths', () => {
      expect(isEntityRef('backstage/catalog')).toBe(true);
      expect(isEntityRef('eshop/eshop-ordering')).toBe(true);
      expect(isEntityRef('./catalog-components.yaml')).toBe(false);
      expect(isEntityRef('../containers.yaml')).toBe(false);
      expect(isEntityRef('/usr/local/bin')).toBe(false);
      expect(isEntityRef(undefined)).toBe(false);
    });
  });

  describe('getSchemaEntityRef', () => {
    it('should return parentRef if it is component level and parentRef is entityRef', () => {
      const componentSchema: SystemSchema = {
        name: 'My Component',
        version: '1.0.0',
        level: 'component',
        parentRef: 'backstage/catalog',
        nodes: [],
        dependencies: [],
      };
      expect(
        getSchemaEntityRef(componentSchema, 'blueprints/backstage/catalog-components.yaml')
      ).toBe('backstage/catalog');
    });

    it('should return systemId from path for non-component levels', () => {
      const containerSchema: SystemSchema = {
        name: 'Containers',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      };
      expect(getSchemaEntityRef(containerSchema, 'blueprints/eshop/containers.yaml')).toBe('eshop');
    });

    it('should fallback to workspaceName or schema.name when systemId is default', () => {
      const schema: SystemSchema = {
        name: 'Test Project',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      };
      expect(getSchemaEntityRef(schema, 'blueprint.yaml', 'My Workspace')).toBe('my-workspace');
      expect(getSchemaEntityRef(schema, 'blueprint.yaml')).toBe('test-project');
    });
  });

  describe('getSystemIdFromPath', () => {
    it('should extract slugified system name after blueprints/ folder', () => {
      expect(getSystemIdFromPath('blueprints/backstage/catalog-components.yaml')).toBe('backstage');
      expect(getSystemIdFromPath('blueprints/e-shop/payment.yaml')).toBe('e-shop');
      expect(getSystemIdFromPath('/Users/dev/blueprints/web_app/api.yaml')).toBe('web-app');
    });

    it('should fallback to parent directory slug if blueprints is not in path', () => {
      expect(getSystemIdFromPath('my-project/api.yaml')).toBe('my-project');
      expect(getSystemIdFromPath('api.yaml')).toBe('default');
    });
  });

  describe('getFileSlug', () => {
    it('should strip component yaml extension and components suffix', () => {
      expect(getFileSlug('catalog-components.yaml')).toBe('catalog');
      expect(getFileSlug('plugins/search-backend-node/test-utils.yaml')).toBe('test-utils');
      expect(getFileSlug('blueprints/backstage/app_tsx-components.yml')).toBe('app-tsx');
    });
  });

  describe('resolveWorkspaceEntityRefs', () => {
    it('should correctly resolve FQN references across container and component hierarchies', () => {
      // 1. Container-level schema
      const containerSchema: SystemSchema = {
        name: 'Backstage - Container Level',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            id: 'catalog',
            type: 'background-worker',
            name: 'Catalog Service',
            c4Ref: './catalog-components.yaml',
          },
          {
            id: 'search',
            type: 'background-worker',
            name: 'Search Service',
            c4Ref: './search-components.yaml',
          },
        ],
        dependencies: [],
      };

      // 2. Component-level schema for Catalog (referenced via c4Ref)
      const catalogSchema: SystemSchema = {
        name: 'Backstage - catalog Components',
        version: '1.0.0',
        level: 'component',
        nodes: [
          {
            id: 'immediateentityprovider',
            type: 'rest-api',
            name: 'ImmediateEntityProvider REST Endpoint',
          },
          { id: 'catalogclient', type: 'background-worker', name: 'CatalogClient service' },
        ],
        dependencies: [
          { from: 'catalogclient', to: 'immediateentityprovider', type: 'direct-call' },
        ],
      };

      // 3. Loose/Orphan component-level schema (not referenced by any container node)
      const orphanSchema: SystemSchema = {
        name: 'Orphan Components',
        version: '1.0.0',
        level: 'component',
        nodes: [{ id: 'helper', type: 'background-worker', name: 'Helper service' }],
        dependencies: [
          { from: 'helper', to: 'catalogclient', type: 'direct-call' }, // external dep
        ],
      };

      const workspaceFiles = [
        { path: 'blueprints/backstage/containers.yaml', schema: containerSchema },
        { path: 'blueprints/backstage/catalog-components.yaml', schema: catalogSchema },
        { path: 'blueprints/backstage/orphan-components.yaml', schema: orphanSchema },
      ];

      const result = resolveWorkspaceEntityRefs(workspaceFiles);

      // Verify node FQN mappings
      const catalogNodes = result.schemas['blueprints/backstage/catalog-components.yaml'].nodes;
      expect(catalogNodes[0].entityRef).toBe('backstage/catalog/immediateentityprovider');
      expect(catalogNodes[1].entityRef).toBe('backstage/catalog/catalogclient');

      const containerNodes = result.schemas['blueprints/backstage/containers.yaml'].nodes;
      expect(containerNodes[0].entityRef).toBe('backstage/catalog');
      expect(containerNodes[1].entityRef).toBe('backstage/search');

      const orphanNodes = result.schemas['blueprints/backstage/orphan-components.yaml'].nodes;
      expect(orphanNodes[0].entityRef).toBe('backstage/orphan/helper'); // fallback based on file slug

      // Verify node FQN lookup map
      expect(
        result.nodeRefMap['blueprints/backstage/catalog-components.yaml']['catalogclient']
      ).toBe('backstage/catalog/catalogclient');
      expect(result.nodeRefMap['blueprints/backstage/orphan-components.yaml']['helper']).toBe(
        'backstage/orphan/helper'
      );
    });

    it('should correctly resolve FQN references using parentRef entityRef linkage', () => {
      // 1. Container-level schema
      const containerSchema: SystemSchema = {
        name: 'Backstage - Container Level',
        version: '1.0.0',
        level: 'container',
        nodes: [
          { id: 'catalog', type: 'background-worker', name: 'Catalog Service' },
          { id: 'search', type: 'background-worker', name: 'Search Service' },
        ],
        dependencies: [],
      };

      // 2. Component-level schema for Catalog (linked via parentRef entityRef)
      const catalogSchema: SystemSchema = {
        name: 'Backstage - catalog Components',
        version: '1.0.0',
        level: 'component',
        parentRef: 'backstage/catalog',
        nodes: [
          {
            id: 'immediateentityprovider',
            type: 'rest-api',
            name: 'ImmediateEntityProvider REST Endpoint',
          },
          { id: 'catalogclient', type: 'background-worker', name: 'CatalogClient service' },
        ],
        dependencies: [
          { from: 'catalogclient', to: 'immediateentityprovider', type: 'direct-call' },
        ],
      };

      const workspaceFiles = [
        { path: 'blueprints/backstage/containers.yaml', schema: containerSchema },
        { path: 'blueprints/backstage/catalog-components.yaml', schema: catalogSchema },
      ];

      const result = resolveWorkspaceEntityRefs(workspaceFiles);

      // Verify node FQN mappings
      const catalogNodes = result.schemas['blueprints/backstage/catalog-components.yaml'].nodes;
      expect(catalogNodes[0].entityRef).toBe('backstage/catalog/immediateentityprovider');
      expect(catalogNodes[1].entityRef).toBe('backstage/catalog/catalogclient');

      const containerNodes = result.schemas['blueprints/backstage/containers.yaml'].nodes;
      expect(containerNodes[0].entityRef).toBe('backstage/catalog');
      expect(containerNodes[1].entityRef).toBe('backstage/search');
    });
  });
});

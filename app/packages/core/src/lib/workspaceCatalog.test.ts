import { describe, it, expect } from 'vitest';
import { buildWorkspaceCatalog, resolveEntityHome } from './workspaceCatalog';
import type { SystemSchema } from '../models/schema';

describe('workspaceCatalog', () => {
  it('derives entityRef from schema name when missing', () => {
    const orphan: SystemSchema = {
      name: 'Orphan System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([{ path: 'orphan.yaml', schema: orphan }]);
    expect(catalog[0]?.entityRef).toBe('orphan-system');
  });

  describe('resolveEntityHome', () => {
    const context: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [{ entityRef: 'billing', type: 'software-system', name: 'Billing' }],
      dependencies: [],
    };
    const containers: SystemSchema = {
      name: 'Billing Containers',
      version: '1.0.0',
      level: 'container',
      entityRef: 'billing',
      nodes: [{ entityRef: 'billing/api', type: 'microservice', name: 'API' }],
      dependencies: [],
    };
    const catalog = buildWorkspaceCatalog([
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ]);

    it('returns the diagram entry when entityRef is a diagram identity', () => {
      expect(resolveEntityHome(catalog, 'billing')?.path).toBe('containers.yaml');
    });

    it('returns the owning diagram when entityRef is a native node', () => {
      expect(resolveEntityHome(catalog, 'billing/api')?.path).toBe('containers.yaml');
    });

    it('returns undefined when entityRef is not in the workspace', () => {
      expect(resolveEntityHome(catalog, 'missing/service')).toBeUndefined();
      expect(resolveEntityHome(catalog, '')).toBeUndefined();
    });

    it('ignores external proxy nodes when resolving the canonical home diagram', () => {
      const notifications: SystemSchema = {
        name: 'Notifications Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'blueprint/plugins/notifications',
        nodes: [
          {
            entityRef: 'blueprint/plugins/techdocs-react/api',
            type: 'component',
            name: 'api Service (External)',
            external: true,
          },
        ],
        dependencies: [],
      };
      const techdocs: SystemSchema = {
        name: 'Techdocs Components',
        version: '1.0.0',
        level: 'component',
        entityRef: 'blueprint/plugins/techdocs-react',
        nodes: [
          {
            entityRef: 'blueprint/plugins/techdocs-react/api',
            type: 'component',
            name: 'api Service',
          },
        ],
        dependencies: [],
      };

      const proxyCatalog = buildWorkspaceCatalog([
        { path: 'plugins/notifications-components.yaml', schema: notifications },
        { path: 'plugins/techdocs-react-components.yaml', schema: techdocs },
      ]);

      expect(resolveEntityHome(proxyCatalog, 'blueprint/plugins/techdocs-react/api')?.path).toBe(
        'plugins/techdocs-react-components.yaml'
      );
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChildLevelExternalsDialog } from './ChildLevelExternalsDialog';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('ChildLevelExternalsDialog', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [{ entityRef: 'billing', type: 'software-system', name: 'Billing' }],
      dependencies: [],
    });

    useBlueprintStore.setState({
      childExternalsParentRef: 'billing',
      workspaceCatalog: [
        {
          path: 'containers.yaml',
          name: 'Billing Containers',
          level: 'container',
          entityRef: 'billing',
          nodeEntityRefs: ['billing/legacy'],
        },
      ],
      loadedSystems: [
        {
          path: 'containers.yaml',
          name: 'Billing Containers',
          schema: {
            name: 'Billing Containers',
            version: '1.0.0',
            level: 'container',
            entityRef: 'billing',
            nodes: [
              {
                entityRef: 'billing/legacy',
                type: 'microservice',
                name: 'Legacy API',
                external: true,
              },
            ],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('lists child externals without changing the active diagram', () => {
    render(<ChildLevelExternalsDialog />);

    expect(screen.getByTestId('child-level-externals-dialog')).toBeInTheDocument();
    expect(screen.getByText('Externals on Billing')).toBeInTheDocument();
    expect(screen.getByText('Legacy API')).toBeInTheDocument();
    expect(useBlueprintStore.getState().schema.level).toBe('context');
  });

  it('closes on Escape', () => {
    render(<ChildLevelExternalsDialog />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useBlueprintStore.getState().childExternalsParentRef).toBeNull();
  });

  it('closes when navigating to a canonical external entity', () => {
    useBlueprintStore.setState({
      workspaceCatalog: [
        {
          path: 'containers.yaml',
          name: 'Billing Containers',
          level: 'container',
          entityRef: 'billing',
          nodeEntityRefs: ['billing/legacy', 'billing/api'],
        },
        {
          path: 'api.yaml',
          name: 'API',
          level: 'component',
          entityRef: 'billing/api',
          nodeEntityRefs: [],
        },
      ],
    });

    render(<ChildLevelExternalsDialog />);
    fireEvent.click(screen.getByTestId('go-to-external-billing/legacy'));

    expect(useBlueprintStore.getState().childExternalsParentRef).toBeNull();
  });
});

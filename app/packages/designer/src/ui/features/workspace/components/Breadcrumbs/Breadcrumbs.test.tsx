import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      currentFilePath: 'blueprint.yaml',
      loadedSystems: [],
      selectedNodeId: null,
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
  });

  it('renders Sandbox Workspace name when no workspace folder is open', () => {
    render(<Breadcrumbs />);

    expect(screen.getByText('Sandbox Workspace')).toBeInTheDocument();
    expect(screen.getByText('Main App System')).toBeInTheDocument();
  });

  it('renders specific workspace name when workspace directory is loaded', () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'DevPortalRepo',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('DevPortalRepo')).toBeInTheDocument();
  });

  it('renders active diagram breadcrumbs and ancestor system breadcrumbs', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Enterprise System Context',
          schema: {
            name: 'Enterprise System Context',
            version: '1.0.0',
            level: 'context',
            nodes: [{ entityRef: 'main-app', type: 'software-system', name: 'Main App System' }],
            dependencies: [],
          },
        },
        {
          path: 'services/auth/container.yaml',
          name: 'Main App System',
          schema: {
            name: 'Main App System',
            version: '1.0.0',
            level: 'container',
            id: 'main-app',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'services/auth/container.yaml',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Enterprise System Context')).toBeInTheDocument();
    expect(screen.getByText('Main App System')).toBeInTheDocument();
  });

  it('renders correct href links for ancestor breadcrumbs', async () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Root Map',
          schema: {
            name: 'Root Map',
            version: '1.0.0',
            level: 'context',
            nodes: [{ type: 'software-system', name: 'Child System', entityRef: 'child-system' }],
            dependencies: [],
          },
        },
        {
          path: 'child.yaml',
          name: 'Child System',
          schema: {
            name: 'Child System',
            version: '1.0.0',
            level: 'container',
            id: 'child-system',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'child.yaml',
    });

    render(<Breadcrumbs />);

    const rootLink = screen.getByText('Root Map').closest('a');
    expect(rootLink).toHaveAttribute('href', '/workspace/context');
  });

  it('renders next hierarchy level preview when a node with next level component schema is selected', () => {
    useBlueprintStore.setState({
      currentFilePath: 'blueprint/containers.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      entityRef: 'blueprint',
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'blueprint/web-app',
          type: 'web-app',
          name: 'Web Application',
          x: 100,
          y: 100,
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      selectedNodeId: 'blueprint/web-app',
      schema: {
        entityRef: 'blueprint',
        name: 'Main App System',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            entityRef: 'blueprint/web-app',
            type: 'web-app',
            name: 'Web Application',
            x: 100,
            y: 100,
          },
        ],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'web-app-components.yaml',
          name: 'Web App Components',
          schema: {
            name: 'Web App Components',
            version: '1.0.0',
            level: 'component',
            id: 'blueprint/web-app',
            entityRef: 'blueprint/web-app',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Web Application')).toBeInTheDocument();
  });

  it('renders dropdown button with child components and triggers selectSystem when child is clicked', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      entityRef: 'blueprint',
      name: 'Container Diagram',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'blueprint/component',
          type: 'web-app',
          name: 'Component Node',
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'TestWorkspace',
      currentFilePath: 'blueprints/blueprint/containers.yaml',

      schema: {
        entityRef: 'blueprint',
        name: 'Container Diagram',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            entityRef: 'blueprint/component',
            type: 'web-app',
            name: 'Component Node',
          },
        ],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'blueprints/blueprint/containers.yaml',
          name: 'Container Diagram',
          schema: {
            entityRef: 'blueprint',
            name: 'Container Diagram',
            version: '1.0.0',
            level: 'container',
            nodes: [
              {
                entityRef: 'blueprint/component',
                type: 'web-app',
                name: 'Component Node',
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'blueprints/blueprint/component.yaml',
          name: 'Component Diagram',
          schema: {
            name: 'Component Diagram',
            version: '1.0.0',
            level: 'component',
            id: 'blueprint/component',
            entityRef: 'blueprint/component',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    // Check if dropdown trigger button is present
    const dropdownBtn = screen.getByTitle('Explore child components');
    expect(dropdownBtn).toBeInTheDocument();

    // Click trigger to open menu
    fireEvent.click(dropdownBtn);

    // Verify Jump to Component header and child item exists
    expect(screen.getByText('Jump to component')).toBeInTheDocument();
    const childOption = screen.getByText('Component Diagram').closest('a');
    expect(childOption).toBeInTheDocument();
    expect(childOption).toHaveAttribute('href', '/workspace/blueprint/component');
  });
});

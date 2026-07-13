import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      navigationStack: [],
      currentFilePath: 'blueprint.yaml',
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

  it('renders active diagram breadcrumbs and historical navigation stack', () => {
    useBlueprintStore.setState({
      navigationStack: [
        {
          path: 'blueprint.yaml',
          schema: {
            name: 'Enterprise System Context',
            version: '1.0.0',
            level: 'context',
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

  it('triggers zoomOut store action when an ancestor breadcrumb is clicked', async () => {
    useBlueprintStore.setState({
      navigationStack: [
        {
          path: 'blueprint.yaml',
          schema: {
            name: 'Root Map',
            version: '1.0.0',
            level: 'context',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'child.yaml',
    });

    render(<Breadcrumbs />);

    const rootBreadcrumbBtn = screen.getByText('Root Map');
    fireEvent.click(rootBreadcrumbBtn);

    expect(useBlueprintStore.getState().currentFilePath).toBe('blueprint.yaml');
    expect(useBlueprintStore.getState().navigationStack).toHaveLength(0);
  });

  it('renders next hierarchy level preview when a node with next level component schema is selected', () => {
    useBlueprintStore.setState({
      currentFilePath: 'blueprint/containers.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          id: 'web-app',
          type: 'web-app',
          name: 'Web Application',
          entityRef: 'blueprint/web-app',
          x: 100,
          y: 100,
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      selectedNodeId: 'web-app',
      loadedSystems: [
        {
          path: 'web-app-components.yaml',
          name: 'Web App Components',
          schema: {
            name: 'Web App Components',
            version: '1.0.0',
            level: 'component',
            parentRef: 'blueprint/web-app',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Web Application')).toBeInTheDocument();
  });

  it('reconstructs breadcrumbs hierarchy using parentRef entityRef linkage when navigationStack is empty', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Component Diagram',
      version: '1.0.0',
      level: 'component',
      parentRef: 'blueprint/component',
      nodes: [],
      dependencies: [],
    });

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'TestWorkspace',
      currentFilePath: 'blueprints/blueprint/component.yaml',
      navigationStack: [],
      loadedSystems: [
        {
          path: 'blueprints/blueprint/containers.yaml',
          name: 'Container Diagram',
          schema: {
            name: 'Container Diagram',
            version: '1.0.0',
            level: 'container',
            nodes: [
              {
                id: 'component',
                type: 'web-app',
                name: 'Component Node',
                entityRef: 'blueprint/component',
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
            parentRef: 'blueprint/component',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Container Diagram')).toBeInTheDocument();
    expect(screen.getByText('Component Diagram')).toBeInTheDocument();
  });

  it('renders dropdown button with child components and triggers selectSystem when child is clicked', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Container Diagram',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          id: 'component',
          type: 'web-app',
          name: 'Component Node',
          entityRef: 'blueprint/component',
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'TestWorkspace',
      currentFilePath: 'blueprints/blueprint/containers.yaml',
      navigationStack: [],
      loadedSystems: [
        {
          path: 'blueprints/blueprint/containers.yaml',
          name: 'Container Diagram',
          schema: {
            name: 'Container Diagram',
            version: '1.0.0',
            level: 'container',
            nodes: [
              {
                id: 'component',
                type: 'web-app',
                name: 'Component Node',
                entityRef: 'blueprint/component',
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
            parentRef: 'blueprint/component',
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
    const childOption = screen.getByText('Component Diagram');
    expect(childOption).toBeInTheDocument();

    // Click child option
    fireEvent.click(childOption);

    // Verify selectSystem is called
    expect(useBlueprintStore.getState().currentFilePath).toBe(
      'blueprints/blueprint/component.yaml'
    );
  });
});

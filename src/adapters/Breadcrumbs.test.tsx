import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Breadcrumbs } from './Breadcrumbs';
import { useBlueprintStore } from './store';

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    // Reset store state before each test
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
    expect(screen.getByText('Level: Container')).toBeInTheDocument();
  });

  it('renders specific workspace name when workspace directory is loaded', () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'DevPortalRepo',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('DevPortalRepo')).toBeInTheDocument();
  });

  it('renders custom C4 level indicators (e.g. Context, Component)', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'System Context Map',
      version: '1.0.0',
      level: 'context',
      nodes: [],
      dependencies: [],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Level: Context')).toBeInTheDocument();
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

    // Verifying both levels in path are rendered
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

    // Verify it popped history and set path back to parent/root
    expect(useBlueprintStore.getState().currentFilePath).toBe('blueprint.yaml');
    expect(useBlueprintStore.getState().navigationStack).toHaveLength(0);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { AppProvider } from './application/context/AppContext';
import { useBlueprintStore } from './application/store/store';

vi.mock('./ui/features/workspace/components/Searchbar/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

vi.mock('./ui/features/workspace/components/Canvas/Canvas', () => ({
  Canvas: () => <div data-testid="canvas-mock">Canvas Mock</div>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
  useReactFlow: () => ({
    getNode: vi.fn(),
    setCenter: vi.fn(),
  }),
}));

function renderApp() {
  return render(
    <AppProvider>
      <App />
    </AppProvider>
  );
}

describe('App Layout and Collapsible Panels', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/workspace',
      search: '',
      href: 'http://localhost/workspace',
    } as any;

    useBlueprintStore.setState({
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      leftCollapsed: true,
      rightCollapsed: true,
      schema: {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'blueprint.yaml',
          name: 'Empty Workspace',
          schema: {
            name: 'Empty Workspace',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('should have panels hidden by default and support toggling them', () => {
    renderApp();

    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(leftToggle).toBeInTheDocument();
    expect(rightToggle).toBeInTheDocument();

    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(false);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);

    fireEvent.click(leftToggle);
    expect(useBlueprintStore.getState().leftCollapsed).toBe(true);

    fireEvent.click(rightToggle);
    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });

  it('should synchronize window URL pathname to /workspace/[slug] based on workspaceName or schema.name', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/workspace',
      search: '',
      href: 'http://localhost/workspace',
    } as any;

    const spyReplaceState = vi.spyOn(window.history, 'replaceState');

    useBlueprintStore.setState({ workspaceName: 'My Super Cool Workspace', isWorkspaceOpen: true });

    renderApp();

    expect(spyReplaceState).toHaveBeenCalledWith(null, '', '/workspace/my-super-cool-workspace');

    window.location = originalLocation as any;
    spyReplaceState.mockRestore();
  });

  it('should switch systems in store when popstate event fires with a different slug', async () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/workspace/initial-system',
      search: '',
      href: 'http://localhost/workspace/initial-system',
    } as any;

    useBlueprintStore.setState({
      currentFilePath: 'initial.yaml',
      workspaceName: undefined,
      schema: {
        name: 'Initial System',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'initial.yaml',
          name: 'Initial System',
          schema: {
            name: 'Initial System',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
        {
          path: 'target.yaml',
          name: 'Target System',
          schema: {
            name: 'Target System',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    const spySelectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');

    renderApp();

    // Simulate navigating back/forward to target-system
    (window.location as any).pathname = '/workspace/target-system';

    const popStateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popStateEvent);

    await waitFor(() => {
      expect(spySelectSystem).toHaveBeenCalledWith('target.yaml');
    });

    window.location = originalLocation as any;
    spySelectSystem.mockRestore();
  });
});

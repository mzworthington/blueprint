import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useBlueprintStore } from './store/store';

describe('App Layout and Collapsible Panels', () => {
  it('should have panels hidden by default and support toggling them', () => {
    useBlueprintStore.setState({ leftCollapsed: true, rightCollapsed: true });

    render(<App />);

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
      pathname: '/',
      search: '',
      href: 'http://localhost/',
    } as any;

    const spyReplaceState = vi.spyOn(window.history, 'replaceState');

    useBlueprintStore.setState({ workspaceName: 'My Super Cool Workspace' });

    render(<App />);

    expect(spyReplaceState).toHaveBeenCalledWith({}, '', '/workspace/my-super-cool-workspace');

    window.location = originalLocation as any;
    spyReplaceState.mockRestore();
  });

  it('should switch systems in store when popstate event fires with a different slug', () => {
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
      workspaceName: 'Initial System',
      schema: {
        name: 'Initial System',
        version: '1.0.0',
        level: 'context',
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
            level: 'context',
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
            level: 'context',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    const spySelectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');

    render(<App />);

    // Simulate navigating back/forward to target-system
    (window.location as any).pathname = '/workspace/target-system';

    const popStateEvent = new PopStateEvent('popstate');
    window.dispatchEvent(popStateEvent);

    expect(spySelectSystem).toHaveBeenCalledWith('target.yaml');

    window.location = originalLocation as any;
    spySelectSystem.mockRestore();
  });
});

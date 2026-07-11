import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspacePage } from './WorkspacePage';
import { useBlueprintStore } from '../../../application/store/store';

let mockLocation = '/';
const mockSetLocation = vi.fn(newLoc => {
  mockLocation = newLoc;
});
let mockMatch = true;
let mockParams: any = { slug: 'my-system' };

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useRoute: () => [mockMatch, mockParams],
}));

vi.mock('../../components/CodeViewer', () => ({
  CodeViewer: () => <div data-testid="code-viewer">CodeViewer</div>,
}));

vi.mock('../../components/Canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}));

vi.mock('../../components/PropertyPanel', () => ({
  PropertyPanel: () => <div data-testid="property-panel">PropertyPanel</div>,
}));

vi.mock('../../components/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReactFlow: () => ({
    getNode: vi.fn(),
    setCenter: vi.fn(),
  }),
}));

describe('WorkspacePage Component', () => {
  beforeEach(() => {
    mockLocation = '/';
    mockMatch = true;
    mockParams = { slug: 'my-system' };
    mockSetLocation.mockClear();

    useBlueprintStore.setState({
      leftCollapsed: true,
      rightCollapsed: true,
      workspaceName: 'Initial Name',
      currentFilePath: 'initial.yaml',
      schema: {
        name: 'Initial Name',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'initial.yaml',
          name: 'Initial Name',
          schema: {
            name: 'Initial Name',
            version: '1.0.0',
            level: 'context',
            nodes: [],
            dependencies: [],
          },
        },
        {
          path: 'target.yaml',
          name: 'My System',
          schema: {
            name: 'My System',
            version: '1.0.0',
            level: 'context',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('should render CodeViewer, Canvas, and PropertyPanel', () => {
    render(<WorkspacePage />);

    expect(screen.getByTestId('code-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('property-panel')).toBeInTheDocument();
  });

  it('should support expanding and collapsing left and right side panels', () => {
    render(<WorkspacePage />);

    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');

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

  it('should synchronize workspace system selection from URL params', () => {
    mockMatch = true;
    mockParams = { slug: 'my-system' };

    const spySelectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');

    render(<WorkspacePage />);

    expect(spySelectSystem).toHaveBeenCalledWith('target.yaml');
    spySelectSystem.mockRestore();
  });

  it('should redirect route to slugified workspace name if on a workspace route and path mismatches', () => {
    mockLocation = '/';
    useBlueprintStore.setState({ workspaceName: 'Awesome Redirect System' });

    render(<WorkspacePage />);

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/awesome-redirect-system', {
      replace: true,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspacePage } from './WorkspacePage';
import { useBlueprintStore } from '../../../application/store/store';

let mockLocation = '/';
const mockSetLocation = vi.fn(newLoc => {
  mockLocation = newLoc;
});
let mockMatch = true;
let mockParams: any = { '*': 'my-system' };

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useRoute: () => [mockMatch, mockParams],
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  Router: ({ children }: any) => <>{children}</>,
}));

vi.mock('./components/CodeViewer/CodeViewer', () => ({
  CodeViewer: () => <div data-testid="code-viewer">CodeViewer</div>,
}));

vi.mock('./components/Canvas/Canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}));

vi.mock('./components/PropertyPanel/PropertyPanel', () => ({
  PropertyPanel: () => <div data-testid="property-panel">PropertyPanel</div>,
}));

vi.mock('./components/Searchbar/Searchbar', () => ({
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
    mockParams = { '*': 'my-system' };
    mockSetLocation.mockClear();

    useBlueprintStore.setState({
      leftCollapsed: true,
      rightCollapsed: true,
      workspaceName: 'Initial Name',
      currentFilePath: 'initial.yaml',
      schema: {
        name: 'Initial Name',
        version: '1.0.0',
        level: 'container',
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
            level: 'container',
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
            level: 'container',
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

    // Desktop edge rails (always in the DOM; mobile uses MobilePanelToggles instead).
    const leftToggle = screen.getByLabelText('Toggle Left Panel');
    const rightToggle = screen.getByLabelText('Toggle Right Panel');
    expect(screen.getByLabelText('Open Schema Explorer')).toBeInTheDocument();
    expect(screen.getByLabelText('Open Properties Panel')).toBeInTheDocument();

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
    mockLocation = '/workspace/my-system';
    mockMatch = true;
    mockParams = { '*': 'my-system' };

    useBlueprintStore.setState({
      workspaceName: '', // clear workspaceName so getSchemaEntityRef matches my-system!
    });

    const spySelectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');

    render(<WorkspacePage />);

    expect(spySelectSystem).toHaveBeenCalledWith('target.yaml');
    spySelectSystem.mockRestore();
  });

  it('should redirect route to slugified workspace name if on a workspace route and path mismatches', () => {
    mockLocation = '/';
    mockMatch = false;
    mockParams = { '*': '' };
    useBlueprintStore.setState({ workspaceName: 'Awesome Redirect System', isWorkspaceOpen: true });

    render(<WorkspacePage />);

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/awesome-redirect-system', {
      replace: true,
    });
  });
});

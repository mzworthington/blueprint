import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlueprintNode } from './BlueprintNode';
import { useBlueprintStore } from '../../../../../application/store/store';
import { SubDiagramRefsContext } from './SubDiagramRefsContext';

const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/blueprint', mockSetLocation],
}));

vi.mock('@xyflow/react', () => {
  return {
    Handle: ({ type, position, id }: any) => (
      <div data-testid={`handle-${type}-${position}`} id={id} />
    ),
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
    useUpdateNodeInternals: () => vi.fn(),
  };
});

describe('BlueprintNode Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test Schema',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'test-node-1', type: 'microservice', name: 'My Service', x: 0, y: 0 }],
      dependencies: [],
    });
    useBlueprintStore.setState({ selectedNodeId: null, liteCanvas: false });
  });

  const defaultProps = {
    id: 'test-node-1',
    type: 'blueprintNode',
    data: {
      id: 'test-node-1',
      type: 'microservice',
      name: 'My Service',
      isTest: false,
      properties: {},
    },
    selected: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as any;

  it('renders correctly with basic node details', () => {
    render(<BlueprintNode {...defaultProps} />);

    expect(screen.getByText('My Service')).toBeInTheDocument();
    expect(screen.getByText('test-node-1')).toBeInTheDocument();
    expect(screen.getByText('Microservice')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-right')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('blueprint-node')).not.toHaveStyle({ backdropFilter: 'blur(8px)' });
  });

  it('simplifies chrome when liteCanvas is on but keeps all edge handles mounted', () => {
    useBlueprintStore.setState({ liteCanvas: true });
    render(<BlueprintNode {...defaultProps} />);

    expect(screen.getByTestId('blueprint-node-simplified')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-left')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-right')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
    expect(screen.queryByText('Microservice')).not.toBeInTheDocument();
  });

  it('keeps full chrome when zoomed out unless liteCanvas is on', () => {
    render(<BlueprintNode {...defaultProps} />);

    expect(screen.getByTestId('blueprint-node')).toBeInTheDocument();
    expect(screen.queryByTestId('blueprint-node-simplified')).not.toBeInTheDocument();
    expect(screen.getByText('Microservice')).toBeInTheDocument();
  });

  it('shows HOT and SILO badges for concerning forensics', () => {
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        forensics: {
          complexity: 20,
          authorCount: 1,
          hotspotScore: 0.9,
          classifications: ['hotspot', 'knowledge-silo'],
        },
      },
    };
    render(<BlueprintNode {...props} />);
    expect(screen.getByTestId('forensics-badge-hot')).toHaveTextContent('HOT');
    expect(screen.getByTestId('forensics-badge-silo')).toHaveTextContent('SILO');
  });

  it('shows COUPLED badge when couplingHighlight is set', () => {
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        couplingHighlight: true,
      },
    };
    render(<BlueprintNode {...props} />);
    expect(screen.getByTestId('forensics-badge-coupled')).toHaveTextContent('COUPLED');
  });

  it('exposes hotspot heat intensity for styling when heatmap is active', () => {
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        hotspotHeat: 0.85,
        forensics: { hotspotScore: 0.85 },
      },
    };
    render(<BlueprintNode {...props} />);
    const heat = screen.getByTestId('hotspot-heat');
    expect(heat).toHaveAttribute('data-hotspot-heat', '0.85');
  });

  it('does not mark heat when intensity is zero', () => {
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        hotspotHeat: 0,
        forensics: { hotspotScore: 0 },
      },
    };
    render(<BlueprintNode {...props} />);
    expect(screen.queryByTestId('hotspot-heat')).not.toBeInTheDocument();
  });

  it('truncates long entityRefs while exposing the full value in the title tooltip', () => {
    const longRef = 'blueprint/blueprint/designer/importschema';
    const props = {
      ...defaultProps,
      id: longRef,
      data: { ...defaultProps.data, id: longRef, entityRef: longRef },
    };
    render(<BlueprintNode {...props} />);

    const refEl = screen.getByTitle(longRef);
    expect(refEl).toBeInTheDocument();
    expect(refEl).toHaveTextContent(longRef);
    expect(refEl.className).toMatch(/truncate/);
  });

  it('triggers store selectNode when clicked', () => {
    render(<BlueprintNode {...defaultProps} />);

    fireEvent.click(screen.getByText('My Service'));

    expect(useBlueprintStore.getState().selectedNodeId).toBe('test-node-1');
  });

  it('renders TEST badge when node represents a test component', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, isTest: true },
    };
    render(<BlueprintNode {...props} />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('renders (External) indicator and styling when external is true', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, external: true },
    };
    const { container } = render(<BlueprintNode {...props} />);

    expect(screen.getByText('(External)')).toBeInTheDocument();
    const card = container.querySelector('.bg-cyan-950');
    expect(card).toBeTruthy();
  });

  it('shows Zoom indicator when node has a sub-diagram link in loadedSystems', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, entityRef: 'default/test-node-1' },
    };
    render(
      <SubDiagramRefsContext.Provider value={new Set(['default/test-node-1'])}>
        <BlueprintNode {...props} />
      </SubDiagramRefsContext.Provider>
    );

    expect(screen.getByText('Zoom')).toBeInTheDocument();
  });

  it('triggers navigation to node entityRef when Zoom button is clicked', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, entityRef: 'default/test-node-1' },
    };

    render(
      <SubDiagramRefsContext.Provider value={new Set(['default/test-node-1'])}>
        <BlueprintNode {...props} />
      </SubDiagramRefsContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /zoom/i }));

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/default/test-node-1');
  });
});

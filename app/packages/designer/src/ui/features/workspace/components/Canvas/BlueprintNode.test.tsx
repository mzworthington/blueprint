import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlueprintNode } from './BlueprintNode';
import { useBlueprintStore } from '../../../../../application/store/store';

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
    },
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
    useBlueprintStore.setState({ selectedNodeId: null });
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
  });

  it('triggers store selectNode when clicked', () => {
    render(<BlueprintNode {...defaultProps} />);

    fireEvent.click(screen.getByText('My Service'));

    expect(useBlueprintStore.getState().selectedNodeId).toBe('test-node-1');
  });

  it('shows delete button when selected is true and triggers deleteNode on click', () => {
    const props = { ...defaultProps, selected: true };
    render(<BlueprintNode {...props} />);

    const deleteBtn = screen.getByTitle('Delete component');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(useBlueprintStore.getState().schema.nodes).toHaveLength(0);
  });

  it('does not render delete button when selected is false', () => {
    render(<BlueprintNode {...defaultProps} />);
    expect(screen.queryByTitle('Delete component')).not.toBeInTheDocument();
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
    render(<BlueprintNode {...props} />);

    expect(screen.getByText('(External)')).toBeInTheDocument();
  });

  it('shows Zoom indicator when node has a sub-diagram link in loadedSystems', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'child.yaml',
          name: 'Child Level',
          schema: {
            name: 'Child Level',
            version: '1.0.0',
            level: 'component',
            id: 'default/test-node-1',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, entityRef: 'default/test-node-1' },
    };
    render(<BlueprintNode {...props} />);

    expect(screen.getByText('Zoom')).toBeInTheDocument();
  });

  it('triggers navigation to node entityRef when Zoom button is clicked', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'child.yaml',
          name: 'Child Level',
          schema: {
            name: 'Child Level',
            version: '1.0.0',
            level: 'component',
            id: 'default/test-node-1',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, entityRef: 'default/test-node-1' },
    };

    render(<BlueprintNode {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /zoom/i }));

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/default/test-node-1');
  });
});

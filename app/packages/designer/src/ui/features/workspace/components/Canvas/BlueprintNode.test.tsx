import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlueprintNode } from './BlueprintNode';
import { useBlueprintStore } from '../../../../../application/store/store';

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
      nodes: [{ id: 'test-node-1', type: 'microservice', name: 'My Service', x: 0, y: 0 }],
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

  it('shows Zoom indicator when node has a c4Ref sub-diagram link', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, c4Ref: './child.yaml' },
    };
    render(<BlueprintNode {...props} />);

    expect(screen.getByText('Zoom')).toBeInTheDocument();
  });

  it('triggers store zoomIntoNode when Zoom button is clicked', () => {
    const props = {
      ...defaultProps,
      data: { ...defaultProps.data, c4Ref: './child.yaml' },
    };
    const zoomSpy = vi
      .spyOn(useBlueprintStore.getState(), 'zoomIntoNode')
      .mockImplementation(async () => true);

    render(<BlueprintNode {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /zoom/i }));

    expect(zoomSpy).toHaveBeenCalledWith('test-node-1');
    zoomSpy.mockRestore();
  });
});

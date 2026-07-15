import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Searchbar } from './Searchbar';
import { useBlueprintStore } from '../../../../../application/store/store';

const mockGetNode = vi.fn().mockReturnValue({
  id: 'node-1',
  position: { x: 100, y: 200 },
  measured: { width: 100, height: 50 },
});
const mockSetCenter = vi.fn();

vi.mock('@xyflow/react', () => {
  return {
    useReactFlow: () => ({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
    }),
  };
});

describe('Searchbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Search Test App',
      version: '1.0.0',
      level: 'container',
      entityRef: 'cli',
      nodes: [
        { entityRef: 'node-1', name: 'Auth Controller', type: 'microservice' },
        { entityRef: 'node-2', name: 'Database Instance', type: 'database' },
        { entityRef: 'node-3', name: 'Test Gateway', type: 'gateway-api', isTest: true },
      ],
      dependencies: [],
    });
    useBlueprintStore.setState({
      showTests: false,
    });
  });

  it('renders search input with placeholder', () => {
    render(<Searchbar />);
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
  });

  it('filters and displays nodes matching search query', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    // Type query
    fireEvent.change(input, { target: { value: 'Auth' } });

    expect(screen.getByText('Auth Controller')).toBeInTheDocument();
    expect(screen.queryByText('Database Instance')).not.toBeInTheDocument();
  });

  it('respects showTests filtering state', () => {
    const { rerender } = render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    // Search test node when showTests is false
    fireEvent.change(input, { target: { value: 'Gateway' } });
    expect(screen.queryByText('Test Gateway')).not.toBeInTheDocument();

    // Set showTests to true
    useBlueprintStore.setState({ showTests: true });
    rerender(<Searchbar />);

    fireEvent.change(input, { target: { value: 'Gateway' } });
    expect(screen.getByText('Test Gateway')).toBeInTheDocument();
  });

  it('handles clearing search input', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });
    expect(screen.getByText('Auth Controller')).toBeInTheDocument();

    const clearButton = screen.getByTestId('search-clear-button');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
  });

  it('selects and centers node when dropdown item is clicked', () => {
    const selectNodeSpy = vi.spyOn(useBlueprintStore.getState(), 'selectNode');
    render(<Searchbar />);

    const input = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(input, { target: { value: 'Auth' } });

    const dropdownItem = screen.getByText('Auth Controller');
    fireEvent.click(dropdownItem);

    expect(selectNodeSpy).toHaveBeenCalledWith('cli/node-1');
    expect(mockGetNode).toHaveBeenCalledWith('cli/node-1');
    expect(mockSetCenter).toHaveBeenCalledWith(150, 225, { zoom: 1.15, duration: 800 });
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
  });

  it('navigates dropdown using arrow keys and selects with Enter', () => {
    const selectNodeSpy = vi.spyOn(useBlueprintStore.getState(), 'selectNode');
    render(<Searchbar />);

    const input = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(input, { target: { value: 'node' } }); // matches both node-1 and node-2

    // Press ArrowDown to highlight node-2 (index 1) since activeIndex starts at 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(selectNodeSpy).toHaveBeenCalledWith('cli/node-2');
    expect(mockGetNode).toHaveBeenCalledWith('cli/node-2');
  });

  it('closes dropdown when Escape key is pressed', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });
    expect(screen.getByText('Auth Controller')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemSelector } from './SystemSelector';
import { useBlueprintStore } from '../../../../../application/store/store';

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/s1', mockSetLocation],
}));

describe('SystemSelector', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    useBlueprintStore.setState({
      loadedSystems: [],
      currentFilePath: 'sys1.yaml',
      workspaceName: '',
      isWorkspaceOpen: false,
    });
  });

  it('renders nothing when no systems are loaded', () => {
    const { container } = render(<SystemSelector />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders system options and navigates on change', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'sys1.yaml',
          name: 'System 1',
          schema: {
            name: 'S1',
            version: '1.0.0',
            level: 'container',
            entityRef: 's1',
            nodes: [],
            dependencies: [],
          },
        },
        {
          path: 'sys2.yaml',
          name: 'System 2',
          schema: {
            name: 'S2',
            version: '1.0.0',
            level: 'container',
            entityRef: 's2',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'sys1.yaml',
    });

    render(<SystemSelector />);

    expect(screen.getByText('System:')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Active system' }), {
      target: { value: 'sys2.yaml' },
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/s2');
  });
});

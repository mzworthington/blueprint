import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesignSystemPage } from './DesignSystemPage';
import { useBlueprintStore } from '../store/store';

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/design-system', mockSetLocation],
  useRoute: () => [false, null],
}));

vi.mock('../components/DesignSystemShowcase', () => ({
  DesignSystemShowcase: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="design-system-showcase">
      <button data-testid="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

describe('DesignSystemPage Component', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
  });

  it('should render the showcase and navigate back on close', () => {
    useBlueprintStore.setState({
      workspaceName: 'Test Workspace',
      schema: {
        name: 'Workspace Schema',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      },
    });

    render(<DesignSystemPage />);

    expect(screen.getByTestId('design-system-showcase')).toBeInTheDocument();

    const closeButton = screen.getByTestId('close-button');
    fireEvent.click(closeButton);

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/test-workspace');
  });

  it('should fallback to schema.name if workspaceName is empty', () => {
    useBlueprintStore.setState({
      workspaceName: '',
      schema: {
        name: 'Schema Only Name',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      },
    });

    render(<DesignSystemPage />);

    const closeButton = screen.getByTestId('close-button');
    fireEvent.click(closeButton);

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/schema-only-name');
  });
});

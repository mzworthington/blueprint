import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Header } from './Header';
import { useBlueprintStore } from '../store/store';

vi.mock('./Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

describe('Header Component', () => {
  beforeEach(() => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      validationResult: { isValid: true, issues: [] },
    });
  });

  it('renders branding logo and breadcrumbs', () => {
    render(<Header />);
    expect(screen.getByAltText('Blueprint Logo')).toBeInTheDocument();
    expect(screen.getByText('blueprint')).toBeInTheDocument();
  });

  it('displays the C4 level badge', () => {
    const { schema } = useBlueprintStore.getState();
    useBlueprintStore.setState({
      schema: { ...schema, level: 'component' },
    });

    render(<Header />);
    expect(screen.getByText('component')).toBeInTheDocument();
  });

  it('displays valid status badge when validation is successful', () => {
    useBlueprintStore.setState({
      validationResult: { isValid: true, issues: [] },
    });

    render(<Header />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('displays cycle warning validation status badge when cycle is present', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
    });

    render(<Header />);
    expect(screen.getByText('Cycle Detected')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Header } from './Header';
import { useBlueprintStore } from '../../../../../application/store/store';

vi.mock('../Searchbar/Searchbar', () => ({
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
      workspaceManifest: null,
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

  it('shows the Overview button when manifest.overview.enabled is true', () => {
    useBlueprintStore.setState({
      workspaceManifest: {
        name: 'My Platform',
        root: 'platform.yaml',
        hierarchy: [],
        overview: { enabled: true },
      },
    });

    render(<Header />);
    // In test env the location is '/' which is treated as the overview root,
    // so the button toggles to "Back to diagram".
    const btn = screen.getByRole('button', { name: /back|overview/i });
    expect(btn).toBeInTheDocument();
  });

  it('does not show the Overview button when overview is not enabled', () => {
    useBlueprintStore.setState({ workspaceManifest: null });
    render(<Header />);
    expect(screen.queryByTitle('System Overview')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Back to diagram')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { Header } from './Header';
import { useBlueprintStore } from '../../../../../application/store/store';

vi.mock('../Searchbar/Searchbar', () => ({
  Searchbar: () => <div data-testid="searchbar-mock">Searchbar Mock</div>,
}));

function renderHeader() {
  const { hook } = memoryLocation({ path: '/workspace' });
  return render(
    <Router hook={hook}>
      <Header />
    </Router>
  );
}

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
    renderHeader();
    expect(screen.getByAltText('Blueprint Logo')).toBeInTheDocument();
    expect(screen.getByText('blueprint')).toBeInTheDocument();
  });

  it('displays the C4 level badge', () => {
    const { schema } = useBlueprintStore.getState();
    useBlueprintStore.setState({
      schema: { ...schema, level: 'component' },
    });

    renderHeader();
    expect(screen.getByText('component')).toBeInTheDocument();
  });

  it('displays valid status badge when validation is successful', () => {
    useBlueprintStore.setState({
      validationResult: { isValid: true, issues: [] },
    });

    renderHeader();
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('displays cycle warning validation status badge when cycle is present', () => {
    useBlueprintStore.setState({
      validationResult: {
        isValid: false,
        issues: [{ type: 'cycle', message: 'Cycle detected', path: ['node1', 'node2'] }],
      },
    });

    renderHeader();
    expect(screen.getByText('Cycle Detected')).toBeInTheDocument();
  });
});

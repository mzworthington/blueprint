import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { BreadcrumbsCompact } from './BreadcrumbsCompact';
import { useBlueprintStore } from '../../../../../application/store/store';

function renderCompact() {
  const { hook } = memoryLocation({ path: '/workspace' });
  return render(
    <Router hook={hook}>
      <BreadcrumbsCompact />
    </Router>
  );
}

describe('BreadcrumbsCompact', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      currentFilePath: 'blueprint.yaml',
      loadedSystems: [],
      selectedNodeId: null,
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
  });

  it('shows a compact summary and opens the full trail in a menu', () => {
    renderCompact();

    expect(screen.getByText('Main App System')).toBeInTheDocument();
    expect(screen.queryByText('Sandbox Workspace')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open diagram location menu' }));

    expect(screen.getByText('Sandbox')).toBeInTheDocument();
    expect(screen.getAllByText('Main App System').length).toBeGreaterThan(1);
  });

  it('shows ancestor trail inside the mobile menu', () => {
    const contextSchema = {
      name: 'Enterprise Context',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'context',
      nodes: [{ entityRef: 'main-app', type: 'software-system' as const, name: 'Main App System' }],
      dependencies: [],
    };
    const containerSchema = {
      name: 'Main App System',
      version: '1.0.0',
      level: 'container' as const,
      entityRef: 'main-app',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      loadedSystems: [
        { path: 'context.yaml', name: 'Enterprise Context', schema: contextSchema },
        { path: 'container.yaml', name: 'Main App System', schema: containerSchema },
      ],
      currentFilePath: 'container.yaml',
      schema: containerSchema,
    });

    renderCompact();

    expect(screen.getByText('Enterprise Context › Main App System')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open diagram location menu' }));

    const rootLink = screen.getByText('Enterprise Context').closest('a');
    expect(rootLink).toHaveAttribute('href', '/workspace/context');
  });
});

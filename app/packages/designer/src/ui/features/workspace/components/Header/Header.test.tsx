import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { Header } from './Header';
import { useBlueprintStore } from '../../../../../application/store/store';

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

  it('renders branding and breadcrumbs', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: /BLUEPRINT/i })).toBeInTheDocument();
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

  it('displays schema version warning badge when loaded version mismatches app expectation', () => {
    useBlueprintStore.setState({
      schemaVersionWarning: {
        status: 'legacy',
        loadedMajor: null,
        expectedMajor: 3,
        loadedVersion: '1.0.0',
        expectedVersionUrl:
          'https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json',
        title: 'Legacy schema format',
        message: 'This diagram uses a legacy schema version (1.0.0). Blueprint expects v3.',
        migrationHint: 'Commit pending changes from the designer or re-run the CLI.',
      },
    });

    renderHeader();
    expect(screen.getByTestId('schema-version-warning')).toHaveTextContent('Legacy schema format');
  });
});

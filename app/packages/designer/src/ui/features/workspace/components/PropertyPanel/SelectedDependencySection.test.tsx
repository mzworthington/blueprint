import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SelectedDependencySection } from './SelectedDependencySection';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';

describe('SelectedDependencySection', () => {
  const edge: BlueprintRFEdge = {
    id: 'edge-a-b',
    source: 'sys/a',
    target: 'sys/b',
    data: { type: 'direct-call', description: 'Calls module / service' },
  };

  it('shows from/to refs, description, and dangling warning when endpoints missing', () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    const onSelect = vi.fn();

    render(
      <SelectedDependencySection
        edge={edge}
        schemaNodes={[]}
        isDangling
        onUpdateDependency={onUpdate}
        onDeleteDependency={onDelete}
        onSelectNode={onSelect}
      />
    );

    expect(screen.getByTestId('selected-dependency-section')).toBeInTheDocument();
    expect(screen.getByTestId('dangling-dependency-warning')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Calls module / service')).toBeInTheDocument();
    expect(screen.getAllByText('sys/a').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('sys/b').length).toBeGreaterThanOrEqual(1);
  });

  it('lets the user edit dependency type', () => {
    const onUpdate = vi.fn();
    render(
      <SelectedDependencySection
        edge={edge}
        schemaNodes={[
          { entityRef: 'sys/a', type: 'component', name: 'A' },
          { entityRef: 'sys/b', type: 'component', name: 'B' },
        ]}
        isDangling={false}
        onUpdateDependency={onUpdate}
        onDeleteDependency={vi.fn()}
        onSelectNode={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Dependency type'), {
      target: { value: 'publish-subscribe' },
    });
    expect(onUpdate).toHaveBeenCalledWith('sys/a', 'sys/b', { type: 'publish-subscribe' });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SystemCard } from './SystemCard';
import type { SystemSchema } from '@blueprint/core';

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow-mock">{children}</div>
  ),
  Background: () => <div data-testid="bg-mock" />,
  BackgroundVariant: { Dots: 'dots' },
}));

const mockSchema: SystemSchema = {
  name: 'Checkout Service',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { id: 'api', type: 'rest-api', name: 'Checkout API' },
    { id: 'db', type: 'database', name: 'Orders DB' },
    { id: 'worker', type: 'background-worker', name: 'Order Worker', isTest: true },
  ],
  dependencies: [{ from: 'api', to: 'db', type: 'read-write' }],
};

describe('SystemCard Component', () => {
  it('renders system name and level metadata', () => {
    render(<SystemCard schema={mockSchema} name="Checkout Service" onClick={() => {}} />);
    expect(screen.getByText('Checkout Service')).toBeInTheDocument();
    expect(screen.getByText(/container/i)).toBeInTheDocument();
  });

  it('excludes test nodes from the component count', () => {
    render(<SystemCard schema={mockSchema} name="Checkout Service" onClick={() => {}} />);
    // 2 non-test nodes
    expect(screen.getByText(/2 components/)).toBeInTheDocument();
  });

  it('shows the "Linked" badge when hasCrossSystemDeps is true', () => {
    render(
      <SystemCard
        schema={mockSchema}
        name="Checkout Service"
        hasCrossSystemDeps
        onClick={() => {}}
      />
    );
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('does not show the "Linked" badge when hasCrossSystemDeps is false', () => {
    render(<SystemCard schema={mockSchema} name="Checkout Service" onClick={() => {}} />);
    expect(screen.queryByText('Linked')).not.toBeInTheDocument();
  });

  it('fires onClick when the card is clicked', () => {
    const handleClick = vi.fn();
    render(<SystemCard schema={mockSchema} name="Checkout Service" onClick={handleClick} />);
    fireEvent.click(screen.getByTestId('system-card-Checkout Service'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

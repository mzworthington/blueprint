import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverviewCanvas } from './OverviewCanvas';
import type { ContainerSystem, CrossSystemEdge } from '../../hooks/useSystemOverview';

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow-mock">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Background: () => <div data-testid="bg-mock" />,
  BackgroundVariant: { Dots: 'dots' },
}));

const makeSystem = (name: string, path: string): ContainerSystem => ({
  path,
  name,
  entityRef: path,
  schema: {
    name,
    version: '1.0.0',
    level: 'container',
    nodes: [{ id: 'n1', type: 'microservice', name: 'Service A' }],
    dependencies: [],
  },
});

describe('OverviewCanvas Component', () => {
  it('renders empty state when no systems are provided', () => {
    render(<OverviewCanvas systems={[]} crossSystemEdges={[]} onSystemClick={() => {}} />);
    expect(screen.getByText(/No container-level diagrams found/i)).toBeInTheDocument();
  });

  it('renders a card for each container system', () => {
    const systems = [makeSystem('System A', '/a'), makeSystem('System B', '/b')];
    render(<OverviewCanvas systems={systems} crossSystemEdges={[]} onSystemClick={() => {}} />);
    expect(screen.getByTestId('system-card-System A')).toBeInTheDocument();
    expect(screen.getByTestId('system-card-System B')).toBeInTheDocument();
  });

  it('calls onSystemClick with the correct path when a card is clicked', () => {
    const handleClick = vi.fn();
    const systems = [makeSystem('System A', '/a')];
    render(<OverviewCanvas systems={systems} crossSystemEdges={[]} onSystemClick={handleClick} />);
    fireEvent.click(screen.getByTestId('system-card-System A'));
    expect(handleClick).toHaveBeenCalledWith('/a');
  });

  it('shows cross-system dependency summary when edges exist', () => {
    const systems = [makeSystem('System A', '/a'), makeSystem('System B', '/b')];
    const edges: CrossSystemEdge[] = [
      {
        id: 'edge-1',
        fromNodeRef: 'a/n1',
        toNodeRef: 'b/n1',
        fromSystemPath: '/a',
        toSystemPath: '/b',
        description: 'sends events',
      },
    ];
    render(<OverviewCanvas systems={systems} crossSystemEdges={edges} onSystemClick={() => {}} />);
    expect(screen.getByText(/1 cross-system dependency detected/i)).toBeInTheDocument();
    expect(screen.getByText(/sends events/i)).toBeInTheDocument();
  });
});

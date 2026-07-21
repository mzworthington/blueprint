import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CouplingMiniGraph } from './CouplingMiniGraph';

describe('CouplingMiniGraph', () => {
  const coupled = [
    { path: 'src/linked.ts', score: 0.9, sharedCommits: 4 },
    { path: 'src/off-canvas.ts', score: 0.5, sharedCommits: 2 },
  ];

  it('calls onPeerClick for linked peers only', () => {
    const onPeerClick = vi.fn();
    render(
      <CouplingMiniGraph
        centerLabel="Center"
        coupled={coupled}
        linkedPaths={new Set(['src/linked.ts'])}
        onPeerClick={onPeerClick}
      />
    );

    fireEvent.click(screen.getByTestId('coupling-peer-linked.ts'));
    expect(onPeerClick).toHaveBeenCalledWith('src/linked.ts');
    expect(screen.queryByTestId('coupling-peer-off-canvas.ts')).not.toBeInTheDocument();
  });
});

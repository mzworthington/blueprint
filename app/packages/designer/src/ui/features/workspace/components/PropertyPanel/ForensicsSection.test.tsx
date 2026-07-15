import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ForensicsSection } from './ForensicsSection';

describe('ForensicsSection', () => {
  it('renders readonly metrics and hotspot concern badge', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 22,
          churn: 8,
          authorCount: 2,
          hotspotScore: 0.9,
          classifications: ['hotspot'],
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
      />
    );

    expect(screen.getByTestId('forensics-section')).toBeInTheDocument();
    expect(screen.getByText('Git forensics')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Hotspot/i);
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();
    expect(screen.getByText(/src\/other\.ts/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows knowledge silo badge', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 15,
          authorCount: 1,
          classifications: ['knowledge-silo'],
        }}
      />
    );
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Knowledge silo/i);
  });

  it('toggles canvas coupling overlay when peers are linked', () => {
    const onToggle = vi.fn();
    render(
      <ForensicsSection
        forensics={{
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
        showCoupling={false}
        onToggleShowCoupling={onToggle}
        linkedCouplingCount={1}
      />
    );

    fireEvent.click(screen.getByTestId('toggle-show-coupling'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Show 1 coupling link on canvas/i)).toBeInTheDocument();
  });

  it('disables coupling toggle when no peers are on the diagram', () => {
    render(
      <ForensicsSection
        forensics={{
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
        showCoupling={false}
        onToggleShowCoupling={vi.fn()}
        linkedCouplingCount={0}
      />
    );

    expect(screen.getByTestId('toggle-show-coupling')).toBeDisabled();
  });
});

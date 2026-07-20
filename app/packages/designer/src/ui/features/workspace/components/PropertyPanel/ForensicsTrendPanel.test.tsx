import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ForensicsTrendPanel } from './ForensicsTrendPanel';

describe('ForensicsTrendPanel', () => {
  it('renders churn, author, and complexity micro charts for rollups', () => {
    render(
      <ForensicsTrendPanel
        dashboard={{
          scope: 'rollup',
          churnByWeek: [2, 1, 0, 3],
          authorBuckets: [2, 1, 0],
          authorBucketLabels: ['1 author', '2–3', '4+'],
          complexityBuckets: [1, 0, 2, 1],
          complexityBucketLabels: ['1–5', '6–10', '11–20', '21+'],
          fileCount: 4,
        }}
      />
    );

    expect(screen.getByTestId('forensics-trend-panel')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-trend-churn')).toHaveTextContent(/6 commits/i);
    expect(screen.getByTestId('forensics-trend-authors')).toHaveTextContent(/3 files/i);
    expect(screen.getByTestId('forensics-trend-complexity')).toHaveTextContent(/4 files/i);
    expect(screen.getAllByTestId('micro-bar-chart')).toHaveLength(2);
    expect(screen.getByTestId('churn-sparkline')).toBeInTheDocument();
  });
});

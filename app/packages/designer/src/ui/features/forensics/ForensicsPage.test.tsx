import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { ForensicsPage } from './ForensicsPage';
import { useBlueprintStore } from '../../../application/store/store';

describe('ForensicsPage', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [{ from: 'app/designer/db', to: 'app/designer/ok', type: 'direct-call' }],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  churn: 6,
                  authorCount: 2,
                  classifications: ['hotspot'],
                  sinceDays: 90,
                },
              },
              {
                entityRef: 'app/designer/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.05,
                  complexity: 2,
                  classifications: [],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('renders ranked offenders and filters to hotspots', () => {
    const { hook } = memoryLocation({ path: '/forensics' });
    render(
      <Router hook={hook}>
        <ForensicsPage />
      </Router>
    );

    expect(screen.getByText('Worst offenders')).toBeInTheDocument();
    expect(screen.queryByTestId('forensics-workspace-summary')).not.toBeInTheDocument();
    expect(screen.getByText('DB Layer')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getAllByText(/deps 1/).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /^Hotspots$/i }));
    expect(screen.getByText('DB Layer')).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('filters refactor candidates by heuristic score', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                forensics: {
                  hotspotScore: 0.2,
                  complexity: 20,
                  churn: 10,
                  topAuthorPercent: 0.5,
                  classifications: [],
                  sinceDays: 90,
                },
              },
              {
                entityRef: 'app/designer/ok',
                name: 'OK',
                type: 'component',
                forensics: {
                  hotspotScore: 0.9,
                  complexity: 2,
                  churn: 0,
                  classifications: ['hotspot'],
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/forensics' });
    render(
      <Router hook={hook}>
        <ForensicsPage />
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /^Refactor$/i }));
    expect(screen.getByText('DB Layer')).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('filters the ranking list from the page search', () => {
    const { hook } = memoryLocation({ path: '/forensics' });
    render(
      <Router hook={hook}>
        <ForensicsPage />
      </Router>
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Search offenders/i }), {
      target: { value: 'DB' },
    });
    expect(screen.getByText('DB Layer')).toBeInTheDocument();
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('opens refactor plan slide-over when an offender row is clicked', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'designer-components.yaml',
          name: 'designer',
          schema: {
            name: 'Designer Components',
            version: '1.0.0',
            level: 'component',
            dependencies: [],
            nodes: [
              {
                entityRef: 'app/designer/db',
                name: 'DB Layer',
                type: 'component',
                properties: { filepath: 'src/db.ts' },
                forensics: {
                  hotspotScore: 0.85,
                  complexity: 40,
                  churn: 6,
                  authorCount: 2,
                  topAuthorPercent: 0.5,
                  authors: [
                    { email: 'alice@ex.com', commits: 3 },
                    { email: 'bob@ex.com', commits: 3 },
                  ],
                  classifications: ['hotspot'],
                  sinceDays: 90,
                },
              },
            ],
          },
        },
      ],
    });

    const { hook } = memoryLocation({ path: '/forensics' });
    render(
      <Router hook={hook}>
        <ForensicsPage />
      </Router>
    );

    fireEvent.click(screen.getByTestId('offender-row-app/designer/db'));
    expect(screen.getByTestId('refactor-plan-slide-over')).toBeInTheDocument();
    expect(screen.getByText('Refactor plan')).toBeInTheDocument();
    expect(screen.getByTestId('ownership-breakdown')).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DocsShell } from './DocsShell';

vi.mock('wouter', () => ({
  useLocation: () => ['/architecture'],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../components/AppHeader', () => ({
  AppHeader: ({ children }: { children?: React.ReactNode }) => <header>{children}</header>,
}));

describe('DocsShell', () => {
  it('shows separate mobile scrollers for product guide and reference', () => {
    render(
      <DocsShell>
        <p>content</p>
      </DocsShell>
    );

    const guideNav = screen.getByTestId('docs-mobile-guide-nav');
    expect(guideNav.parentElement).toHaveTextContent('Product guide');
    expect(within(guideNav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(within(guideNav).getByRole('link', { name: 'Canvas' })).toBeInTheDocument();
    expect(within(guideNav).queryByRole('link', { name: 'Architecture & security' })).toBeNull();

    const referenceNav = screen.getByTestId('docs-mobile-reference-nav');
    expect(referenceNav.parentElement).toHaveTextContent('Reference');
    expect(
      within(referenceNav).getByRole('link', { name: 'Architecture & security' })
    ).toBeInTheDocument();
    expect(
      within(referenceNav).getByRole('link', { name: 'Unit test features' })
    ).toBeInTheDocument();
  });
});

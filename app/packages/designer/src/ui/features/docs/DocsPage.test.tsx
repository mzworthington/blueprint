import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DocsPage } from './DocsPage';

vi.mock('wouter', () => ({
  useLocation: () => ['/features-unit'],
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./pages', async () => {
  const actual = await vi.importActual<typeof import('./pages')>('./pages');
  return {
    ...actual,
    findDocsPage: () => ({
      path: '/features-unit',
      title: 'Unit test features',
      dir: '',
      group: 'reference' as const,
      filterable: true,
      markdown: `# Unit test features

## Designer
### Canvas
 - ✅ collapses panels
 - ✅ zooms into containers
## Core
### Layout
 - ✅ places nodes
`,
    }),
  };
});

vi.mock('./MarkdownView', () => ({
  MarkdownView: ({ markdown }: { markdown: string }) => (
    <pre data-testid="docs-markdown">{markdown}</pre>
  ),
}));

describe('DocsPage feature filter', () => {
  it('filters the feature report as the user types', () => {
    render(<DocsPage />);

    expect(screen.getByTestId('docs-feature-count')).toHaveTextContent('3 features');
    expect(screen.getByTestId('docs-feature-outline')).toHaveTextContent('Designer');
    expect(screen.getByTestId('docs-feature-outline')).toHaveTextContent('Core');
    expect(screen.getByTestId('docs-markdown')).toHaveTextContent('collapses panels');

    fireEvent.change(screen.getByTestId('docs-feature-filter'), { target: { value: 'zooms' } });

    expect(screen.getByTestId('docs-feature-count')).toHaveTextContent('1 feature');
    // Package chips stay available from the full outline
    expect(screen.getByTestId('docs-feature-outline')).toHaveTextContent('Designer');
    expect(screen.getByTestId('docs-feature-outline')).toHaveTextContent('Core');
    const md = screen.getByTestId('docs-markdown');
    expect(md).toHaveTextContent('zooms into containers');
    expect(md).not.toHaveTextContent('collapses panels');
    expect(md).not.toHaveTextContent('places nodes');
  });

  it('filters to a package when a package chip is clicked without filling the search box', () => {
    render(<DocsPage />);

    fireEvent.click(screen.getByTestId('docs-feature-package-Core'));

    expect(screen.getByTestId('docs-feature-filter')).toHaveValue('');
    expect(screen.getByTestId('docs-feature-count')).toHaveTextContent('1 feature');
    expect(screen.getByTestId('docs-markdown')).toHaveTextContent('places nodes');
    expect(screen.getByTestId('docs-markdown')).toHaveTextContent('## Core');
    expect(screen.getByTestId('docs-markdown')).not.toHaveTextContent('## Designer');
    expect(screen.getByTestId('docs-markdown')).not.toHaveTextContent('collapses panels');

    // Toggle off
    fireEvent.click(screen.getByTestId('docs-feature-package-Core'));
    expect(screen.getByTestId('docs-feature-count')).toHaveTextContent('3 features');
  });
});

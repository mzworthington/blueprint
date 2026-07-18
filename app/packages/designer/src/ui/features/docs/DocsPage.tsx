import React, { useDeferredValue, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { DocsShell } from './DocsShell';
import { MarkdownView } from './MarkdownView';
import {
  countFeatureMatches,
  extractFeatureOutline,
  filterFeatureMarkdown,
} from './filterFeatureMarkdown';
import { findDocsPage } from './pages';

export const DocsPage: React.FC = () => {
  const [location] = useLocation();
  const page = findDocsPage(location);
  const [query, setQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery('');
    setPackageFilter(null);
  }, [location]);

  if (!page) {
    return (
      <DocsShell>
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-slate-400">That documentation URL is missing.</p>
        <Link href="/" className="mt-6 inline-flex text-brand-400 hover:text-brand-300">
          Back to docs
        </Link>
      </DocsShell>
    );
  }

  const outline = page.filterable ? extractFeatureOutline(page.markdown) : [];

  let markdown = page.markdown;
  if (page.filterable && packageFilter) {
    markdown = filterFeatureMarkdown(markdown, packageFilter, 'package');
  }
  if (page.filterable && deferredQuery.trim()) {
    markdown = filterFeatureMarkdown(markdown, deferredQuery, 'text');
  }

  const matchCount = page.filterable
    ? countFeatureMatches(
        packageFilter
          ? filterFeatureMarkdown(page.markdown, packageFilter, 'package')
          : page.markdown,
        deferredQuery,
        'text'
      )
    : undefined;

  return (
    <DocsShell title={page.title}>
      {page.filterable ? (
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Filter features</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter features…"
                data-testid="docs-feature-filter"
                className="w-full rounded-lg border border-[#00f0ff]/20 bg-slate-950/70 py-2 pl-9 pr-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-[#00f0ff]/50 focus:ring-1 focus:ring-[#00f0ff]/30"
              />
            </label>
            <p
              className="shrink-0 font-mono text-xs text-slate-500"
              data-testid="docs-feature-count"
            >
              {matchCount} feature{matchCount === 1 ? '' : 's'}
            </p>
          </div>
          {outline.length > 0 ? (
            <nav
              aria-label="Feature packages"
              data-testid="docs-feature-outline"
              className="flex flex-wrap gap-2"
            >
              {outline.map(heading => {
                const active = packageFilter === heading;
                return (
                  <button
                    key={heading}
                    type="button"
                    data-testid={`docs-feature-package-${heading}`}
                    aria-pressed={active}
                    onClick={() => setPackageFilter(active ? null : heading)}
                    className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      active
                        ? 'border-[#00f0ff]/50 bg-[#00f0ff]/20 text-[#00f0ff]'
                        : 'border-[#00f0ff]/20 bg-[#00f0ff]/5 text-[#00f0ff] hover:bg-[#00f0ff]/15'
                    }`}
                  >
                    {heading}
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>
      ) : null}
      <MarkdownView markdown={markdown} fromDir={page.dir} />
    </DocsShell>
  );
};

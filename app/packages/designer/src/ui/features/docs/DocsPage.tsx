import React from 'react';
import { Link, useLocation } from 'wouter';
import { DocsShell } from './DocsShell';
import { MarkdownView } from './MarkdownView';
import { findDocsPage } from './pages';

export const DocsPage: React.FC = () => {
  const [location] = useLocation();
  const page = findDocsPage(location);

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

  return (
    <DocsShell title={page.title}>
      <MarkdownView markdown={page.markdown} fromDir={page.dir} />
    </DocsShell>
  );
};

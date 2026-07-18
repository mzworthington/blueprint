import React, { isValidElement, lazy, Suspense, useEffect, useState } from 'react';
import type { Components } from 'react-markdown';
import { Link } from 'wouter';
import { resolveDocsAssetSrc, resolveDocsHref } from './pages';
import { stripHtmlComments } from './stripHtmlComments';

type Props = {
  markdown: string;
  fromDir: string;
};

const MermaidPreview = lazy(() =>
  import('../../components/MermaidPreview/MermaidPreview').then(m => ({
    default: m.MermaidPreview,
  }))
);

function extractCodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractCodeText).join('');
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractCodeText(node.props.children);
  }
  return '';
}

function buildComponents(fromDir: string): Components {
  const headingCounts = new Map<string, number>();
  const heading =
    (Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
    ({ children }: { children?: React.ReactNode }) => {
      const text = extractCodeText(children);
      const base = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const n = headingCounts.get(base) ?? 0;
      headingCounts.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      return <Tag id={id}>{children}</Tag>;
    };

  return {
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    h5: heading('h5'),
    h6: heading('h6'),
    a: ({ href, children }) => {
      const resolved = href ? resolveDocsHref(href, fromDir) : null;
      if (resolved) {
        return (
          <Link
            href={resolved}
            className="text-brand-500 hover:text-brand-300 underline-offset-2 hover:underline"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noreferrer' : undefined}
          className="text-brand-500 hover:text-brand-300 underline-offset-2 hover:underline"
        >
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => (
      <img
        src={src ? resolveDocsAssetSrc(src, fromDir) : undefined}
        alt={alt ?? ''}
        className="rounded-xl border border-brand-500/20 shadow-lg shadow-black/40 max-w-full"
      />
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = Boolean(className);
      if (!isBlock) {
        return (
          <code
            className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[0.85em] font-mono text-brand-300 border border-white/5"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => {
      const codeEl = React.Children.toArray(children).find(child => isValidElement(child));
      const className =
        isValidElement<{ className?: string }>(codeEl) && codeEl.props.className
          ? codeEl.props.className
          : '';
      if (/\blanguage-mermaid\b/.test(className)) {
        const code = extractCodeText(codeEl).replace(/\n$/, '');
        return (
          <div className="my-6">
            <Suspense
              fallback={
                <div className="text-xs font-mono text-slate-500 py-6 text-center">
                  Loading diagram…
                </div>
              }
            >
              <MermaidPreview code={code} />
            </Suspense>
          </div>
        );
      }
      return (
        <pre className="overflow-x-auto rounded-xl border border-brand-500/15 bg-slate-950/90 p-4 text-sm font-mono text-slate-200 shadow-inner">
          {children}
        </pre>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-white/10 bg-slate-900/60 px-3 py-2 text-left font-semibold text-slate-100">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-white/10 px-3 py-2 text-slate-300 align-top">{children}</td>
    ),
  };
}

type MarkdownLibs = {
  ReactMarkdown: typeof import('react-markdown').default;
  remarkGfm: typeof import('remark-gfm').default;
};

let markdownLibs: Promise<MarkdownLibs> | undefined;

function loadMarkdownLibs(): Promise<MarkdownLibs> {
  markdownLibs ??= Promise.all([import('react-markdown'), import('remark-gfm')]).then(
    ([rm, gfm]) => ({
      ReactMarkdown: rm.default,
      remarkGfm: gfm.default,
    })
  );
  return markdownLibs;
}

export const MarkdownView: React.FC<Props> = ({ markdown, fromDir }) => {
  const [libs, setLibs] = useState<MarkdownLibs | null>(null);

  useEffect(() => {
    let active = true;
    loadMarkdownLibs().then(loaded => {
      if (active) setLibs(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!libs) {
    return (
      <div className="docs-prose text-sm font-mono text-slate-500 py-8">Loading markdown…</div>
    );
  }

  const { ReactMarkdown, remarkGfm } = libs;

  return (
    <div className="docs-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents(fromDir)}>
        {stripHtmlComments(markdown)}
      </ReactMarkdown>
    </div>
  );
};

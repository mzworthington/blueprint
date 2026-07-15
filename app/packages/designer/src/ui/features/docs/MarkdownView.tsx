import React, { isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'wouter';
import { MermaidPreview } from '../../components/MermaidPreview/MermaidPreview';
import { resolveDocsAssetSrc, resolveDocsHref } from './pages';

type Props = {
  markdown: string;
  fromDir: string;
};

function extractCodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractCodeText).join('');
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractCodeText(node.props.children);
  }
  return '';
}

export const MarkdownView: React.FC<Props> = ({ markdown, fromDir }) => {
  return (
    <div className="docs-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
                  <MermaidPreview code={code} />
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
            <td className="border border-white/10 px-3 py-2 text-slate-300 align-top">
              {children}
            </td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

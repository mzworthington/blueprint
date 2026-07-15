import React from 'react';
import { Link } from 'wouter';
import { DocsShell } from './DocsShell';

const FEATURES = [
  {
    title: 'Canvas ↔ schema',
    details:
      'Compose architecture visually or as YAML. Changes stay bi-directionally synchronized.',
  },
  {
    title: 'C4 navigation',
    details:
      'Zoom into containers and components, then escape back up with breadcrumbs and keyboard.',
  },
  {
    title: 'CLI analysis',
    details:
      'Scan TypeScript (and more) to emit blueprint YAML with layout — enrich with git forensics by default.',
  },
];

export const DocsHome: React.FC = () => {
  return (
    <DocsShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.10),transparent)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-3">
              Blueprint
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Visual systems architecture
            </h1>
            <p className="mt-4 max-w-xl text-slate-400 text-base sm:text-lg leading-relaxed">
              Local-first C4 diagrams synced to YAML, with optional git forensics from your
              codebase.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/guide"
                className="rounded-xl bg-[#00f0ff]/90 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors"
              >
                Product guide
              </Link>
              <Link
                href="/workspace"
                className="rounded-xl border border-[#00f0ff]/40 text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Open the app
              </Link>
              <Link
                href="/design-system"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                Design system
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <img
              src="/assets/logo.svg"
              alt="Blueprint logo"
              className="w-48 sm:w-56 drop-shadow-[0_0_40px_rgba(0,240,255,0.25)]"
            />
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(feature => (
          <article
            key={feature.title}
            className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 p-5"
          >
            <h2 className="text-base font-semibold text-white">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">{feature.details}</p>
          </article>
        ))}
      </div>
    </DocsShell>
  );
};

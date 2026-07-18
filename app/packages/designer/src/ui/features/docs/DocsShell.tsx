import React from 'react';
import { Link, useLocation } from 'wouter';
import { AppHeader } from '../../components/AppHeader';
import { DOCS_NAV, DOCS_SIDEBAR } from './pages';

type Props = {
  children: React.ReactNode;
  title?: string;
};

function isNavActive(location: string, path: string): boolean {
  return location === path || (path !== '/guide' && location.startsWith(`${path}/`));
}

function MobileScroller({
  items,
  location,
  'aria-label': ariaLabel,
  testId,
}: {
  items: { label: string; path: string }[];
  location: string;
  'aria-label': string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex gap-2 items-center p-3 overflow-x-auto scrollbar-none min-w-0"
      role="navigation"
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const active = isNavActive(location, item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-mono whitespace-nowrap transition-all border shrink-0 ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent hover:bg-white/5'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export const DocsShell: React.FC<Props> = ({ children, title }) => {
  const [location] = useLocation();
  const referenceSection = DOCS_SIDEBAR.find(s => s.title === 'Reference');

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-slate-100 pb-safe">
      <AppHeader sticky badge="DOCS" subtitle="Product guide and reference">
        <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto border-l border-[#00f0ff]/15 pl-4">
          {DOCS_NAV.map(item => {
            const active = isNavActive(location, item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors shrink-0 ${
                  active
                    ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </AppHeader>

      {/* Mobile: product guide + reference as separate horizontal scrollers */}
      <div className="lg:hidden border-b border-[#00f0ff]/10 bg-[#061125]/60 backdrop-blur-sm sticky top-[73px] z-40">
        <div>
          <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
            Product guide
          </p>
          <MobileScroller
            items={DOCS_NAV}
            location={location}
            aria-label="Product guide"
            testId="docs-mobile-guide-nav"
          />
        </div>
        {referenceSection ? (
          <div className="border-t border-[#00f0ff]/10">
            <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
              {referenceSection.title}
            </p>
            <MobileScroller
              items={referenceSection.items}
              location={location}
              aria-label="Reference"
              testId="docs-mobile-reference-nav"
            />
          </div>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden lg:block" data-testid="docs-sidebar">
          <nav className="sticky top-28 space-y-6 text-sm" aria-label="Docs">
            {DOCS_SIDEBAR.map(section => (
              <div key={section.title}>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map(item => {
                    const active = location === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={`block rounded-md px-2 py-1.5 transition-colors ${
                            active
                              ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 pb-16">
          <div className="bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            {title ? (
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                Docs
              </p>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

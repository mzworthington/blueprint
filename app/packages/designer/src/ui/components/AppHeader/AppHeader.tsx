import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';

type Props = {
  badge?: string;
  subtitle?: string;
  children?: React.ReactNode;
  sticky?: boolean;
};

const NAV_ITEMS: { href: string; label: string; isActive: (location: string) => boolean }[] = [
  {
    href: '/workspace',
    label: 'Workspace',
    isActive: loc => loc === '/workspace' || loc.startsWith('/workspace/'),
  },
  {
    href: '/forensics',
    label: 'Forensics',
    isActive: loc => loc === '/forensics' || loc.startsWith('/forensics/'),
  },
  {
    href: '/',
    label: 'Docs',
    isActive: loc =>
      !loc.startsWith('/workspace') &&
      !loc.startsWith('/forensics') &&
      !loc.startsWith('/design-system'),
  },
  {
    href: '/design-system',
    label: 'Design system',
    isActive: loc => loc === '/design-system' || loc.startsWith('/design-system/'),
  },
];

const navLinkClass = (active: boolean, mobile = false) => {
  const base = mobile
    ? 'block w-full rounded-lg px-3 py-2.5 text-sm font-mono uppercase tracking-wider transition-colors'
    : 'text-xs font-mono uppercase tracking-wider transition-colors px-2';
  return `${base} ${active ? 'text-[#00f0ff]' : 'text-slate-400 hover:text-[#00f0ff]'}`;
};

/**
 * Shared top chrome — brand, optional mid content, and site nav.
 * Desktop: inline links. Mobile: burger opens an accordion nav panel.
 */
export const AppHeader: React.FC<Props> = ({ badge, subtitle, children, sticky = false }) => {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`border-b border-[#00f0ff]/20 bg-[#061125]/90 backdrop-blur-md z-50 shadow-lg shadow-black/30 shrink-0 ${
        sticky ? 'sticky top-0' : ''
      }`}
    >
      <div className="p-4 md:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
          <BrandMark badge={badge} subtitle={subtitle} />
          {children ? (
            <div className="min-w-0 flex items-center gap-3 flex-1">{children}</div>
          ) : null}
        </div>

        <nav className="hidden sm:flex items-center gap-1 shrink-0" aria-label="Site navigation">
          {NAV_ITEMS.map(item => {
            const active = item.isActive(location);
            return (
              <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="sm:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-[#00f0ff]/20 bg-cyan-950/20 text-[#00f0ff] hover:bg-cyan-950/40 transition-colors cursor-pointer"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="app-header-mobile-nav"
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="app-header-mobile-nav"
          aria-label="Site menu"
          className="sm:hidden border-t border-[#00f0ff]/15 px-4 pb-4 pt-2 space-y-1"
        >
          {NAV_ITEMS.map(item => {
            const active = item.isActive(location);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${navLinkClass(active, true)} ${
                  active
                    ? 'bg-[#00f0ff]/10 border border-[#00f0ff]/25'
                    : 'border border-transparent'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
};

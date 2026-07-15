import React from 'react';
import { Link, useLocation } from 'wouter';
import { BrandMark } from './BrandMark';

type Props = {
  badge?: string;
  subtitle?: string;
  children?: React.ReactNode;
  sticky?: boolean;
};

const NAV_LINK =
  'hidden sm:inline text-xs font-mono uppercase tracking-wider transition-colors px-2';

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

/**
 * Shared top chrome — brand, optional mid content, and site nav.
 */
export const AppHeader: React.FC<Props> = ({ badge, subtitle, children, sticky = false }) => {
  const [location] = useLocation();

  return (
    <header
      className={`border-b border-[#00f0ff]/20 bg-[#061125]/90 backdrop-blur-md z-50 p-4 md:px-8 flex items-center justify-between gap-4 shadow-lg shadow-black/30 shrink-0 ${
        sticky ? 'sticky top-0' : ''
      }`}
    >
      <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
        <BrandMark badge={badge} subtitle={subtitle} />
        {children ? <div className="min-w-0 flex items-center gap-3 flex-1">{children}</div> : null}
      </div>
      <nav className="flex items-center gap-1 shrink-0" aria-label="Site">
        {NAV_ITEMS.map(item => {
          const active = item.isActive(location);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${NAV_LINK} ${
                active ? 'text-[#00f0ff]' : 'text-slate-400 hover:text-[#00f0ff]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

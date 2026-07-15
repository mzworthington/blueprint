import React from 'react';
import { BrandMark } from './BrandMark';

type Props = {
  badge?: string;
  subtitle?: string;
  /** Content between brand and trailing (breadcrumbs, docs nav, …). */
  children?: React.ReactNode;
  /** Right-side actions (search, close, Open app, …). */
  trailing?: React.ReactNode;
  /** Sticky when page content scrolls. */
  sticky?: boolean;
};

/**
 * Shared top chrome — extracted from the design-system showcase header.
 */
export const AppHeader: React.FC<Props> = ({
  badge,
  subtitle,
  children,
  trailing,
  sticky = false,
}) => {
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
      {trailing ? <div className="flex items-center gap-2 shrink-0">{trailing}</div> : null}
    </header>
  );
};

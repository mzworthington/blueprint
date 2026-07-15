import React from 'react';
import { Link } from 'wouter';

/** Crosshair mark from the design-system header. */
export const BrandIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <path d="M 16 4 V 28 M 4 16 H 28" stroke="#00f0ff" strokeWidth="1.5" fill="none" />
    <rect x="10" y="10" width="12" height="12" fill="#061125" stroke="#00f0ff" strokeWidth="2" />
    <circle cx="16" cy="16" r="3" fill="#00f0ff" />
  </svg>
);

type BrandMarkProps = {
  /** Small cyan chip next to BLUEPRINT (e.g. DOCS, DESIGN SYSTEM). */
  badge?: string;
  /** One-line subtitle under the title. */
  subtitle?: string;
};

/**
 * Design-system product lockup: glowing icon + BLUEPRINT title.
 * Links home (`/`).
 */
export const BrandMark: React.FC<BrandMarkProps> = ({ badge, subtitle }) => (
  <Link href="/" className="flex items-center gap-3 min-w-0 group">
    <div className="p-1 border border-[#00f0ff]/40 rounded bg-cyan-950/20 shadow-[0_0_8px_rgba(0,240,255,0.2)] shrink-0 group-hover:border-[#00f0ff]/70 transition-colors">
      <BrandIcon />
    </div>
    <div className="min-w-0 hidden sm:block">
      <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2 leading-none">
        <span>BLUEPRINT</span>
        {badge ? (
          <span className="text-[#00f0ff] font-mono text-sm border border-[#00f0ff]/30 px-2 py-0.5 rounded bg-cyan-950/30">
            {badge}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="text-xs text-slate-400 font-medium font-sans mt-1 truncate">{subtitle}</p>
      ) : null}
    </div>
    {/* Mobile: title is visually hidden; keep an accessible name. */}
    <span className="sr-only sm:hidden">BLUEPRINT{badge ? ` ${badge}` : ''}</span>
  </Link>
);

import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  Copy,
  Check,
  Download,
  Palette,
  FileCode,
  Layers,
  Database,
  Globe,
  Zap,
  Cpu,
  Monitor,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { AppHeader } from './AppHeader';

const IDENTITY_GUIDELINES = [
  {
    title: 'Drafting grid',
    details:
      'Heavy structural blueprints need a base grid. Major guidelines at 100px; micro subdivisions at 20px.',
  },
  {
    title: 'Electric cyan glow',
    details:
      'Active links, endpoints, and databases emit neon cyan glow (filter blur) to show operational flow.',
  },
  {
    title: 'Monochrome contrast',
    details: 'Layouts rest on deep navy (#040914) with typography in stark white or soft gray.',
  },
];

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'identity' | 'tokens' | 'assets' | 'components' | 'sandbox'
  >('identity');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="32" height="32" rx="6" fill="#040914" />
  <path d="M 0 16 L 32 16 M 16 0 L 16 32" stroke="#122342" stroke-width="0.75" />
  <path d="M 8 0 V 32 M 24 0 V 32 M 0 8 H 32 M 0 24 H 32" stroke="#091427" stroke-width="0.5" />
  <path d="M 16 5 V 27 M 5 16 H 27" stroke="#00d8ff" stroke-width="1.25" opacity="0.6" filter="url(#glow)" />
  <rect x="11" y="11" width="10" height="10" rx="1.5" fill="#061125" stroke="#00f0ff" stroke-width="2" filter="url(#glow)" />
  <circle cx="16" cy="16" r="2" fill="#00f0ff" />
</svg>`;

  const gridSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M 20 0 L 20 100 M 40 0 L 40 100 M 60 0 L 60 100 M 80 0 L 80 100 M 0 20 L 100 20 M 0 40 L 100 40 M 0 60 L 100 60 M 0 80 L 100 80" fill="none" stroke="rgba(6, 182, 212, 0.05)" stroke-width="0.5" />
  <path d="M 100 0 L 100 100 M 0 100 L 100 100" fill="none" stroke="rgba(6, 182, 212, 0.15)" stroke-width="1" />
</svg>`;

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [sandboxNodeType, setSandboxNodeType] = useState<
    'person' | 'software-system' | 'web-app' | 'database' | 'microservice'
  >('web-app');
  const [sandboxTitle, setSandboxTitle] = useState('Payment Service');
  const [sandboxDesc, setSandboxDesc] = useState(
    'Processes credit cards and generates receipts via gRPC.'
  );
  const [sandboxStatus, setSandboxStatus] = useState<'healthy' | 'warning' | 'error'>('healthy');

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#040914]/98 blueprint-grid text-slate-100 overflow-y-auto animate-fade-in">
      <AppHeader
        sticky
        badge="DESIGN SYSTEM"
        subtitle="System guidelines, vector assets, and glassmorphic user interface tokens."
        trailing={
          <>
            <Link
              href="/"
              className="hidden sm:inline text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-[#00f0ff] transition-colors px-2"
            >
              Docs
            </Link>
            <Link
              href="/workspace"
              className="px-4 py-2 border border-[#00f0ff]/40 text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] rounded-lg text-sm font-semibold transition"
            >
              Open app
            </Link>
          </>
        }
      />

      <div className="max-w-6xl w-full mx-auto px-4 md:px-8 py-8 flex-1 flex flex-col md:flex-row md:items-start gap-8">
        <aside className="w-full md:w-56 shrink-0">
          <div className="sticky top-28 space-y-6 text-sm">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#00f0ff]">
                Design system
              </p>
              <ul className="space-y-1">
                {(
                  [
                    { id: 'identity' as const, label: 'Identity & Grid' },
                    { id: 'tokens' as const, label: 'Design Tokens' },
                    { id: 'assets' as const, label: 'Vector Asset Pack' },
                    { id: 'components' as const, label: 'UI Components' },
                    { id: 'sandbox' as const, label: 'Interactive Sandbox' },
                  ] as const
                ).map(item => {
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left block rounded-md px-2 py-1.5 transition-colors ${
                          active
                            ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>

        <main className="min-w-0 w-full bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          {activeTab === 'identity' && (
            <div className="animate-fade-in">
              <section className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.10),transparent)]" />
                <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-3">
                      Brand identity
                    </p>
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
                      Schematic by design
                    </h2>
                    <p className="mt-4 max-w-xl text-slate-400 text-base sm:text-lg leading-relaxed">
                      Inspired by technical drafts, CAD, and electronic schematics — active nodes,
                      cylinders, and logical structures, not a passive logotype.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('tokens')}
                        className="rounded-xl bg-[#00f0ff]/90 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-[#00f0ff] transition-colors"
                      >
                        Design tokens
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('components')}
                        className="rounded-xl border border-[#00f0ff]/40 text-[#00f0ff] hover:text-white hover:bg-[#00f0ff]/10 hover:border-[#00f0ff] px-4 py-2.5 text-sm font-semibold transition-colors"
                      >
                        UI components
                      </button>
                      <Link
                        href="/"
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                      >
                        Docs
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
                {IDENTITY_GUIDELINES.map(guideline => (
                  <article
                    key={guideline.title}
                    className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 p-5"
                  >
                    <h3 className="text-base font-semibold text-white">{guideline.title}</h3>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                      {guideline.details}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-[#00f0ff]/10 pb-4">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#00f0ff]" /> Design Tokens (Theme Variables)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Standardized styling parameters used across the system layout to guarantee
                  aesthetic consistency.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Color Palette
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
                    <div className="h-16 w-full rounded-lg bg-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.7)]" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Cyan Primary</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          --color-brand-500
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
                        <span>#00F0FF</span>
                        <button
                          onClick={() => copyToClipboard('#00f0ff', 'c-cyan')}
                          className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedId === 'c-cyan' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === 'c-cyan' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
                    <div className="h-16 w-full rounded-lg bg-[#040914] border border-slate-900 shadow-inner" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Blueprint Navy</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          --color-blueprint-bg
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
                        <span>#040914</span>
                        <button
                          onClick={() => copyToClipboard('#040914', 'c-bg')}
                          className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedId === 'c-bg' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === 'c-bg' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
                    <div className="h-16 w-full rounded-lg bg-[#0f172a]" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Slate Base</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          --color-slate-900
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
                        <span>#0F172A</span>
                        <button
                          onClick={() => copyToClipboard('#0f172a', 'c-slate')}
                          className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedId === 'c-slate' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === 'c-slate' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-[#00f0ff]/15 bg-[#061125]/30 rounded-xl p-3 flex flex-col space-y-3">
                    <div className="h-16 w-full rounded-lg bg-[#0b2b3f]/30 border border-[#00f0ff]/20 shadow-inner" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Grid Guideline</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          --color-blueprint-border
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 border-t border-slate-900 mt-2 pt-2">
                        <span>rgba(0,240,255,0.15)</span>
                        <button
                          onClick={() => copyToClipboard('rgba(0, 240, 255, 0.15)', 'c-grid')}
                          className="text-[#00f0ff] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedId === 'c-grid' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === 'c-grid' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Typography Scale
                </h3>
                <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 divide-y divide-[#00f0ff]/5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 font-mono">
                        UI Title / Heading
                      </div>
                      <div className="text-lg font-extrabold text-white mt-1 font-sans">
                        Plus Jakarta Sans - Bold
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 text-right">
                      font-family: var(--font-sans)
                      <br />
                      letter-spacing: -0.02em
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 font-mono">
                        Code / Node Identifiers
                      </div>
                      <div className="text-sm font-semibold text-[#00f0ff] mt-1 font-mono">
                        JetBrains Mono - Medium
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 text-right">
                      font-family: var(--font-mono)
                      <br />
                      font-weight: 500
                    </div>
                  </div>

                  <div className="pt-4 space-y-3 font-sans">
                    <div className="flex items-baseline gap-4">
                      <span className="text-2xl font-extrabold text-white">Aa</span>
                      <span className="text-xs font-mono text-[#00f0ff]">
                        H1: 1.5rem (24px) / font-extrabold
                      </span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="text-xl font-bold text-white">Aa</span>
                      <span className="text-xs font-mono text-[#00f0ff]">
                        H2: 1.25rem (20px) / font-bold
                      </span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="text-sm font-medium text-slate-300">Aa</span>
                      <span className="text-xs font-mono text-[#00f0ff]">
                        Body: 0.875rem (14px) / font-normal
                      </span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="text-xs font-normal text-slate-400">Aa</span>
                      <span className="text-xs font-mono text-[#00f0ff]">
                        Small: 0.75rem (12px) / text-slate-400
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-[#00f0ff]/10 pb-4">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-[#00f0ff]" /> Vector Asset Pack
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Exposes vector graphic source codes directly. Use these files in HTML markup,
                  React components, or style sheets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                        1. Favicon (favicon.svg)
                      </h4>
                      <div className="p-1 border border-[#00f0ff]/20 bg-[#040914] rounded">
                        <svg viewBox="0 0 32 32" className="w-6 h-6">
                          <path
                            d="M 16 5 V 27 M 5 16 H 27"
                            stroke="#00d8ff"
                            stroke-width="1.25"
                            opacity="0.6"
                          />
                          <rect
                            x="11"
                            y="11"
                            width="10"
                            height="10"
                            rx="1.5"
                            fill="#061125"
                            stroke="#00f0ff"
                            stroke-width="2"
                          />
                          <circle cx="16" cy="16" r="2" fill="#00f0ff" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-sans">
                      A lightweight core blueprint node designed for tab indicators, shortcuts, or
                      micro-avatars.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(faviconSvg, 'asset-fav')}
                      className="flex-1 py-1.5 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === 'asset-fav' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'asset-fav' ? 'Copied' : 'Copy SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownload(faviconSvg, 'favicon.svg', 'image/svg+xml')}
                      className="py-1.5 px-3 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer"
                      title="Download SVG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="border border-[#00f0ff]/10 rounded-xl p-4 bg-[#040914]/40 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                        2. Blueprint Grid (grid.svg)
                      </h4>
                      <div className="w-8 h-8 rounded border border-[#00f0ff]/20 bg-[#040914] bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-sans">
                      Repeating pattern forming seamless blueprint graph grids. Ideal as a
                      repeatable CSS background.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(gridSvg, 'asset-grid')}
                      className="flex-1 py-1.5 border border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === 'asset-grid' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'asset-grid' ? 'Copied' : 'Copy SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownload(gridSvg, 'grid.svg', 'image/svg+xml')}
                      className="py-1.5 px-3 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer"
                      title="Download SVG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Design System Schematic Icons
                </h3>
                <p className="text-xs text-slate-400">
                  Customized vector icons representing typical node formats rendered using glowing
                  outlines.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Web App', icon: Monitor },
                    { label: 'Mobile Device', icon: Smartphone },
                    { label: 'Microservice', icon: Cpu },
                    { label: 'Database Cyl', icon: Database },
                    { label: 'REST Endpoint', icon: Globe },
                    { label: 'Lambda Trigger', icon: Zap },
                  ].map((node, i) => (
                    <div
                      key={i}
                      className="border border-[#00f0ff]/10 rounded-xl p-3 bg-[#040914]/60 text-center flex flex-col items-center justify-center space-y-2"
                    >
                      <node.icon className="w-7 h-7 text-[#00f0ff] filter drop-shadow-[0_0_4px_rgba(0,240,255,0.5)]" />
                      <div className="text-[10px] font-mono text-slate-300">{node.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-8 animate-fade-in max-h-[600px] overflow-y-auto pr-2">
              <div className="border-b border-[#00f0ff]/10 pb-4 sticky top-0 bg-[#061125]/90 backdrop-blur-md z-10">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#00f0ff]" /> UI Component Standards
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Reusable UI patterns styled explicitly using the blueprint and glassmorphic
                  variables.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  1. Action Buttons
                </h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <button className="px-4 py-2 bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border border-[#00f0ff]/40 hover:border-[#00f0ff] rounded-lg text-xs font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)] hover:shadow-[0_0_15px_rgba(0,240,255,0.35)] transition cursor-pointer">
                    Primary Glow
                  </button>

                  <button className="px-4 py-2 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 hover:bg-[#00f0ff]/5 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer">
                    Outline Blueprint
                  </button>

                  <button className="px-4 py-2 border border-dashed border-[#00f0ff]/30 hover:border-brand-500/80 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer">
                    Dashed Target
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  2. Glassmorphic Blueprint Cards
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-[#00f0ff] uppercase tracking-wider">
                        Container Block
                      </h4>
                      <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                        Features faint cyan borders (
                        <code className="text-[#00f0ff] font-mono">
                          1px solid rgba(0, 240, 255, 0.15)
                        </code>
                        ) and heavy glass blurs (
                        <code className="text-[#00f0ff] font-mono">blur(12px)</code>) stacked over
                        deep card offsets.
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">CLASS: glass-panel</div>
                  </div>

                  <div className="glass-panel-light p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
                        Subtle Component
                      </h4>
                      <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                        Features lighter backdrops (
                        <code className="text-[#00f0ff] font-mono">rgba(255, 255, 255, 0.02)</code>)
                        for inner items or nesting panels.
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CLASS: glass-panel-light
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  3. Level Badges & Status Markers
                </h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 border border-emerald-900/40 text-emerald-400 font-mono">
                    Context
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950/80 border border-blue-900/40 text-blue-400 font-mono">
                    Container
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950/80 border border-purple-900/40 text-purple-400 font-mono">
                    Component
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 border border-amber-900/40 text-amber-400 font-mono">
                    Code
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  4. Terminal Form Inputs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Input Node Name
                    </label>
                    <input
                      type="text"
                      placeholder="MyServiceComponent"
                      className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none transition duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Select Format
                    </label>
                    <select className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none transition duration-200 cursor-pointer">
                      <option>microservice</option>
                      <option>relational-database</option>
                      <option>event-broker</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sandbox' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-[#00f0ff]/10 pb-4">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#00f0ff]" /> Interactive Component Sandbox
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust options below to live customize a blueprint node component card, verifying
                  the design system's reactivity.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sandbox Controls */}
                <div className="lg:col-span-5 bg-[#040914]/60 border border-[#00f0ff]/10 rounded-xl p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Node Title
                    </label>
                    <input
                      type="text"
                      value={sandboxTitle}
                      onChange={e => setSandboxTitle(e.target.value)}
                      className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Type Symbol
                    </label>
                    <select
                      value={sandboxNodeType}
                      onChange={e => setSandboxNodeType(e.target.value as any)}
                      className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="person">Person (Actor)</option>
                      <option value="web-app">Web App</option>
                      <option value="database">Database</option>
                      <option value="microservice">Microservice</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Description
                    </label>
                    <textarea
                      value={sandboxDesc}
                      onChange={e => setSandboxDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-[#040914] border border-[#00f0ff]/25 focus:border-[#00f0ff] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                      Status Level
                    </label>
                    <div className="flex gap-2">
                      {['healthy', 'warning', 'error'].map(s => (
                        <button
                          key={s}
                          onClick={() => setSandboxStatus(s as any)}
                          className={`flex-1 py-1 rounded text-[10px] font-mono capitalize border transition ${
                            sandboxStatus === s
                              ? s === 'healthy'
                                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                                : s === 'warning'
                                  ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                                  : 'bg-red-950/80 border-red-500 text-red-400'
                              : 'border-[#00f0ff]/10 text-slate-450 hover:bg-slate-900/40'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview Panel */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Live Renderer Output
                  </h3>

                  {/* Glowing Node Component */}
                  <div className="p-8 border border-dashed border-[#00f0ff]/25 bg-[#040914]/80 rounded-2xl flex items-center justify-center min-h-[180px]">
                    <div className="w-80 glass-panel border border-[#00f0ff]/30 p-4 rounded-xl flex flex-col space-y-3 relative group overflow-hidden">
                      {/* Connection Handle indicators */}
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00f0ff] border-2 border-[#040914] rounded-full shadow-[0_0_6px_#00f0ff]" />
                      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00f0ff] border-2 border-[#040914] rounded-full shadow-[0_0_6px_#00f0ff]" />

                      {/* Title & Icon Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 border border-[#00f0ff]/30 rounded bg-cyan-950/10">
                            {sandboxNodeType === 'person' && (
                              <Cpu className="w-4 h-4 text-[#00f0ff]" />
                            )}
                            {sandboxNodeType === 'web-app' && (
                              <Monitor className="w-4 h-4 text-[#00f0ff]" />
                            )}
                            {sandboxNodeType === 'database' && (
                              <Database className="w-4 h-4 text-[#00f0ff]" />
                            )}
                            {sandboxNodeType === 'microservice' && (
                              <Cpu className="w-4 h-4 text-[#00f0ff]" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-white font-mono tracking-tight leading-none">
                              {sandboxTitle}
                            </h4>
                            <span className="text-[8px] text-[#00f0ff] font-mono uppercase tracking-wider mt-1 block">
                              {sandboxNodeType}
                            </span>
                          </div>
                        </div>

                        {/* Status Marker */}
                        <span
                          className={`w-2 h-2 rounded-full ${
                            sandboxStatus === 'healthy'
                              ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                              : sandboxStatus === 'warning'
                                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                                : 'bg-red-500 shadow-[0_0_8px_#f43f5e]'
                          }`}
                        />
                      </div>

                      {/* Description */}
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-2 border-t border-slate-900 pt-2.5">
                        {sandboxDesc || 'No component description provided...'}
                      </p>
                    </div>
                  </div>

                  {/* Schema export preview */}
                  <div className="bg-[#040914]/90 border border-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-300">
                    <div className="text-[#00f0ff] mb-1 font-bold">
                      // Serialized YAML Model Output:
                    </div>
                    <div>id: {sandboxTitle.toLowerCase().replace(/\s+/g, '-')}</div>
                    <div>title: {sandboxTitle}</div>
                    <div>type: {sandboxNodeType}</div>
                    <div>description: {sandboxDesc}</div>
                    <div>status: {sandboxStatus}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

const SHORTCUTS: { section: string; rows: ShortcutRow[] }[] = [
  {
    section: 'Search & navigation',
    rows: [
      { keys: ['⌘', 'K'], description: 'Open search' },
      { keys: ['/'], description: 'Open search' },
      { keys: ['Esc'], description: 'Zoom out one C4 level' },
      { keys: ['⌫'], description: 'Zoom out one C4 level' },
    ],
  },
  {
    section: 'Editing',
    rows: [
      { keys: ['⌘', 'Z'], description: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
      { keys: ['⌘', 'Y'], description: 'Redo (Windows)' },
    ],
  },
  {
    section: 'Panels',
    rows: [
      { keys: ['Schema / Props'], description: 'Open side panels on mobile (bottom chips)' },
      { keys: ['Edge arrows'], description: 'Collapse or expand panels on desktop' },
    ],
  },
  {
    section: 'Help',
    rows: [{ keys: ['?'], description: 'Show this shortcuts panel' }],
  },
];

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[10px] font-mono font-semibold text-slate-300 shadow-sm">
      {children}
    </kbd>
  );
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      data-testid="keyboard-shortcuts-dialog"
    >
      <div
        className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-[#00f0ff]" />
              <h2 id="shortcuts-title" className="text-base font-bold text-white">
                Keyboard shortcuts
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close shortcuts"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5 max-h-[min(70vh,480px)] overflow-y-auto">
            {SHORTCUTS.map(group => (
              <div key={group.section}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {group.section}
                </h3>
                <ul className="space-y-2">
                  {group.rows.map(row => (
                    <li
                      key={row.description}
                      className="flex items-center justify-between gap-4 text-xs"
                    >
                      <span className="text-slate-400">{row.description}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {row.keys.map((key, i) => (
                          <KeyCap key={`${row.description}-${i}`}>{key}</KeyCap>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[10px] text-slate-600 pt-2 border-t border-slate-900">
              On Windows/Linux, use Ctrl instead of ⌘. Shortcuts are disabled while typing in
              inputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

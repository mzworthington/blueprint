import React from 'react';
import { Search, X } from 'lucide-react';
import { useSearchbar } from './useSearchbar';

export const Searchbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    isOpen,
    setIsOpen,
    activeIndex,
    containerRef,
    inputRef,
    filteredNodes,
    kbdText,
    handleSelectNode,
    handleKeyDown,
  } = useSearchbar();

  return (
    <div
      ref={containerRef}
      className="relative select-none shrink-0 w-full sm:w-44 md:w-52"
      onClick={e => e.stopPropagation()}
    >
      <div className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 focus-within:border-brand-500 rounded-lg transition-colors flex items-center gap-2 px-2.5 py-1.5">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          aria-label="Search nodes"
          className="bg-transparent border-none outline-none text-slate-200 text-xs w-full placeholder-slate-500 font-mono min-w-0"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setSearchQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            data-testid="search-clear-button"
            className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[9px] text-slate-300 font-mono shrink-0">
            {kbdText}
          </kbd>
        )}
      </div>

      {isOpen && searchQuery && (
        <div className="absolute bottom-full left-0 right-0 sm:right-auto sm:w-80 mb-2 bg-slate-950/95 border border-slate-850 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto backdrop-blur-md z-50">
          {filteredNodes.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              {filteredNodes.map((node, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={node.entityRef}
                    type="button"
                    onClick={() => handleSelectNode(node.entityRef || '')}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 font-mono text-xs transition-colors cursor-pointer focus:outline-none ${
                      isActive
                        ? 'bg-brand-950/40 text-[#00f0ff] border border-brand-500/20'
                        : 'text-slate-300 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{node.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{node.entityRef}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400 capitalize shrink-0">
                      {node.type.replace('-', ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">
              No matching nodes found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

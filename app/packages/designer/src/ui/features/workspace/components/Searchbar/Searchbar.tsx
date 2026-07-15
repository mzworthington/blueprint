import React from 'react';
import { Search, X } from 'lucide-react';
import { useSearchbar } from './useSearchbar';

export const Searchbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    isOpen,
    setIsOpen,
    isExpanded,
    setIsExpanded,
    activeIndex,
    containerRef,
    inputRef,
    filteredNodes,
    kbdText,
    handleSelectNode,
    handleKeyDown,
    handleContainerClick,
  } = useSearchbar();

  return (
    <div ref={containerRef} className="relative select-none z-50">
      <div
        onClick={handleContainerClick}
        className={`bg-slate-900 border border-slate-850 hover:border-slate-800 focus-within:border-brand-500 rounded-xl transition-all duration-300 flex items-center gap-2 ${
          isExpanded
            ? 'absolute right-0 top-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-[280px] px-3 py-1.5 sm:relative sm:top-auto sm:translate-y-0 sm:w-64 sm:focus-within:w-80'
            : 'w-9 h-9 p-0 justify-center cursor-pointer sm:w-64 sm:focus-within:w-80 sm:px-3 sm:py-1.5 sm:justify-start sm:cursor-default'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setIsExpanded(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          className={`bg-transparent border-none outline-none text-slate-200 text-xs w-full placeholder-slate-500 font-mono ${
            isExpanded ? 'block' : 'hidden sm:block'
          }`}
        />
        {searchQuery ? (
          <button
            onClick={e => {
              e.stopPropagation();
              setSearchQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            data-testid="search-clear-button"
            className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : isExpanded ? (
          <button
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(false);
              setIsOpen(false);
            }}
            className="sm:hidden text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] text-slate-500 font-mono shrink-0">
            {kbdText}
          </kbd>
        )}
      </div>

      {isOpen && searchQuery && (
        <div
          className={`absolute top-full mt-2 right-0 w-80 bg-slate-950/95 border border-slate-850 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto backdrop-blur-md ${
            isExpanded ? 'block' : 'hidden sm:block'
          }`}
        >
          {filteredNodes.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              {filteredNodes.map((node, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={node.entityRef}
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

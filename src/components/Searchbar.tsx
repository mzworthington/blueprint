import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useBlueprintStore } from '../store/store';
import { useReactFlow } from '@xyflow/react';

export const Searchbar: React.FC = () => {
  const { schema, showTests, selectNode } = useBlueprintStore();
  const reactFlowInstance = useReactFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
        setIsOpen(true);
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return schema.nodes.filter(n => {
      if (!showTests && n.isTest) return false;
      const matchName = n.name?.toLowerCase().includes(q);
      const matchId = n.id?.toLowerCase().includes(q);
      const matchType = n.type?.toLowerCase().includes(q);
      const matchProps =
        n.properties &&
        Object.values(n.properties).some(val => String(val).toLowerCase().includes(q));
      return matchName || matchId || matchType || matchProps;
    });
  }, [schema.nodes, searchQuery, showTests]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  const handleSelectNode = (nodeId: string) => {
    selectNode(nodeId);
    setSearchQuery('');
    setIsOpen(false);
    setIsExpanded(false);

    try {
      const rfNode = reactFlowInstance.getNode(nodeId);
      if (rfNode && rfNode.position) {
        const x = rfNode.position.x + (rfNode.measured?.width ?? 280) / 2;
        const y = rfNode.position.y + (rfNode.measured?.height ?? 100) / 2;
        reactFlowInstance.setCenter(x, y, { zoom: 1.15, duration: 800 });
      }
    } catch {
      // ReactFlow instance or node position might not be fully initialized in test environment
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsExpanded(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNodes[activeIndex]) {
        handleSelectNode(filteredNodes[activeIndex].id);
      }
    }
  };

  const handleContainerClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const kbdText = isMac ? '⌘K' : 'Ctrl+K';

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
                    key={node.id}
                    onClick={() => handleSelectNode(node.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 font-mono text-xs transition-colors cursor-pointer focus:outline-none ${
                      isActive
                        ? 'bg-brand-950/40 text-[#00f0ff] border border-brand-500/20'
                        : 'text-slate-300 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{node.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{node.id}</div>
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

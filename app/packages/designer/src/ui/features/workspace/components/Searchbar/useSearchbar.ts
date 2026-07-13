import { useState, useEffect, useRef, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBlueprintStore } from '../../../../../application/store/store';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

export interface UseSearchbarReturn {
  // State
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  activeIndex: number;
  // Refs
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  // Derived
  filteredNodes: ReturnType<typeof useBlueprintStore.getState>['schema']['nodes'];
  kbdText: string;
  // Handlers
  handleSelectNode: (nodeId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleContainerClick: () => void;
}

export function useSearchbar(): UseSearchbarReturn {
  const { schema, showTests, selectNode } = useBlueprintStore();
  const reactFlowInstance = useReactFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
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

  // Centralized keyboard navigation for search shortcuts
  useKeyboardNavigation({
    onSearchOpen: () => {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 50);
      setIsOpen(true);
    },
  });

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

  // Reset highlighted index whenever the query changes
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

  return {
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
  };
}

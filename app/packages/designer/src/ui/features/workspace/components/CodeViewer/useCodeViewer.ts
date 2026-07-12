import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { serializeSchemaToMermaid, serializeSchemaToYaml } from '../../../../../core';

type Tab = 'yaml' | 'json' | 'mermaid' | 'manifest' | 'import';
type MermaidMode = 'preview' | 'code';

export interface UseCodeViewerReturn {
  // State
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  copied: boolean;
  mermaidMode: MermaidMode;
  setMermaidMode: (mode: MermaidMode) => void;
  importText: string;
  setImportText: (text: string) => void;
  manifestText: string;
  setManifestText: (text: string) => void;
  // Derived
  availableTabs: readonly Tab[];
  filteredSchema: ReturnType<typeof buildFilteredSchema>;
  // Handlers
  getCodeContent: () => string;
  handleCopy: () => Promise<void>;
  handleImport: () => void;
  handleSaveManifest: () => Promise<void>;
  // Navigation
  navigateToDesignSystem: () => void;
  // Store passthrough
  lastError: string | null;
  clearError: () => void;
  leftCollapsed: boolean;
  toggleLeftCollapsed: () => void;
  isWorkspaceOpen: boolean;
}

function buildFilteredSchema(
  schema: ReturnType<typeof useBlueprintStore.getState>['schema'],
  showTests: boolean
) {
  if (showTests) return schema;

  const nodes = schema.nodes.filter(n => !n.isTest);
  const visibleNodeIds = new Set(nodes.map(n => n.id));
  const dependencies = schema.dependencies.filter(
    d => visibleNodeIds.has(d.from) && visibleNodeIds.has(d.to)
  );

  return { ...schema, nodes, dependencies };
}

export function useCodeViewer(): UseCodeViewerReturn {
  const {
    schema,
    yamlCode,
    importYaml,
    lastError,
    clearError,
    logger,
    showTests,
    leftCollapsed,
    toggleLeftCollapsed,
    isWorkspaceOpen,
    workspaceManifestYaml,
    saveWorkspaceManifest,
  } = useBlueprintStore();

  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('yaml');
  const [copied, setCopied] = useState(false);
  const [mermaidMode, setMermaidMode] = useState<MermaidMode>('preview');
  const [importText, setImportText] = useState('');
  const [manifestText, setManifestText] = useState('');

  useEffect(() => {
    if (workspaceManifestYaml) {
      setManifestText(workspaceManifestYaml);
    }
  }, [workspaceManifestYaml]);

  useEffect(() => {
    if (activeTab === 'import' && !importText) {
      setImportText(yamlCode);
    }
  }, [activeTab, yamlCode, importText]);

  const filteredSchema = useMemo(() => buildFilteredSchema(schema, showTests), [schema, showTests]);

  const getCodeContent = () => {
    switch (activeTab) {
      case 'json':
        return JSON.stringify(filteredSchema, null, 2);
      case 'mermaid':
        return serializeSchemaToMermaid(filteredSchema);
      case 'yaml':
      default:
        return showTests ? yamlCode : serializeSchemaToYaml(filteredSchema);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCodeContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy schema configuration to clipboard', err);
    }
  };

  const handleImport = () => {
    const success = importYaml(importText);
    if (success) {
      setActiveTab('yaml');
      setImportText('');
    }
  };

  const handleSaveManifest = async () => {
    await saveWorkspaceManifest(manifestText);
  };

  const navigateToDesignSystem = () => setLocation('/design-system');

  const availableTabs =
    isWorkspaceOpen || workspaceManifestYaml
      ? (['yaml', 'json', 'mermaid', 'manifest', 'import'] as const)
      : (['yaml', 'json', 'mermaid', 'import'] as const);

  return {
    activeTab,
    setActiveTab,
    copied,
    mermaidMode,
    setMermaidMode,
    importText,
    setImportText,
    manifestText,
    setManifestText,
    availableTabs,
    filteredSchema,
    getCodeContent,
    handleCopy,
    handleImport,
    handleSaveManifest,
    navigateToDesignSystem,
    lastError,
    clearError,
    leftCollapsed,
    toggleLeftCollapsed,
    isWorkspaceOpen,
  };
}

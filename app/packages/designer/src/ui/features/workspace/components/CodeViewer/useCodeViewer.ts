import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { serializeSchemaToMermaid, serializeSchemaToYaml } from '@blueprint/core';

type Tab = 'yaml' | 'json' | 'mermaid';
type MermaidMode = 'preview' | 'code';

export interface UseCodeViewerReturn {
  // State
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  copied: boolean;
  mermaidMode: MermaidMode;
  setMermaidMode: (mode: MermaidMode) => void;
  yamlText: string;
  setYamlText: (text: string) => void;
  jsonText: string;
  setJsonText: (text: string) => void;
  // Derived
  availableTabs: readonly Tab[];
  filteredSchema: ReturnType<typeof buildFilteredSchema>;
  // Handlers
  getCodeContent: () => string;
  handleCopy: () => Promise<void>;
  handleSaveYaml: () => boolean;
  handleSaveJson: () => boolean;
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
  const visibleNodeIds = new Set(nodes.map(n => n.entityRef));
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
    importJson,
    lastError,
    clearError,
    logger,
    showTests,
    leftCollapsed,
    toggleLeftCollapsed,
    isWorkspaceOpen,
  } = useBlueprintStore();

  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('yaml');
  const [copied, setCopied] = useState(false);
  const [mermaidMode, setMermaidMode] = useState<MermaidMode>('preview');
  const [yamlText, setYamlText] = useState('');
  const [jsonText, setJsonText] = useState('');

  const filteredSchema = useMemo(() => buildFilteredSchema(schema, showTests), [schema, showTests]);

  const expectedYaml = useMemo(() => {
    return showTests ? yamlCode : serializeSchemaToYaml(filteredSchema);
  }, [showTests, yamlCode, filteredSchema]);

  const expectedJson = useMemo(() => {
    return showTests ? JSON.stringify(schema, null, 2) : JSON.stringify(filteredSchema, null, 2);
  }, [showTests, schema, filteredSchema]);

  useEffect(() => {
    setYamlText(expectedYaml);
  }, [expectedYaml]);

  useEffect(() => {
    setJsonText(expectedJson);
  }, [expectedJson]);

  const getCodeContent = () => {
    switch (activeTab) {
      case 'json':
        return jsonText;
      case 'mermaid':
        return serializeSchemaToMermaid(filteredSchema);
      case 'yaml':
      default:
        return yamlText;
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

  const handleSaveYaml = () => {
    return importYaml(yamlText);
  };

  const handleSaveJson = () => {
    return importJson(jsonText);
  };

  const navigateToDesignSystem = () => setLocation('/design-system');

  const availableTabs = ['yaml', 'json', 'mermaid'] as const;

  return {
    activeTab,
    setActiveTab,
    copied,
    mermaidMode,
    setMermaidMode,
    yamlText,
    setYamlText,
    jsonText,
    setJsonText,
    availableTabs,
    filteredSchema,
    getCodeContent,
    handleCopy,
    handleSaveYaml,
    handleSaveJson,
    navigateToDesignSystem,
    lastError,
    clearError,
    leftCollapsed,
    toggleLeftCollapsed,
    isWorkspaceOpen,
  };
}

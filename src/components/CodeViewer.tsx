import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, Upload, AlertCircle, Save } from 'lucide-react';
import { useBlueprintStore } from '../store/store';
import { serializeSchemaToMermaid, serializeSchemaToYaml } from '../domain/graph';
import { MermaidPreview } from './MermaidPreview';

export const CodeViewer: React.FC = () => {
  const {
    schema,
    yamlCode,
    importYaml,
    lastError,
    clearError,
    logger,
    showTests,
    leftCollapsed,
    isWorkspaceOpen,
    workspaceManifestYaml,
    saveWorkspaceManifest,
    setShowDesignSystem,
  } = useBlueprintStore();
  const [activeTab, setActiveTab] = useState<'yaml' | 'json' | 'mermaid' | 'manifest' | 'import'>(
    'yaml'
  );
  const [copied, setCopied] = useState(false);
  const [mermaidMode, setMermaidMode] = useState<'preview' | 'code'>('preview');
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

  const filteredSchema = useMemo(() => {
    if (showTests) return schema;

    const nodes = schema.nodes.filter(n => !n.isTest);
    const visibleNodeIds = new Set(nodes.map(n => n.id));
    const dependencies = schema.dependencies.filter(
      d => visibleNodeIds.has(d.from) && visibleNodeIds.has(d.to)
    );

    return {
      ...schema,
      nodes,
      dependencies,
    };
  }, [schema, showTests]);

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

  const availableTabs =
    isWorkspaceOpen || workspaceManifestYaml
      ? (['yaml', 'json', 'mermaid', 'manifest', 'import'] as const)
      : (['yaml', 'json', 'mermaid', 'import'] as const);

  return (
    <div
      className={`h-full flex flex-col bg-slate-950/80 glass-panel transition-all duration-300 ease-in-out ${
        leftCollapsed
          ? 'w-0 border-r-0 opacity-0 overflow-hidden pointer-events-none'
          : 'w-96 border-r border-slate-900'
      }`}
    >
      <div className="p-4 border-b border-slate-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/favicon.svg" className="w-6 h-6 shrink-0" alt="Blueprint Logo" />
          <h3 className="font-bold text-slate-100 tracking-tight text-base uppercase truncate">
            blueprint
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDesignSystem(true)}
            className="p-1 px-2 border border-brand-500/30 text-brand-500 hover:text-brand-300 hover:border-brand-500 hover:bg-brand-950/20 rounded text-[10px] font-bold font-mono tracking-wider transition cursor-pointer flex items-center gap-1"
            title="Open Design System View"
          >
            <span>SYSTEM</span>
          </button>
          <div className="flex items-center text-[10px] bg-slate-900/80 border border-slate-850 px-1.5 py-0.5 rounded text-slate-400 font-mono">
            v1.0.0
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-900 bg-slate-950/60 p-1">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              clearError();
            }}
            className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
              activeTab === tab
                ? 'bg-brand-600/15 border border-brand-500/30 text-brand-100 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'mermaid' ? 'Mermaid.js' : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {activeTab === 'manifest' ? (
          <div className="flex-1 flex flex-col space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Edit the Workspace Manifest configuration below:
            </p>

            <textarea
              value={manifestText}
              onChange={e => setManifestText(e.target.value)}
              placeholder="name: My Workspace&#10;root: ./blueprint-containers.yaml&#10;hierarchy:&#10;  - parent: ./blueprint-containers.yaml..."
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-500 resize-none"
            />

            {lastError && (
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 text-red-400 text-xs">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span className="break-words w-full">{lastError}</span>
              </div>
            )}

            <button
              onClick={handleSaveManifest}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg py-2.5 text-xs font-semibold shadow-lg shadow-brand-600/20 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Manifest
            </button>
          </div>
        ) : activeTab === 'import' ? (
          <div className="flex-1 flex flex-col space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Paste your Blueprint YAML schema configuration here to re-render the workspace:
            </p>

            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="name: My System&#10;version: 1.0.0&#10;nodes:&#10;  - id: api..."
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-brand-500 resize-none"
            />

            {lastError && (
              <div className="flex items-start gap-2 bg-red-950/20 border border-red-900/30 rounded-lg p-2.5 text-red-400 text-xs">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span className="break-words w-full">{lastError}</span>
              </div>
            )}

            <button
              onClick={handleImport}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg py-2.5 text-xs font-semibold shadow-lg shadow-brand-600/20 transition"
            >
              <Upload className="w-4 h-4" />
              Apply Schema
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative group">
            <div className="flex items-center justify-between mb-3 shrink-0">
              {activeTab === 'mermaid' ? (
                <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-900">
                  <button
                    onClick={() => setMermaidMode('preview')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mermaidMode === 'preview'
                        ? 'bg-brand-600/15 border border-brand-500/30 text-brand-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setMermaidMode('code')}
                    className={`px-3 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mermaidMode === 'code'
                        ? 'bg-brand-600/15 border border-brand-500/30 text-brand-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Code
                  </button>
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition flex items-center gap-1.5 text-xs font-semibold shadow-md cursor-pointer z-10"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {activeTab === 'mermaid' && mermaidMode === 'preview' ? (
              <MermaidPreview code={getCodeContent()} />
            ) : (
              <pre className="flex-1 bg-slate-900/40 border border-slate-900 rounded-xl p-4 overflow-auto text-xs font-mono text-slate-300 leading-relaxed select-all">
                <code>{getCodeContent()}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

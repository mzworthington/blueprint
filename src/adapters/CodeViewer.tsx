import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, Upload, AlertCircle, FileCode } from 'lucide-react';
import { useBlueprintStore } from './store';
import { serializeSchemaToMermaid, serializeSchemaToYaml } from '../domain/graph';
import { MermaidPreview } from './MermaidPreview';

export const CodeViewer: React.FC = () => {
  const { schema, yamlCode, importYaml, lastError, clearError, logger, showTests } =
    useBlueprintStore();
  const [activeTab, setActiveTab] = useState<'yaml' | 'json' | 'mermaid' | 'import'>('yaml');
  const [copied, setCopied] = useState(false);
  const [mermaidMode, setMermaidMode] = useState<'preview' | 'code'>('preview');

  // Local state for import textarea
  const [importText, setImportText] = useState('');

  // Sync import text when code changes, so it defaults to the current state
  useEffect(() => {
    if (activeTab === 'import' && !importText) {
      setImportText(yamlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, yamlCode]);

  // Dynamically filter schema if we exclude test components
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

  return (
    <div className="w-96 h-full flex flex-col border-r border-slate-900 bg-slate-950/80 glass-panel">
      {/* Header */}
      <div className="p-4 border-b border-slate-900 flex items-center gap-2">
        <FileCode className="w-5 h-5 text-brand-500" />
        <h3 className="font-semibold text-slate-100 tracking-tight text-base">Schema Explorer</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900 bg-slate-950/60 p-1">
        {(['yaml', 'json', 'mermaid', 'import'] as const).map(tab => (
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

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {activeTab === 'import' ? (
          // IMPORT MODE
          <div className="flex-1 flex flex-col space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
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
          // READ-ONLY VIEW MODE
          <div className="flex-1 flex flex-col overflow-hidden relative group">
            {/* Mermaid Sub-toggle */}
            {activeTab === 'mermaid' && (
              <div className="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-900 mb-3 self-end shrink-0 z-20">
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
            )}

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition flex items-center gap-1.5 text-xs font-semibold z-10 shadow-md cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Content Area (Mermaid Preview or Code Box) */}
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

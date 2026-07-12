import React from 'react';
import { Folder, Upload, Download, RefreshCcw, Link, GitCompare } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

export const ActionControls: React.FC = () => {
  const {
    isWorkspaceOpen,
    openWorkspaceDirectory,
    saveSchema,
    loadSchema,
    saveActiveDiagram,
    initSchema,
    schema,
    syncExternalContainers,
    setIsDiffOpen,
  } = useBlueprintStore();

  const handleSave = async () => {
    if (isWorkspaceOpen) {
      await saveActiveDiagram();
    } else {
      await saveSchema();
    }
  };

  const handleLoad = async () => {
    await loadSchema();
  };

  const handleClear = () => {
    if (confirm('Clear the workspace and create a blank canvas?')) {
      initSchema({
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {isWorkspaceOpen ? (
        <button
          onClick={openWorkspaceDirectory}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 transition cursor-pointer"
          title="Open another folder workspace"
        >
          <Folder className="w-3.5 h-3.5 text-brand-500" />
          <span className="hidden sm:inline">Open Folder</span>
        </button>
      ) : (
        <button
          onClick={openWorkspaceDirectory}
          className="flex items-center gap-1.5 bg-brand-600/15 border border-brand-500/30 text-brand-400 hover:bg-brand-600/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          title="Open a local directory workspace"
        >
          <Folder className="w-3.5 h-3.5 text-brand-500" />
          <span className="hidden sm:inline">Open Folder</span>
        </button>
      )}

      <button
        onClick={handleLoad}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 transition cursor-pointer"
        title="Open single YAML from disk"
      >
        <Upload className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Open File</span>
      </button>

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition cursor-pointer"
        title={isWorkspaceOpen ? 'Save diagram directly in folder' : 'Save YAML to disk'}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isWorkspaceOpen ? 'Save' : 'Save Schema'}</span>
      </button>

      {isWorkspaceOpen && schema.level === 'component' && (
        <button
          onClick={syncExternalContainers}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-[#00f0ff] hover:text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 hover:border-brand-500/20 transition cursor-pointer"
          title="Sync related container dependencies as external nodes in this view"
        >
          <Link className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync Externals</span>
        </button>
      )}

      <button
        onClick={() => setIsDiffOpen(true)}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 hover:border-amber-900/30 transition cursor-pointer"
        title="View pending local changes / diff"
        id="view-pending-changes"
      >
        <GitCompare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Pending Changes</span>
      </button>

      <button
        onClick={handleClear}
        className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/30 transition cursor-pointer"
        title="Clear canvas"
      >
        <RefreshCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

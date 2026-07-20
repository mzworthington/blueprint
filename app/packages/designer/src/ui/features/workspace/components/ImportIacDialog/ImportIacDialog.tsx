import React from 'react';
import { Cloud, FileUp, X } from 'lucide-react';
import { ImportMergePreview } from '../ImportMergePreview/ImportMergePreview';
import { KIND_OPTIONS, useImportIacDialog } from './useImportIacDialog';
import type { IacSourceKind } from '@blueprint/core';

interface ImportIacDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportIacDialog: React.FC<ImportIacDialogProps> = ({ isOpen, onClose }) => {
  const {
    sourceText,
    setSourceText,
    uploadedFiles,
    clearUploadedFiles,
    sourceKind,
    setSourceKind,
    parseError,
    preview,
    formatLabel,
    resolutions,
    setConflictResolution,
    handleFileUpload,
    handleApply,
    applying,
    canApply,
    sourceFiles,
  } = useImportIacDialog(isOpen, onClose);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? 'visible' : 'invisible pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-iac-title"
      data-testid="import-iac-dialog"
    >
      <div
        className={`fixed inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950/95 glass-panel border border-slate-800 rounded-xl shadow-2xl transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#00f0ff]" />
              <h2
                id="import-iac-title"
                className="font-bold text-[#00f0ff] uppercase tracking-wider font-mono text-xs"
              >
                Import Infrastructure
              </h2>
              {formatLabel && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-600/20 text-brand-400 border border-brand-500/30">
                  {formatLabel}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
                    IaC source
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Upload files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".tf,.tf.json,.yaml,.yml,.ts,.tsx,text/plain,application/json"
                    className="hidden"
                    onChange={e => {
                      void handleFileUpload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
                <textarea
                  value={sourceText}
                  onChange={e => {
                    setSourceText(e.target.value);
                    if (uploadedFiles.length > 0) clearUploadedFiles();
                  }}
                  disabled={uploadedFiles.length > 0}
                  placeholder={`Paste Terraform (.tf / .tf.json) or Pulumi (Pulumi.yaml / TypeScript)...\n\nresource "aws_lambda_function" "api" {\n  function_name = "api"\n}`}
                  className="w-full h-36 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500/40 resize-y disabled:opacity-50"
                  spellCheck={false}
                />
                {uploadedFiles.length > 0 && (
                  <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                    <p className="font-mono text-[10px] uppercase text-slate-500 mb-2">
                      Uploaded ({uploadedFiles.length})
                    </p>
                    <ul className="space-y-1 font-mono">
                      {uploadedFiles.map(file => (
                        <li key={file.path}>{file.path}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={clearUploadedFiles}
                      className="mt-2 text-[11px] text-brand-400 hover:text-brand-300 cursor-pointer"
                    >
                      Clear uploads
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="iac-source-kind"
                  className="text-[11px] font-mono uppercase text-slate-500 tracking-wider"
                >
                  Format
                </label>
                <select
                  id="iac-source-kind"
                  value={sourceKind}
                  onChange={e => setSourceKind(e.target.value as IacSourceKind)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  {KIND_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Terraform and Pulumi are parsed statically in the browser — no{' '}
                  <code className="text-slate-400">terraform init</code> or{' '}
                  <code className="text-slate-400">pulumi preview</code> required.
                </p>
              </div>
            </div>

            {parseError && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg p-3">
                {parseError}
              </div>
            )}

            {preview && sourceFiles.length > 0 && (
              <>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Preview</p>
                  <p className="text-xs text-slate-300">
                    {preview.parseResult.schema.nodes.length} resources,{' '}
                    {preview.parseResult.schema.dependencies.length} dependencies
                  </p>
                  <ul className="mt-2 text-xs text-slate-400 space-y-1 font-mono max-h-32 overflow-y-auto">
                    {preview.parseResult.schema.nodes.slice(0, 12).map(node => (
                      <li key={node.entityRef}>
                        {node.name}{' '}
                        <span className="text-slate-600">
                          ({node.type}
                          {node.external ? ', external' : ''})
                        </span>
                      </li>
                    ))}
                    {preview.parseResult.schema.nodes.length > 12 && (
                      <li className="text-slate-600">
                        +{preview.parseResult.schema.nodes.length - 12} more…
                      </li>
                    )}
                  </ul>
                </div>

                {preview.parseResult.warnings.length > 0 && (
                  <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-amber-300">Warnings</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {preview.parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <ImportMergePreview
                  mergePlan={preview.mergePlan}
                  resolutions={resolutions}
                  onResolutionChange={setConflictResolution}
                  footerNote="Static IaC import maps provider types to C4 infra node types. Changes stay in your draft until you commit via Pending Changes."
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-slate-800 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply || applying}
              className="px-4 py-2 text-xs font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {applying ? 'Applying…' : 'Merge into diagram'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { ValidationResult } from '@blueprint/core';
import { useBlueprintStore } from '../../../../../application/store/store';

interface ValidationSectionProps {
  validationResult: ValidationResult;
}

export const ValidationSection: React.FC<ValidationSectionProps> = ({ validationResult }) => {
  const { focusedCyclePath, setFocusedCyclePath } = useBlueprintStore();

  return (
    <div className="border-t border-slate-900 pt-4">
      <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider mb-3">
        Graph Validation
      </h4>
      {validationResult.isValid ? (
        <div className="flex items-start gap-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3.5 text-emerald-400 text-xs">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <h5 className="font-semibold leading-none mb-1">Architecture Valid</h5>
            <p className="text-[11px] text-emerald-500/80 leading-normal">
              No cyclic loops or invalid boundaries detected.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {validationResult.issues.map(issue => {
            const isCycle = issue.type === 'cycle';
            const isActive =
              isCycle &&
              focusedCyclePath &&
              issue.path &&
              focusedCyclePath.join(',') === issue.path.join(',');

            return (
              <div
                key={`${issue.type}-${issue.message}`}
                onClick={() => {
                  if (isCycle && issue.path) {
                    setFocusedCyclePath(isActive ? null : issue.path);
                  }
                }}
                className={`flex items-start gap-2.5 bg-red-950/20 border rounded-xl p-3.5 text-red-400 text-xs transition-all duration-200 ${
                  isCycle
                    ? 'cursor-pointer hover:bg-red-950/30 hover:border-red-500/40 select-none'
                    : ''
                } ${isActive ? 'border-red-500/80 bg-red-950/40' : 'border-red-900/30'}`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <h5 className="font-semibold leading-none mb-1">
                    {isCycle ? 'Circular Dependency' : 'Validation Alert'}
                  </h5>
                  <p className="text-[11px] text-red-400/80 leading-normal">{issue.message}</p>
                  {issue.path && (
                    <div className="mt-2 font-mono text-[10px] bg-red-950/40 px-2 py-1 rounded border border-red-900/40 text-red-300">
                      {issue.path.join(' ➔ ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

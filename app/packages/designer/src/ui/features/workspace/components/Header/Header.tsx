import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { AppHeader } from '../../../../components/AppHeader';
import { useBlueprintStore } from '../../../../../application/store/store';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { BreadcrumbsCompact } from '../Breadcrumbs/BreadcrumbsCompact';

export const Header: React.FC = () => {
  const { schema, validationResult } = useBlueprintStore();

  return (
    <AppHeader badge="WORKSPACE">
      <div className="min-w-0 hidden lg:block border-l border-[#00f0ff]/15 pl-4">
        <Breadcrumbs />
      </div>
      <div className="min-w-0 flex-1 lg:hidden border-l border-[#00f0ff]/15 pl-3">
        <BreadcrumbsCompact />
      </div>
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-900/40 text-blue-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
          {schema.level || 'Container'}
        </span>
        {validationResult.isValid ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-955/20 px-2 py-0.5 rounded border border-emerald-900/30">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>Valid</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-955/20 px-2 py-0.5 rounded border border-red-900/30 animate-pulse">
            <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
            <span>Cycle Detected</span>
          </span>
        )}
      </div>
    </AppHeader>
  );
};

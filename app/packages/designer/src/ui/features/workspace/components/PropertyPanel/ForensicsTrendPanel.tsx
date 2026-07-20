import React from 'react';
import type { ForensicsTrendDashboard } from '../../../../../application/forensics/buildForensicsTrendDashboard';
import { ChurnSparkline } from '../../../../components/ChurnSparkline/ChurnSparkline';
import { MicroBarChart } from '../../../../components/MicroBarChart/MicroBarChart';

interface ForensicsTrendPanelProps {
  dashboard: ForensicsTrendDashboard;
}

function TrendCard({
  title,
  help,
  summary,
  children,
  testId,
}: {
  title: string;
  help: string;
  summary?: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      className="bg-slate-950/40 rounded-xl px-3 py-2.5 border border-slate-900"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-brand-400/80 text-[10px] uppercase tracking-wider">
          {title}
        </span>
        {summary ? (
          <span className="text-[10px] font-semibold text-slate-400">{summary}</span>
        ) : null}
      </div>
      <div className="flex items-end justify-end text-[#00f0ff]/80 min-h-[24px]">{children}</div>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">{help}</p>
    </div>
  );
}

export const ForensicsTrendPanel: React.FC<ForensicsTrendPanelProps> = ({ dashboard }) => {
  const churnTotal = dashboard.churnByWeek?.reduce((sum, value) => sum + value, 0) ?? 0;
  const authorTotal = dashboard.authorBuckets.reduce((sum, value) => sum + value, 0);
  const complexityTotal = dashboard.complexityBuckets.reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-2 mb-3" data-testid="forensics-trend-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Trend dashboard
        </p>
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">
          {dashboard.scope === 'rollup' ? `${dashboard.fileCount} files` : 'This file'}
        </span>
      </div>

      {dashboard.churnByWeek && dashboard.churnByWeek.length > 0 ? (
        <TrendCard
          title="Churn"
          summary={`${churnTotal} commits`}
          help="Weekly commit count over the lookback window (oldest week on the left)."
          testId="forensics-trend-churn"
        >
          <ChurnSparkline data={dashboard.churnByWeek} width={120} height={28} />
        </TrendCard>
      ) : null}

      {authorTotal > 0 ? (
        <TrendCard
          title="Authors"
          summary={`${authorTotal} files`}
          help="Files grouped by distinct author count in the lookback window."
          testId="forensics-trend-authors"
        >
          <MicroBarChart
            data={dashboard.authorBuckets}
            labels={dashboard.authorBucketLabels}
            width={120}
            height={28}
          />
        </TrendCard>
      ) : null}

      {complexityTotal > 0 ? (
        <TrendCard
          title="Complexity"
          summary={`${complexityTotal} files`}
          help="Cyclomatic complexity spread across files under this node."
          testId="forensics-trend-complexity"
        >
          <MicroBarChart
            data={dashboard.complexityBuckets}
            labels={dashboard.complexityBucketLabels}
            width={120}
            height={28}
          />
        </TrendCard>
      ) : null}
    </div>
  );
};

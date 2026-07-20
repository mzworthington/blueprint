import React, { useMemo } from 'react';

export interface ChurnSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Display-only micro chart for weekly churn counts (oldest week on the left).
 */
export const ChurnSparkline: React.FC<ChurnSparklineProps> = ({
  data,
  width = 96,
  height = 24,
  className = '',
}) => {
  const points = useMemo(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data, 1);
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    return data
      .map((value, index) => {
        const x = data.length > 1 ? index * stepX : width / 2;
        const y = height - (value / max) * (height - 2) - 1;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      data-testid="churn-sparkline"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

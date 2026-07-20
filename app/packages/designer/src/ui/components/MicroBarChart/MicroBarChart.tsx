import React, { useMemo } from 'react';

export interface MicroBarChartProps {
  data: number[];
  labels?: readonly string[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Display-only vertical micro bar chart for forensics histograms.
 */
export const MicroBarChart: React.FC<MicroBarChartProps> = ({
  data,
  labels,
  width = 96,
  height = 24,
  className = '',
}) => {
  const bars = useMemo(() => {
    if (data.length === 0) return [];
    const max = Math.max(...data, 1);
    const gap = 2;
    const barWidth = Math.max(4, (width - gap * (data.length - 1)) / data.length);
    return data.map((value, index) => {
      const barHeight = value > 0 ? Math.max(2, (value / max) * (height - 2)) : 0;
      const x = index * (barWidth + gap);
      const y = height - barHeight - 1;
      return { x, y, barWidth, barHeight, value, label: labels?.[index] };
    });
  }, [data, labels, width, height]);

  if (data.length === 0 || data.every(value => value === 0)) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      data-testid="micro-bar-chart"
      aria-hidden
    >
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.barWidth}
          height={bar.barHeight}
          rx={1}
          fill="currentColor"
          opacity={bar.value > 0 ? 0.9 : 0.2}
        >
          {bar.label ? <title>{`${bar.label}: ${bar.value}`}</title> : null}
        </rect>
      ))}
    </svg>
  );
};

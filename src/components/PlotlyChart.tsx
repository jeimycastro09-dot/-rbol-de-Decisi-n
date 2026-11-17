import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  data: Plotly.PlotData[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  className?: string;
  ariaLabel: string;
}

export function PlotlyChart({
  data,
  layout = {},
  config = {},
  className = 'w-full h-80',
  ariaLabel,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const baseXAxis = (layout.xaxis as Record<string, unknown> | undefined) ?? {};
    const baseYAxis = (layout.yaxis as Record<string, unknown> | undefined) ?? {};

    const mergedLayout: Partial<Plotly.Layout> = {
      font: {
        family: 'Plus Jakarta Sans, sans-serif',
        color: '#E2ECFF',
        size: 12,
      },
      paper_bgcolor: 'rgba(16, 26, 50, 0)',
      plot_bgcolor: 'rgba(8, 15, 34, 0.72)',
      margin: { t: 36, r: 24, b: 48, l: 56 },
      ...layout,
      legend: {
        font: { color: '#E2ECFF', size: 11 },
        bgcolor: 'rgba(16, 26, 50, 0)',
        ...((layout.legend as Record<string, unknown> | undefined) ?? {}),
      },
      hoverlabel: {
        bgcolor: '#0D1730',
        bordercolor: '#25E5F2',
        font: { color: '#F0F7FF', size: 12 },
        ...((layout.hoverlabel as Record<string, unknown> | undefined) ?? {}),
      },
      xaxis: {
        color: '#CBD5E1',
        gridcolor: 'rgba(37, 229, 242, 0.12)',
        zerolinecolor: 'rgba(37, 229, 242, 0.24)',
        linecolor: 'rgba(37, 229, 242, 0.25)',
        ...baseXAxis,
      },
      yaxis: {
        color: '#CBD5E1',
        gridcolor: 'rgba(37, 229, 242, 0.12)',
        zerolinecolor: 'rgba(37, 229, 242, 0.24)',
        linecolor: 'rgba(37, 229, 242, 0.25)',
        ...baseYAxis,
      },
    };

    const mergedConfig: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
      ...config,
    };

    Plotly.react(el, data, mergedLayout, mergedConfig);

    const observer = new ResizeObserver(() => {
      if (el) {
        Plotly.react(el, data, mergedLayout, mergedConfig);
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      Plotly.purge(el);
    };
  }, [data, layout, config]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
    />
  );
}

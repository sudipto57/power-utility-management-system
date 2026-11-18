import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';
import { formatNumber } from '../../utils/format';

// Each bar fades from its colour (top) to a lighter version of it (bottom)
function gradientFill(context, color) {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return color; // very first draw: the chart size is not known yet
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, `${color}55`);
  return gradient;
}

/**
 * <BarChart labels={['Aug', 'Sep']} series={[{ label: 'Billed', data: [1, 2], color: '#f59e0b' }]} />
 * money=true formats the y axis with thousands separators.
 */
export default function BarChart({ labels, series, height = 280, stacked = false }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        backgroundColor: (context) => gradientFill(context, s.color),
        hoverBackgroundColor: s.color,
        borderRadius: 10,
        borderSkipped: false,
        maxBarThickness: 34,
      })),
    }),
    [labels, series]
  );

  const options = useMemo(
    () => ({
      plugins: { legend: { display: series.length > 1, position: 'bottom' } },
      scales: {
        x: { stacked, grid: { display: false }, border: { display: false } },
        y: {
          stacked,
          beginAtZero: true,
          border: { display: false },
          ticks: { callback: (value) => formatNumber(value) }, // same digit grouping as the rest of the site
        },
      },
    }),
    [series.length, stacked]
  );

  return <ChartCanvas type="bar" data={data} options={options} height={height} />;
}

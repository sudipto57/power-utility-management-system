import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';

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
        backgroundColor: s.color,
        hoverBackgroundColor: s.color,
        borderRadius: 8,
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
          grid: { color: '#f1f5f9' },
          ticks: { callback: (value) => Number(value).toLocaleString('en-US') },
        },
      },
    }),
    [series.length, stacked]
  );

  return <ChartCanvas type="bar" data={data} options={options} height={height} />;
}

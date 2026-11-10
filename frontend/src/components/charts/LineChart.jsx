import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';

/** Smooth line with a soft filled area. series: [{ label, data, color }] */
export default function LineChart({ labels, series, height = 280 }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: `${s.color}22`,
        pointBackgroundColor: '#fff',
        pointBorderColor: s.color,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      })),
    }),
    [labels, series]
  );

  const options = useMemo(
    () => ({
      plugins: { legend: { display: series.length > 1, position: 'bottom' } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: '#f1f5f9' },
          ticks: { callback: (value) => Number(value).toLocaleString('en-US') },
        },
      },
    }),
    [series.length]
  );

  return <ChartCanvas type="line" data={data} options={options} height={height} />;
}

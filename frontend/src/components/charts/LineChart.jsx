import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';
import { formatNumber } from '../../utils/format';

// Each line gets its own point shape and dash, so lines differ by more than colour
const POINTS = ['circle', 'rectRot', 'triangle', 'rect'];
const DASHES = [[], [6, 4], [2, 3], [10, 4]];

/** Smooth line with a soft filled area. series: [{ label, data, color }] */
export default function LineChart({ labels, series, height = 280 }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s, i) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: `${s.color}22`,
        borderDash: DASHES[i % DASHES.length],
        pointStyle: POINTS[i % POINTS.length],
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
          ticks: { callback: (value) => formatNumber(value) }, // same digit grouping as the rest of the site
        },
      },
    }),
    [series.length]
  );

  return <ChartCanvas type="line" data={data} options={options} height={height} />;
}

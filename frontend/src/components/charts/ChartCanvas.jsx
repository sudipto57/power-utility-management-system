import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Same font + colours for every chart
Chart.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#64748b';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 10;

/**
 * Draws one Chart.js chart. Pass `data` and `options` built with useMemo,
 * so the chart is only re-drawn when the data really changes.
 */
export default function ChartCanvas({ type, data, options, height = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        ...options,
      },
    });
    return () => chart.destroy();
  }, [type, data, options]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import useTheme from '../../hooks/useTheme';

// Same font + colours for every chart
Chart.defaults.font.family = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.font.weight = 600; // bolder chart labels
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
  const { dark } = useTheme();

  useEffect(() => {
    // Text and grid-line colours for light / dark mode (the chart is drawn again when the mode changes)
    Chart.defaults.color = dark ? '#94a3b8' : '#64748b';
    Chart.defaults.borderColor = dark ? '#1e293b' : '#f1f5f9';
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
  }, [type, data, options, dark]);

  return (
    <div className="relative" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

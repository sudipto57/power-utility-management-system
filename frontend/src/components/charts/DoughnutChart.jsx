import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';
import useTheme from '../../hooks/useTheme';

/** <DoughnutChart labels={['Paid', 'Unpaid']} values={[5, 3]} colors={[CHART_COLORS.emerald, CHART_COLORS.amber]} /> */
export default function DoughnutChart({ labels, values, colors, height = 260 }) {
  const { dark } = useTheme();
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          hoverBackgroundColor: colors,
          borderColor: dark ? '#1f1b17' : '#ffffff', // gap between the slices = card colour
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    }),
    [labels, values, colors, dark]
  );

  const options = useMemo(
    () => ({
      cutout: '68%',
      plugins: { legend: { position: 'bottom' } },
      animation: { animateRotate: true, animateScale: true, duration: 1000 },
    }),
    []
  );

  return <ChartCanvas type="doughnut" data={data} options={options} height={height} />;
}

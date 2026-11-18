import { useMemo } from 'react';
import ChartCanvas from './ChartCanvas';
import useTheme from '../../hooks/useTheme';

/** <DoughnutChart labels={['Paid', 'Unpaid']} values={[5, 3]} colors={['#10b981', '#f59e0b']} /> */
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
          borderColor: dark ? '#0f172a' : '#ffffff', // gap between the slices = card colour
          borderWidth: 3,
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

import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { PublicStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: PublicStats['charts']['service_status'] | null;
  loading: boolean;
  error: boolean;
}

export default function ServiceStatusDonut({ data, loading, error }: Props) {
  const total = data ? data.completed + data.ongoing + data.pending : 0;
  const chartData = {
    labels: ['Completed', 'Ongoing', 'Pending'],
    datasets: [
      {
        data: data ? [data.completed, data.ongoing, data.pending] : [0, 0, 0],
        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b'],
        borderColor: '#18181b',
        borderWidth: 3,
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#a1a1aa',
          font: { size: 11 },
          padding: 16,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#ffffff',
        bodyColor: '#a1a1aa',
        borderColor: '#27272a',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => ` ${context.label}: ${context.parsed}`,
        },
      },
    },
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
      <p className="text-sm font-semibold text-white mb-5">Service Status</p>
      <div className="h-52">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500">Could not load data</p>
          </div>
        )}
        {!loading && !error && total === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500">No service status data yet</p>
          </div>
        )}
        {!loading && !error && total > 0 && <Doughnut data={chartData} options={options} />}
      </div>
    </div>
  );
}
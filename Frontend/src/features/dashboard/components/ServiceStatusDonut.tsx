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
        backgroundColor: ['#1C1917', '#78716C', '#D6D3D1'],
        borderColor: '#ffffff',
        borderWidth: 3,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#78716C',
          font: { size: 11 },
          padding: 12,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => ` ${context.label}: ${context.parsed}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Service Status</p>
      <div className="h-48">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#E7E5E4] border-t-[#1C1917] animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">Could not load data</p>
          </div>
        )}
        {!loading && !error && total === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">No service status data yet</p>
          </div>
        )}
        {!loading && !error && total > 0 && <Doughnut data={chartData} options={options} />}
      </div>
    </div>
  );
}

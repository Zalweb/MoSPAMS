import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ServiceTypeStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const CURRENCY_PREFIX = '₱';

interface Props {
  data: ServiceTypeStats[];
  loading: boolean;
  error: boolean;
}

export default function TopServicesBar({ data, loading, error }: Props) {
  const chartData = {
    labels: data.map((service) => service.name),
    datasets: [
      {
        label: 'Jobs',
        data: data.map((service) => service.count),
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#ffffff',
        bodyColor: '#a1a1aa',
        borderColor: '#27272a',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          afterLabel: (context: TooltipItem<'bar'>) =>
            `Revenue: ${CURRENCY_PREFIX}${(data[context.dataIndex]?.revenue ?? 0).toLocaleString('en-PH')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#71717a', font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#d4d4d8', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
      <p className="text-sm font-semibold text-white mb-5">Top Service Types</p>
      <div className="h-56">
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
        {!loading && !error && data.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-zinc-500">No service data yet</p>
          </div>
        )}
        {!loading && !error && data.length > 0 && <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
}
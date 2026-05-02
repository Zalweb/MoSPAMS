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

const CURRENCY_PREFIX = '\u20b1';

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
        backgroundColor: '#1C1917',
        borderRadius: 6,
        barThickness: 18,
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
        callbacks: {
          afterLabel: (context: TooltipItem<'bar'>) =>
            `Revenue: ${CURRENCY_PREFIX}${(data[context.dataIndex]?.revenue ?? 0).toLocaleString('en-PH')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F5F5F4' },
        ticks: { color: '#A8A29E', font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#44403C', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Top Service Types</p>
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
        {!loading && !error && data.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-[#A8A29E]">No service data yet</p>
          </div>
        )}
        {!loading && !error && data.length > 0 && <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
}

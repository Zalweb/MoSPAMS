import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DayRevenue } from '@/shared/hooks/usePublicStats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const CURRENCY_PREFIX = '\u20b1';

interface Props {
  data: DayRevenue[];
  loading: boolean;
  error: boolean;
}

export default function RevenueLineChart({ data, loading, error }: Props) {
  const chartData = {
    labels: data.map((day) => day.date.slice(5)),
    datasets: [
      {
        label: 'Revenue',
        data: data.map((day) => day.amount),
        borderColor: '#1C1917',
        backgroundColor: 'rgba(28,25,23,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${CURRENCY_PREFIX}${(context.parsed.y ?? 0).toLocaleString('en-PH')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F5F5F4' },
        ticks: {
          color: '#A8A29E',
          font: { size: 10 },
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: { color: '#F5F5F4' },
        ticks: {
          color: '#A8A29E',
          font: { size: 10 },
          callback: (value) => `${CURRENCY_PREFIX}${Number(value).toLocaleString('en-PH')}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Revenue - Last 30 Days</p>
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
        {!loading && !error && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
}

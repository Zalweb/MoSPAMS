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

const CURRENCY_PREFIX = '₱';

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
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#ffffff',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
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
          label: (context: TooltipItem<'line'>) =>
            `${CURRENCY_PREFIX}${(context.parsed.y ?? 0).toLocaleString('en-PH')}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#71717a',
          font: { size: 11 },
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#71717a',
          font: { size: 11 },
          callback: (value) => `${CURRENCY_PREFIX}${Number(value).toLocaleString('en-PH')}`,
        },
      },
    },
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold text-white">Revenue - Last 30 Days</p>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
      <div className="h-56">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-zinc-500">Could not load data</p>
              <p className="text-xs text-zinc-600 mt-1">Please try again later</p>
            </div>
          </div>
        )}
        {!loading && !error && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
}
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { PublicStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const CURRENCY_PREFIX = '₱';

interface Props {
  data: PublicStats['charts']['payment_methods'] | null;
  loading: boolean;
  error: boolean;
}

export default function PaymentPieChart({ data, loading, error }: Props) {
  const total = data ? data.cash + data.gcash : 0;
  const chartData = {
    labels: ['Cash', 'GCash'],
    datasets: [
      {
        data: data ? [data.cash, data.gcash] : [0, 0],
        backgroundColor: ['#22c55e', '#3b82f6'],
        borderColor: '#18181b',
        borderWidth: 3,
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context: TooltipItem<'pie'>) =>
            ` ${context.label}: ${CURRENCY_PREFIX}${context.parsed.toLocaleString('en-PH')}`,
        },
      },
    },
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
      <p className="text-sm font-semibold text-white mb-5">Payment Methods</p>
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
            <p className="text-sm text-zinc-500">No payment data yet</p>
          </div>
        )}
        {!loading && !error && total > 0 && <Pie data={chartData} options={options} />}
      </div>
    </div>
  );
}
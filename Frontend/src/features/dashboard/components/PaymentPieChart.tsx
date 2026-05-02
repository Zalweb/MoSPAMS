import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import type { PublicStats } from '@/shared/hooks/usePublicStats';

ChartJS.register(ArcElement, Tooltip, Legend);

const CURRENCY_PREFIX = '\u20b1';

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
        backgroundColor: ['#1C1917', '#A8A29E'],
        borderColor: '#ffffff',
        borderWidth: 3,
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
          color: '#78716C',
          font: { size: 11 },
          padding: 12,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'pie'>) =>
            ` ${context.label}: ${CURRENCY_PREFIX}${context.parsed.toLocaleString('en-PH')}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="text-[13px] font-semibold text-[#1C1917] mb-4">Payment Methods</p>
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
            <p className="text-[12px] text-[#A8A29E]">No payment data yet</p>
          </div>
        )}
        {!loading && !error && total > 0 && <Pie data={chartData} options={options} />}
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import {
  BarChart3,
  ChevronRight,
  DollarSign,
  Package,
  Star,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const CURRENCY_PREFIX = '₱';

function toPercent(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((value) => Math.round((value / max) * 100));
}

function formatMoney(value: number): string {
  return `${CURRENCY_PREFIX}${value.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function ReportsSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  const MOCK_REVENUE = [
    12000, 15000, 14500, 18000, 22000, 21000, 24000, 28000, 26000, 31000,
    35000, 32000, 38000, 42000, 40000, 45000, 48000, 46000, 52000, 56000,
    54000, 59000, 65000, 62000, 68000, 72000, 70000, 76000, 82000, 85000
  ];

  const MOCK_JOBS = [
    5, 7, 6, 8, 10, 9, 12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26, 25, 28, 30, 29, 32, 35, 34, 38, 40, 39, 42, 45, 48
  ];

  const revenueBars = toPercent(MOCK_REVENUE);
  const jobBars = toPercent(MOCK_JOBS);
  const displayRevenueBars = revenueBars;

  const totalRevenue = 1250450;
  const totalParts = 485;
  const totalJobs = 1240;
  const activeServices = 25;
  const paymentMethods = { cash: 450450, gcash: 800000 };
  const paymentTotal = Math.max(paymentMethods.cash + paymentMethods.gcash, 1);

  const xLabels = ['15 Mar', '30 Mar', 'Today'];

  const reports = [
    {
      icon: DollarSign,
      title: 'Sales Reports',
      description: 'Daily, weekly, and monthly sales breakdowns with payment method analysis.',
      metric: formatMoney(totalRevenue),
      metricLabel: 'Total Revenue',
      trend: 'Live data',
      bars: revenueBars,
    },
    {
      icon: Package,
      title: 'Inventory Reports',
      description: 'Stock levels, low-stock alerts, stock-in/out movements, and part categories.',
      metric: String(totalParts),
      metricLabel: 'Active Parts',
      trend: 'Updated live',
      bars: revenueBars,
    },
    {
      icon: Wrench,
      title: 'Service Performance',
      description: 'Jobs completed, average service time, mechanic productivity, and service types.',
      metric: String(totalJobs),
      metricLabel: 'Jobs Done',
      trend: `${activeServices} active`,
      bars: jobBars,
    },
    {
      icon: Star,
      title: 'Most Used Parts & Services',
      description: 'Identify top-selling parts and most-requested services to optimize your stock.',
      metric: '5',
      metricLabel: 'Items Ranked',
      trend: 'Top services',
      bars: jobBars,
    },
    {
      icon: TrendingUp,
      title: 'Income Summary',
      description: 'Gross income, net income after discounts, and payment status overview.',
      metric: formatMoney(totalRevenue),
      metricLabel: 'Net Revenue',
      trend: 'Updated live',
      bars: revenueBars,
    },
  ];

  return (
    <section id="reports" className="relative py-24 bg-zinc-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4"
          >
            <BarChart3 className="w-3.5 h-3.5" strokeWidth={2} />
            Reports & Analytics
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight"
          >
            Clear reports for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              smarter decisions
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-zinc-400 text-lg leading-relaxed"
          >
            Generate actionable business intelligence at the click of a button. No spreadsheet
            skills required.
          </motion.p>
        </div>

        <div ref={contentRef} className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Overview Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={contentVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-5"
            whileHover={{ y: -4 }}
          >
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Revenue Overview
            </p>

            <div className="mb-5">
              <p className="text-3xl font-bold text-white mb-0.5">
                {formatMoney(totalRevenue)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  Live data
                </span>
              </div>
            </div>

            {/* Animated Chart Bars */}
            <div className="mb-5">
              <div className="flex items-end gap-[2px] h-24">
                {displayRevenueBars.map((height, index) => (
                  <motion.div
                    key={index}
                    className={`flex-1 rounded-t-sm transition-all ${
                      index === displayRevenueBars.length - 1
                        ? 'bg-white'
                        : index >= displayRevenueBars.length - 7
                          ? 'bg-zinc-400'
                          : 'bg-zinc-700'
                    }`}
                    initial={{ scaleY: 0 }}
                    animate={contentVisible ? { scaleY: 1 } : {}}
                    transition={{ delay: 0.3 + index * 0.02, duration: 0.3 }}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>{xLabels[0]}</span>
                <span>{xLabels[1]}</span>
                <span>{xLabels[2]}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-2">
              {[
                { label: 'Cash Payments', value: paymentMethods.cash },
                { label: 'GCash Payments', value: paymentMethods.gcash },
              ].map((item) => (
                <div key={item.label}>
                  <motion.div
                    className="flex justify-between text-xs mb-1"
                    initial={{ opacity: 0 }}
                    animate={contentVisible ? { opacity: 1 } : {}}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="text-zinc-400 font-medium">{item.label}</span>
                    <span className="text-white font-semibold">
                      {formatMoney(item.value)}
                    </span>
                  </motion.div>
                  <motion.div
                    className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"
                    initial={{ scaleX: 0 }}
                    animate={contentVisible ? { scaleX: 1 } : {}}
                    transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: 'left' }}
                  >
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.round((item.value / paymentTotal) * 100)}%` }}
                    />
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Report Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {reports.map((report, index) => {
              const Icon = report.icon;
              const bars = report.bars.length > 0 ? report.bars : Array<number>(12).fill(40);

              return (
                <motion.div
                  key={report.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={contentVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-zinc-700 hover:-translate-y-1 cursor-default"
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.span
                        className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <Icon className="w-4 h-4" strokeWidth={2} />
                      </motion.span>
                      <h3 className="text-sm font-semibold text-white">{report.title}</h3>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700 shrink-0">
                      {report.trend}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{report.description}</p>

                  {/* Animated Bars */}
                  <motion.div
                    className="flex items-end gap-0.5 h-8 mb-3"
                    initial={{ opacity: 0 }}
                    animate={contentVisible ? { opacity: 1 } : {}}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    {bars.map((height, barIndex) => (
                      <motion.div
                        key={barIndex}
                        className="flex-1 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity bg-white"
                        initial={{ scaleY: 0 }}
                        animate={contentVisible ? { scaleY: 1 } : {}}
                        transition={{ delay: 0.5 + barIndex * 0.02, duration: 0.2 }}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                    ))}
                  </motion.div>

                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <motion.p
                        className="text-xl font-bold text-white truncate"
                        initial={{ opacity: 0 }}
                        animate={contentVisible ? { opacity: 1 } : {}}
                        transition={{ delay: 0.6 + index * 0.1 }}
                      >
                        {report.metric}
                      </motion.p>
                      <p className="text-[10px] text-zinc-500">{report.metricLabel}</p>
                    </div>
                    <motion.div
                      className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors shrink-0"
                      whileHover={{ scale: 1.1 }}
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
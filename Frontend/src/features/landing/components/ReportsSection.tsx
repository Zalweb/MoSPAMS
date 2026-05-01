const REPORTS = [
  {
    icon: '💰',
    title: 'Sales Reports',
    description: 'Daily, weekly, and monthly sales breakdowns with payment method analysis.',
    color: 'violet',
    metric: '₱48,250',
    metricLabel: 'This Month',
    trend: '+12%',
    positive: true,
  },
  {
    icon: '📦',
    title: 'Inventory Reports',
    description: 'Stock levels, low-stock alerts, stock-in/out movements, and part categories.',
    color: 'blue',
    metric: '142',
    metricLabel: 'Active Parts',
    trend: '7 Low Stock',
    positive: false,
  },
  {
    icon: '🔧',
    title: 'Service Performance',
    description: 'Jobs completed, average service time, mechanic productivity, and service types.',
    color: 'green',
    metric: '128',
    metricLabel: 'Jobs Done',
    trend: '+8 Today',
    positive: true,
  },
  {
    icon: '⭐',
    title: 'Most Used Parts & Services',
    description: 'Identify top-selling parts and most-requested services to optimize your stock.',
    color: 'orange',
    metric: 'Top 10',
    metricLabel: 'Items Ranked',
    trend: 'Updated Daily',
    positive: true,
  },
  {
    icon: '📈',
    title: 'Income Summary',
    description: 'Gross income, net income after discounts, and payment status overview.',
    color: 'pink',
    metric: '₱36,800',
    metricLabel: 'Net Income',
    trend: '+9.5%',
    positive: true,
  },
];

const colorMap: Record<string, { card: string; accent: string; metric: string; badge: string }> = {
  violet: {
    card: 'hover:border-zinc-700',
    accent: 'text-zinc-300',
    metric: 'text-white',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  blue: {
    card: 'hover:border-zinc-700',
    accent: 'text-zinc-300',
    metric: 'text-white',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  green: {
    card: 'hover:border-zinc-700',
    accent: 'text-zinc-300',
    metric: 'text-white',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  orange: {
    card: 'hover:border-zinc-700',
    accent: 'text-zinc-300',
    metric: 'text-white',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  pink: {
    card: 'hover:border-zinc-700',
    accent: 'text-zinc-300',
    metric: 'text-white',
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
};

// Mini bar chart data per report
const chartData: Record<string, number[]> = {
  'Sales Reports': [45, 60, 55, 80, 70, 90, 65, 85, 75, 95, 70, 88],
  'Inventory Reports': [80, 75, 90, 60, 70, 85, 55, 78, 65, 80, 72, 68],
  'Service Performance': [50, 65, 70, 80, 60, 85, 75, 90, 65, 80, 78, 92],
  'Most Used Parts & Services': [40, 55, 65, 70, 80, 75, 85, 60, 70, 88, 65, 72],
  'Income Summary': [55, 70, 60, 85, 75, 90, 65, 80, 70, 92, 78, 85],
};

export default function ReportsSection() {
  return (
    <section id="reports" className="relative py-24 bg-zinc-950">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4">
            📊 Reports & Analytics
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Clear reports for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              smarter decisions
            </span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Generate actionable business intelligence at the click of a button. No spreadsheet
            skills required.
          </p>
        </div>

        {/* Dashboard Preview + Cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dashboard Preview Panel */}
          <div className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">
              Revenue Overview
            </p>

            {/* Big number */}
            <div className="mb-5">
              <p className="text-3xl font-bold text-white mb-0.5">₱48,250</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  ↑ 12% vs last month
                </span>
              </div>
            </div>

            {/* Fake bar chart */}
            <div className="mb-5">
              <div className="flex items-end gap-1 h-24">
                {[35, 55, 45, 70, 60, 80, 65, 85, 70, 90, 75, 95].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${
                      i === 11
                        ? 'bg-white'
                        : i >= 8
                        ? 'bg-zinc-400'
                        : 'bg-zinc-700'
                    } transition-all hover:opacity-80`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>Jan</span>
                <span>Apr</span>
                <span>Jul</span>
                <span>Oct</span>
                <span>Now</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="space-y-2">
              {[
                { label: 'Service Revenue', value: '₱28,500', pct: 59 },
                { label: 'Parts Sales', value: '₱19,750', pct: 41 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">{item.label}</span>
                    <span className="text-white font-semibold">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REPORTS.map((report) => {
              const c = colorMap[report.color];
              const bars = chartData[report.title] ?? [];
              return (
                <div
                  key={report.title}
                  className={`group bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all duration-300 ${c.card} hover:-translate-y-1 cursor-default`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{report.icon}</span>
                      <h3 className="text-sm font-semibold text-white">{report.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}
                    >
                      {report.trend}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{report.description}</p>

                  {/* Mini chart */}
                  <div className="flex items-end gap-0.5 h-8 mb-3">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity bg-white`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xl font-bold ${c.metric}`}>{report.metric}</p>
                      <p className="text-[10px] text-zinc-500">{report.metricLabel}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                      <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const BENEFITS = [
  {
    icon: '🎯',
    title: 'Reduce Manual Errors',
    description:
      'Eliminate handwritten records and spreadsheet mistakes. MoSPAMS keeps all your data accurate and up to date.',
  },
  {
    icon: '⚡',
    title: 'Improve Shop Workflow',
    description:
      'Speed up service jobs, transactions, and stock updates so your team spends more time on actual repair work.',
  },
  {
    icon: '📈',
    title: 'Make Better Business Decisions',
    description:
      'Use sales reports, inventory summaries, and service performance data to grow your motorcycle shop smarter.',
  },
];

const STATS = [
  { value: '100%', label: 'Web-based' },
  { value: '2', label: 'User Roles' },
  { value: '5+', label: 'Report Types' },
  { value: '∞', label: 'Transactions' },
];

export default function AboutSection() {
  return (
    <section id="about" className="relative py-24 bg-zinc-950">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-5">
              🏍️ About MoSPAMS
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 tracking-tight leading-tight">
              Built for small-to-medium{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                motorcycle businesses
              </span>
            </h2>

            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              MoSPAMS is designed to reduce manual paperwork, prevent stock discrepancies, organize
              service records, speed up transactions, and provide useful business insights for{' '}
              <strong className="text-white font-medium">
                motorcycle repair shops and parts retailers.
              </strong>
            </p>

            {/* Benefit Points */}
            <div className="space-y-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-700 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{b.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Stats + Visual */}
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-6 text-center hover:shadow-md hover:border-zinc-700 transition-all duration-200"
                >
                  <p className="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-zinc-400 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Info Card */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 text-white shadow-xl shadow-black/50">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔩</span>
                <div>
                  <h3 className="font-bold text-lg text-white">Version 1.0</h3>
                  <p className="text-zinc-400 text-sm">MVP Release</p>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                MoSPAMS V1 focuses on Admin and Staff workflows. Mechanic and Customer roles are
                part of the database schema and are planned for future versions.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Inventory', 'Services', 'Sales', 'Reports', 'Users'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

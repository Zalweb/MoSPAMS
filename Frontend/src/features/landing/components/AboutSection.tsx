import { motion } from 'framer-motion';
import { Target, Zap, TrendingUp, Bike, Wrench as WrenchIcon } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const BENEFITS = [
  {
    Icon: Target,
    title: 'Reduce Manual Errors',
    description:
      'Eliminate handwritten records and spreadsheet mistakes. MoSPAMS keeps all your data accurate and up to date.',
  },
  {
    Icon: Zap,
    title: 'Improve Shop Workflow',
    description:
      'Speed up service jobs, transactions, and stock updates so your team spends more time on actual repair work.',
  },
  {
    Icon: TrendingUp,
    title: 'Make Better Business Decisions',
    description:
      'Use sales reports, inventory summaries, and service performance data to grow your motorcycle shop smarter.',
  },
];

const STATS = [
  { value: '100%', label: 'Cloud-Based' },
  { value: '5', label: 'User Roles' },
  { value: '5+', label: 'Report Types' },
  { value: '∞', label: 'Transactions' },
];

export default function AboutSection() {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section id="about" className="relative py-24 bg-card">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div ref={sectionRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-zinc-300 text-xs font-semibold mb-5">
              <Bike className="w-3.5 h-3.5" strokeWidth={2} />
              About MoSPAMS
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5 tracking-tight leading-tight">
              Built for small-to-medium{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                motorcycle businesses
              </span>
            </h2>

            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              MoSPAMS is designed to reduce manual paperwork, prevent stock discrepancies, organize
              service records, speed up transactions, and provide useful business insights for{' '}
              <strong className="text-foreground font-medium">
                motorcycle repair shops and parts retailers.
              </strong>
            </p>

            {/* Benefit Points */}
            <div className="space-y-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted border border-border shadow-sm hover:shadow-md hover:border-zinc-700 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <b.Icon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Stats + Visual */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-muted rounded-2xl border border-border shadow-sm p-6 text-center hover:shadow-md hover:border-zinc-700 transition-all duration-200"
                >
                  <p className="text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Info Card */}
            <div className="bg-muted rounded-2xl border border-border p-6 text-foreground shadow-xl shadow-black/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <WrenchIcon className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Version 2.0</h3>
                  <p className="text-muted-foreground text-sm">SaaS Platform</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                MoSPAMS V2 is a full multi-tenant SaaS platform. Owner, Staff, Mechanic, and Customer roles are all active with dedicated dashboards and workflows.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Inventory', 'Services', 'Sales', 'Reports', 'Users', 'Branding', 'Multi-Tenancy', 'Google Auth'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

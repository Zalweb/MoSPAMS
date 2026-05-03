import { motion } from 'framer-motion';
import { AlertCircle, ArrowUp, Bike, Lightbulb } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const BENEFITS = [
  {
    icon: AlertCircle,
    title: 'Reduce Manual Errors',
    description:
      'Eliminate handwritten records and spreadsheet mistakes. MoSPAMS keeps all your data accurate and up to date.',
  },
  {
    icon: ArrowUp,
    title: 'Improve Shop Workflow',
    description:
      'Speed up service jobs, transactions, and stock updates so your team spends more time on actual repair work.',
  },
  {
    icon: Bike,
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
  const { ref: leftRef, isVisible: leftVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: rightRef, isVisible: rightVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section id="about" className="relative py-24 bg-zinc-950">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column */}
          <div ref={leftRef} className="relative">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={leftVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-5"
            >
              <Bike className="w-3.5 h-3.5" />
              About MoSPAMS
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={leftVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-3xl sm:text-4xl font-bold text-white mb-5 tracking-tight leading-tight"
            >
              Built for small-to-medium{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                motorcycle businesses
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={leftVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-zinc-400 text-lg leading-relaxed mb-8"
            >
              MoSPAMS is designed to reduce manual paperwork, prevent stock discrepancies, organize
              service records, speed up transactions, and provide useful business insights for{' '}
              <strong className="text-white font-medium">
                motorcycle repair shops and parts retailers.
              </strong>
            </motion.p>

            {/* Benefit Points */}
            <div className="space-y-4">
              {BENEFITS.map((b, index) => {
                const Icon = b.icon;
                return (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={leftVisible ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-700 transition-all duration-200 group"
                    whileHover={{ x: 4 }}
                  >
                    <motion.div
                      className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                      whileHover={{ rotate: 5 }}
                    >
                      <Icon className="w-5 h-5 text-zinc-300" />
                    </motion.div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">{b.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{b.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Stats + Visual */}
          <div ref={rightRef} className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={rightVisible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm p-6 text-center hover:shadow-md hover:border-zinc-700 transition-all duration-200"
                  whileHover={{ y: -4 }}
                >
                  <motion.p
                    className="text-3xl font-bold text-white mb-1"
                    initial={{ scale: 0.5 }}
                    animate={rightVisible ? { scale: 1 } : {}}
                    transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-sm text-zinc-400 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={rightVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 text-white shadow-xl shadow-black/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                >
                  <Bike className="w-5 h-5 text-zinc-300" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg text-white">Version 1.0</h3>
                  <p className="text-zinc-400 text-sm">MVP Release</p>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                MoSPAMS V1 focuses on Owner and Staff workflows. Mechanic and Customer roles are
                part of the database schema and are planned for future versions.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Inventory', 'Services', 'Sales', 'Reports', 'Users'].map((tag) => (
                  <motion.span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={rightVisible ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Tip Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={rightVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200/80">
                <strong className="text-amber-300">Pro tip:</strong> Start by adding your first parts in the Inventory section to begin tracking your stock.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
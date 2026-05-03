import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Package,
  Receipt,
  Shield,
  Users,
} from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const FEATURES = [
  {
    icon: Package,
    title: 'Inventory Management',
    description:
      'Track parts, categories, stock-in, stock-out, low-stock alerts, and barcode scanning all in one place.',
    color: 'violet',
    tags: ['Stock Tracking', 'Barcodes', 'Alerts'],
  },
  {
    icon: Activity,
    title: 'Service Job Tracking',
    description:
      'Create service records, assign labor costs, and track service status from Pending to Ongoing to Completed.',
    color: 'blue',
    tags: ['Job Records', 'Labor Costs', 'Status Flow'],
  },
  {
    icon: Receipt,
    title: 'Sales & Transactions',
    description:
      'Record parts-only sales and service-plus-parts transactions with Cash and GCash payment tracking.',
    color: 'green',
    tags: ['Cash', 'GCash', 'Receipts'],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Generate sales reports, inventory reports, service performance reports, and income summaries.',
    color: 'orange',
    tags: ['Sales Report', 'Inventory', 'Income'],
  },
  {
    icon: Users,
    title: 'User Management',
    description:
      'Manage Owner and Staff accounts with secure login and role-based access control.',
    color: 'pink',
    tags: ['Owner', 'Staff', 'Access Control'],
  },
  {
    icon: Shield,
    title: 'Activity Logs',
    description:
      'Track every user action for full accountability and a complete audit history.',
    color: 'indigo',
    tags: ['Audit Trail', 'History', 'Accountability'],
  },
];

const colorMap: Record<string, { card: string; icon: string; tag: string; dot: string }> = {
  violet: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-violet-500/10 text-violet-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-violet-500',
  },
  blue: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-blue-500/10 text-blue-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-blue-500',
  },
  green: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-green-500/10 text-green-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-green-500',
  },
  orange: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-orange-500/10 text-orange-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-orange-500',
  },
  pink: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-pink-500/10 text-pink-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-pink-500',
  },
  indigo: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-indigo-500/10 text-indigo-400',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-indigo-500',
  },
};

export default function FeaturesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section id="features" className="relative py-24 bg-black">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Activity className="w-3.5 h-3.5" />
            </motion.div>
            Core Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight"
          >
            Powerful features built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              motorcycle shop management
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-zinc-400 text-lg leading-relaxed"
          >
            Everything your shop needs, from tracking inventory to completing service jobs and
            processing payments.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => {
            const c = colorMap[feature.color];
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={gridVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm hover:shadow-lg ${c.card} hover:-translate-y-1 cursor-default`}
                whileHover={{ y: -4 }}
              >
                {/* Icon */}
                <motion.div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.icon}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>

                {/* Content */}
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{feature.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${c.tag}`}
                    >
                      <span className={`w-1 h-1 rounded-full ${c.dot}`} />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Hover arrow */}
                <motion.div
                  className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  initial={{ opacity: 0, x: -5 }}
                  whileHover={{ opacity: 1, x: 0 }}
                >
                  <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
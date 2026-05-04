import { Package, Wrench, Receipt, BarChart3, Users, ClipboardList, Zap } from 'lucide-react';

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
    icon: Wrench,
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
    icon: ClipboardList,
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
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  blue: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  green: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  orange: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  pink: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
  indigo: {
    card: 'hover:border-zinc-700 hover:shadow-black/60',
    icon: 'bg-zinc-800 text-white',
    tag: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-500',
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-black">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" strokeWidth={2} />
            Core Features
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Powerful features built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              motorcycle shop management
            </span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Everything your shop needs, from tracking inventory to completing service jobs and
            processing payments.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const c = colorMap[feature.color];
            return (
              <div
                key={feature.title}
                className={`group relative bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${c.card} hover:-translate-y-1 cursor-default`}
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c.icon} transition-transform group-hover:scale-110 duration-200`}
                >
                  <feature.icon className="w-5 h-5" strokeWidth={2} />
                </div>

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
                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

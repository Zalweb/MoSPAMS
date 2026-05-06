import { Package, Wrench, Receipt, BarChart3, Users, ClipboardList, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Package,
    title: 'Inventory Management',
    description:
      'Track parts, categories, stock movements, low-stock alerts, and barcode lookups. Real-time quantity updates on every sale or service.',
    color: 'violet',
    tags: ['Stock Tracking', 'Categories', 'Low-Stock Alerts'],
  },
  {
    icon: Wrench,
    title: 'Service Job Tracking',
    description:
      'Create service records, assign mechanics, attach parts, and track job status from Pending through In Progress to Completed.',
    color: 'blue',
    tags: ['Mechanic Assignment', 'Job Parts', 'Status Flow'],
  },
  {
    icon: Receipt,
    title: 'Sales & Transactions',
    description:
      'Record parts-only and service-plus-parts transactions with Cash and GCash payment tracking, discounts, and net amount calculation.',
    color: 'green',
    tags: ['Cash', 'GCash', 'Discounts'],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Sales reports, inventory summaries, service performance, income breakdowns, and a real-time dashboard with KPI cards.',
    color: 'orange',
    tags: ['Sales Report', 'Income', 'Dashboard KPIs'],
  },
  {
    icon: Users,
    title: 'Role-Based Access',
    description:
      'Five distinct roles \u2014 Owner, Staff, Mechanic, Customer, and SuperAdmin \u2014 each with tailored permissions and views.',
    color: 'pink',
    tags: ['5 Roles', 'Permissions', 'Google Sign-In'],
  },
  {
    icon: ClipboardList,
    title: 'Multi-Tenant & Branding',
    description:
      'Each shop gets its own subdomain, logo, color scheme, business hours, and invitation codes. Fully isolated data per shop.',
    color: 'indigo',
    tags: ['Subdomains', 'Shop Branding', 'Data Isolation'],
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
    <section id="features" className="relative py-24">
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
      </div>

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
            Everything your shop needs — from tracking inventory and completing service jobs to
            managing your team and branding your storefront.
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

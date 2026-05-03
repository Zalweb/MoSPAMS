import { motion } from 'framer-motion';
import { CheckCircle2, Cog, Crown, HeartHandshake, Shield, User } from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const ROLES = [
  {
    icon: Crown,
    title: 'Owner',
    status: 'Active — V1',
    statusColor: 'green',
    description:
      'Full system access including inventory management, service jobs, sales, reports, user accounts, deletion permissions, and complete activity logs.',
    permissions: [
      'Inventory Management',
      'Service Job Control',
      'Sales & Transactions',
      'Reports & Analytics',
      'User Management',
      'Activity Logs',
      'Delete Records',
    ],
    featured: true,
  },
  {
    icon: User,
    title: 'Staff',
    status: 'Active — V1',
    statusColor: 'green',
    description:
      'Operational access to daily shop tasks: view inventory, manage stock movements, handle service jobs, and process sales transactions.',
    permissions: [
      'View Inventory',
      'Stock Movements',
      'Service Job Access',
      'Sales Transactions',
      'Limited Reports',
    ],
    featured: false,
  },
  {
    icon: Cog,
    title: 'Mechanic',
    status: 'Planned — V2',
    statusColor: 'orange',
    description:
      'Future role: track assigned service jobs, view job-related parts and payables. Schema is already in place in the database.',
    permissions: ['View Assigned Jobs', 'Job Parts Visibility', 'Job Status Updates'],
    featured: false,
  },
  {
    icon: HeartHandshake,
    title: 'Customer',
    status: 'Planned — V2',
    statusColor: 'gray',
    description:
      'Future role: track service status, view payment history, and see parts used in their motorcycle. Schema already exists.',
    permissions: ['Service Status Tracking', 'Payment History', 'Parts Used Visibility'],
    featured: false,
  },
];

const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  gray: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
};

export default function RolesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section id="roles" className="relative py-24 bg-black">
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
            <Shield className="w-3.5 h-3.5" />
            User Roles
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight"
          >
            Designed for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              real shop workflows
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-zinc-400 text-lg leading-relaxed"
          >
            Role-based access ensures every team member sees exactly what they need, nothing more
            and nothing less.
          </motion.p>
        </div>

        {/* Role Cards */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((role, index) => {
            const Icon = role.icon;
            const colors = statusColorMap[role.statusColor];
            return (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 30 }}
                animate={gridVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`relative rounded-2xl overflow-hidden border ${
                  role.featured
                    ? 'border-zinc-700 shadow-xl shadow-black/60'
                    : 'border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-700'
                } transition-all duration-300 hover:-translate-y-1 bg-zinc-900`}
                whileHover={{ y: -4 }}
              >
                {/* Featured badge */}
                {role.featured && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-semibold border border-zinc-200">
                      Primary
                    </span>
                  </div>
                )}

                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-5">
                  <motion.div
                    className="text-3xl mb-2 w-12 h-12 rounded-xl bg-zinc-700/50 flex items-center justify-center"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Icon className="w-6 h-6 text-zinc-200" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white">{role.title}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {role.status}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5">
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{role.description}</p>
                  <div className="space-y-1.5">
                    {role.permissions.map((perm, permIndex) => (
                      <motion.div
                        key={perm}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={gridVisible ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.3 + permIndex * 0.05 }}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            role.statusColor === 'green'
                              ? 'text-green-500'
                              : role.statusColor === 'orange'
                              ? 'text-orange-400'
                              : 'text-zinc-500'
                          }`}
                        />
                        <span className="text-xs text-zinc-300">{perm}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Note banner */}
        <motion.div
          ref={gridRef}
          initial={{ opacity: 0, y: 20 }}
          animate={gridVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-start gap-3 max-w-3xl mx-auto"
        >
          <motion.div
            className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Cog className="w-5 h-5 text-zinc-400" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">About Future Roles</p>
            <p className="text-sm text-zinc-400">
              Mechanic and Customer roles exist in the database schema for future expansion. Version
              1 of MoSPAMS focuses on Owner and Staff workflows. Future versions will unlock
              Mechanic job tracking and Customer service portals.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
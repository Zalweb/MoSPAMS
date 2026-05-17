import { Shield, User, Wrench, Handshake, Users as UsersIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

const ROLES = [
  {
    icon: Shield,
    title: 'Owner',
    status: 'Active',
    statusColor: 'green',
    description:
      'Full shop access: inventory, service jobs, sales, reports, user management, shop branding, custom domains, and complete activity logs.',
    permissions: [
      'Inventory Management',
      'Service Jobs Management',
      'Sales & Transactions',
      'Reports & Analytics',
      'User Management',
      'Shop Branding & Domain',
      'Activity Logs',
    ],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: true,
  },
  {
    icon: User,
    title: 'Staff',
    status: 'Active',
    statusColor: 'green',
    description:
      'Operational access to daily shop tasks: manage inventory, stock movements, service jobs, sales transactions, and view reports.',
    permissions: [
      'Inventory Management',
      'Stock Movements',
      'Service Job Management',
      'Sales & Transactions',
      'View Reports',
    ],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
  {
    icon: Wrench,
    title: 'Mechanic',
    status: 'Active',
    statusColor: 'green',
    description:
      'Dedicated dashboard for assigned service jobs. View job details, update job status, add or remove parts used during repairs.',
    permissions: ['View Assigned Jobs', 'Update Job Status', 'Add/Remove Job Parts', 'Job Details'],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
  {
    icon: Handshake,
    title: 'Customer',
    status: 'Active',
    statusColor: 'green',
    description:
      'Self-service portal: view service history, submit new service requests, and track payment records for their motorcycle.',
    permissions: ['View Service History', 'Create Service Requests', 'Payment History'],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
];

const statusColorMap: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  gray: 'bg-zinc-800 text-muted-foreground border-zinc-700',
};

export default function RolesSection() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });
  const { ref: noteRef, isVisible: noteVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.5 });

  return (
    <section id="roles" className="relative py-24 bg-background">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-zinc-300 text-xs font-semibold mb-4"
          >
            <UsersIcon className="w-3.5 h-3.5" strokeWidth={2} />
            User Roles
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight"
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
            className="text-muted-foreground text-lg leading-relaxed"
          >
            Role-based access ensures every team member sees exactly what they need, nothing more
            and nothing less.
          </motion.p>
        </div>

        {/* Role Cards */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 30 }}
              animate={cardsVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`relative rounded-2xl overflow-hidden border ${role.featured
                ? 'border-zinc-700 shadow-xl ' + role.shadow
                : 'border-border shadow-sm hover:shadow-md hover:border-zinc-700'
                } transition-all duration-300 hover:-translate-y-1 bg-muted`}
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
              <div className={`bg-gradient-to-br ${role.gradient} p-5`}>
                <div className="mb-3 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <role.icon className="w-5 h-5 text-foreground" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{role.title}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${statusColorMap[role.statusColor]}`}
                >
                  {role.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{role.description}</p>
                <div className="space-y-1.5">
                  {role.permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 flex-shrink-0 ${role.statusColor === 'green'
                          ? 'text-green-500'
                          : role.statusColor === 'orange'
                            ? 'text-orange-400'
                            : 'text-muted-foreground'
                          }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs text-zinc-300">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note banner */}
        <motion.div
          ref={noteRef}
          initial={{ opacity: 0, y: 20 }}
          animate={noteVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 p-4 rounded-2xl bg-muted border border-border flex items-start gap-3 max-w-3xl mx-auto"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Role-Based Onboarding</p>
            <p className="text-sm text-muted-foreground">
              New team members can sign up with Google and request their role (Staff, Mechanic, or
              Customer). The shop Owner approves each request before access is granted, keeping your
              shop secure and organized.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

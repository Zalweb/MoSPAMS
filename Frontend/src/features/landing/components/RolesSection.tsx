const ROLES = [
  {
    icon: '🛡️',
    title: 'Admin',
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
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: true,
  },
  {
    icon: '👤',
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
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
  {
    icon: '🔧',
    title: 'Mechanic',
    status: 'Planned — V2',
    statusColor: 'orange',
    description:
      'Future role: track assigned service jobs, view job-related parts and payables. Schema is already in place in the database.',
    permissions: ['View Assigned Jobs', 'Job Parts Visibility', 'Job Status Updates'],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
  {
    icon: '🤝',
    title: 'Customer',
    status: 'Planned — V2',
    statusColor: 'gray',
    description:
      'Future role: track service status, view payment history, and see parts used in their motorcycle. Schema already exists.',
    permissions: ['Service Status Tracking', 'Payment History', 'Parts Used Visibility'],
    gradient: 'from-zinc-800 to-zinc-900',
    shadow: 'shadow-black/60',
    featured: false,
  },
];

const statusColorMap: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  gray: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export default function RolesSection() {
  return (
    <section id="roles" className="relative py-24 bg-black">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4">
            👥 User Roles
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Designed for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              real shop workflows
            </span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Role-based access ensures every team member sees exactly what they need, nothing more
            and nothing less.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((role) => (
            <div
              key={role.title}
              className={`relative rounded-2xl overflow-hidden border ${
                role.featured
                  ? 'border-zinc-700 shadow-xl ' + role.shadow
                  : 'border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-700'
              } transition-all duration-300 hover:-translate-y-1 bg-zinc-900`}
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
                <div className="text-3xl mb-2">{role.icon}</div>
                <h3 className="text-lg font-bold text-white">{role.title}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${statusColorMap[role.statusColor]}`}
                >
                  {role.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{role.description}</p>
                <div className="space-y-1.5">
                  {role.permissions.map((perm) => (
                     <div key={perm} className="flex items-center gap-2">
                       <svg
                         className={`w-3.5 h-3.5 flex-shrink-0 ${
                           role.statusColor === 'green'
                             ? 'text-green-500'
                             : role.statusColor === 'orange'
                             ? 'text-orange-400'
                             : 'text-zinc-500'
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
            </div>
          ))}
        </div>

        {/* Note banner */}
        <div className="mt-10 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-start gap-3 max-w-3xl mx-auto">
          <span className="text-xl mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">About Future Roles</p>
            <p className="text-sm text-zinc-400">
              Mechanic and Customer roles exist in the database schema for future expansion. Version
              1 of MoSPAMS focuses on Admin and Staff workflows. Future versions will unlock
              Mechanic job tracking and Customer service portals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

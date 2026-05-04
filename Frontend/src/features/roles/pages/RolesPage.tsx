import { Shield, Users, Wrench, UserCog, User } from 'lucide-react';
import { useData } from '@/shared/contexts/DataContext';

interface RoleCard {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  permissions: string[];
  userCount: number;
  color: string;
}

export default function RolesPage() {
  const { users } = useData();

  const roles: RoleCard[] = [
    {
      name: 'Owner',
      description: 'Full system access with administrative privileges',
      icon: Shield,
      permissions: [
        'Manage all users and roles',
        'View and export all reports',
        'Delete records permanently',
        'Access activity logs',
        'Configure shop settings',
        'Manage inventory and services',
      ],
      userCount: users.filter(u => u.role === 'Admin' || u.role === 'Owner').length,
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Staff',
      description: 'Operational access for daily shop management',
      icon: UserCog,
      permissions: [
        'View and manage inventory',
        'Create and update service jobs',
        'Process sales transactions',
        'View reports (no export)',
        'Add stock movements',
        'Manage customers',
      ],
      userCount: users.filter(u => u.role === 'Staff').length,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Mechanic',
      description: 'Job-focused access for service technicians',
      icon: Wrench,
      permissions: [
        'View assigned service jobs',
        'Update job status',
        'Add/remove parts from jobs',
        'View job details and history',
        'Track parts usage',
        'View customer information',
      ],
      userCount: users.filter(u => u.role === 'Mechanic').length,
      color: 'from-orange-500 to-red-500',
    },
    {
      name: 'Customer',
      description: 'Customer portal access for service tracking',
      icon: User,
      permissions: [
        'Book service appointments',
        'View service history',
        'Track job progress',
        'View payment records',
        'View parts used in services',
        'Update profile information',
      ],
      userCount: users.filter(u => u.role === 'Customer').length,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const totalUsers = users.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Roles & Permissions</h1>
        <p className="text-sm text-zinc-400">
          Manage role-based access control for your shop. Each role has specific permissions and capabilities.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalUsers}</p>
              <p className="text-xs text-zinc-500">Total Users</p>
            </div>
          </div>
        </div>

        {roles.slice(0, 3).map((role) => (
          <div key={role.name} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                <role.icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{role.userCount}</p>
                <p className="text-xs text-zinc-500">{role.name}s</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div
            key={role.name}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 hover:border-zinc-700 transition-all duration-300"
          >
            {/* Role Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                  <role.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                  <p className="text-xs text-zinc-500">{role.userCount} user{role.userCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-400 mb-4">{role.description}</p>

            {/* Permissions */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Permissions</p>
              <div className="space-y-2">
                {role.permissions.map((permission, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">{permission}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-blue-400" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-1">Role Management</h4>
            <p className="text-xs text-blue-400/70 leading-relaxed">
              User roles are assigned through the Users page. Customers can request role upgrades through the Role Requests workflow. 
              Only Owners can approve role changes and manage user permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

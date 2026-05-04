import type { Role } from '@/shared/types';

type Action = 'view' | 'create' | 'update' | 'delete';
type Module = 'inventory' | 'services' | 'sales' | 'reports' | 'users' | 'audit' | 'service-types' | 'stock-movements';

const POLICY: Record<Module, Record<Action, Role[]>> = {
  inventory: {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin', 'Staff'],
    update: ['Owner', 'Admin', 'Staff'],
    delete: ['Owner', 'Admin'],
  },
  services: {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin', 'Staff'],
    update: ['Owner', 'Admin', 'Staff'],
    delete: ['Owner', 'Admin'],
  },
  sales: {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin', 'Staff'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
  reports: {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
  users: {
    view: ['Owner', 'Admin'],
    create: ['Owner', 'Admin'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
  audit: {
    view: ['Owner', 'Admin'],
    create: ['Owner', 'Admin'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
  'service-types': {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
  'stock-movements': {
    view: ['Owner', 'Admin', 'Staff'],
    create: ['Owner', 'Admin', 'Staff'],
    update: ['Owner', 'Admin'],
    delete: ['Owner', 'Admin'],
  },
};

export function can(role: Role | undefined, module: Module, action: Action): boolean {
  if (!role) return false;
  return POLICY[module]?.[action]?.includes(role) ?? false;
}

export const NAV_ACCESS: Record<string, Role[]> = {
  '/dashboard': ['Owner', 'Admin', 'Staff'],
  '/dashboard/inventory': ['Owner', 'Admin', 'Staff'],
  '/dashboard/services': ['Owner', 'Admin', 'Staff'],
  '/dashboard/sales': ['Owner', 'Admin', 'Staff'],
  '/dashboard/reports': ['Owner', 'Admin', 'Staff'],
  '/dashboard/users': ['Owner', 'Admin'],
  '/dashboard/approvals': ['Owner', 'Admin'],
  '/dashboard/roles': ['Owner', 'Admin'],
  '/dashboard/activity-logs': ['Owner', 'Admin'],
  '/dashboard/settings': ['Owner', 'Admin'],
  '/dashboard/customer': ['Customer'],
  '/dashboard/customer/book': ['Customer'],
  '/dashboard/customer/history': ['Customer'],
  '/dashboard/customer/payments': ['Customer'],
  '/superadmin/analytics': ['SuperAdmin'],
  '/superadmin/shops': ['SuperAdmin'],
  '/superadmin/subscriptions': ['SuperAdmin'],
  '/superadmin/access-control': ['SuperAdmin'],
  '/superadmin/audit-logs': ['SuperAdmin'],
  '/superadmin/settings': ['SuperAdmin'],
};

import type { Role } from '@/shared/types';

type Action = 'view' | 'create' | 'update' | 'delete';
type Module = 'inventory' | 'services' | 'sales' | 'reports' | 'users' | 'audit' | 'service-types' | 'stock-movements';

const POLICY: Record<Module, Record<Action, Role[]>> = {
  inventory: {
    view: ['Admin', 'Staff'],
    create: ['Admin'],
    update: ['Admin', 'Staff'],
    delete: ['Admin'],
  },
  services: {
    view: ['Admin', 'Staff'],
    create: ['Admin', 'Staff'],
    update: ['Admin', 'Staff'],
    delete: ['Admin'],
  },
  sales: {
    view: ['Admin', 'Staff'],
    create: ['Admin', 'Staff'],
    update: ['Admin'],
    delete: ['Admin'],
  },
  reports: {
    view: ['Admin', 'Staff'],
    create: ['Admin'],
    update: ['Admin'],
    delete: ['Admin'],
  },
  users: {
    view: ['Admin'],
    create: ['Admin'],
    update: ['Admin'],
    delete: ['Admin'],
  },
  audit: {
    view: ['Admin'],
    create: ['Admin'],
    update: ['Admin'],
    delete: ['Admin'],
  },
  'service-types': {
    view: ['Admin', 'Staff'],
    create: ['Admin'],
    update: ['Admin'],
    delete: ['Admin'],
  },
  'stock-movements': {
    view: ['Admin', 'Staff'],
    create: ['Admin', 'Staff'],
    update: ['Admin'],
    delete: ['Admin'],
  },
};

export function can(role: Role | undefined, module: Module, action: Action): boolean {
  if (!role) return false;
  return POLICY[module]?.[action]?.includes(role) ?? false;
}

export const NAV_ACCESS: Record<string, Role[]> = {
  '/': ['Admin', 'Staff'],
  '/inventory': ['Admin', 'Staff'],
  '/services': ['Admin', 'Staff'],
  '/sales': ['Admin', 'Staff'],
  '/reports': ['Admin', 'Staff'],
  '/users': ['Admin'],
  '/approvals': ['Admin'],
};

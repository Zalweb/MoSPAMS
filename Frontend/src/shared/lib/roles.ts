import type { Role, User } from '@/shared/types';

export function normalizeRole(role: Role | string | undefined): Role | undefined {
  if (!role) return undefined;
  if (role === 'Admin') return 'Owner';
  return role as Role;
}

export function isOwnerLike(role: Role | string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'Owner';
}

export function isTenantDashboardRole(role: Role | string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'Owner' || normalized === 'Staff' || normalized === 'Mechanic';
}

export function defaultRouteForUser(user: User | null | undefined): string {
  if (!user) return '/';

  const role = normalizeRole(user.role);
  if (role === 'SuperAdmin') return '/superadmin/analytics';
  if (role === 'Customer') return '/dashboard/customer';

  return '/dashboard';
}

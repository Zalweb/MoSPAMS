import { apiGet, apiMutation } from '@/shared/lib/api';
import type {
  PlatformAdmin,
  PlatformAuditLog,
  ShopSubscription,
  SubscriptionPayment,
  SubscriptionPlan,
  SuperAdminShop,
} from '@/shared/types';

export interface PlatformAnalytics {
  summary: {
    platformSalesRevenue: number;
    subscriptionRevenue: number;
    totalRevenue: number;
    totalShops: number;
    totalPlatformAdmins: number;
  };
  shopHealth: {
    active: number;
    suspended: number;
    pending: number;
    inactive: number;
  };
  growth: {
    period: 'day' | 'week' | 'month';
    series: Array<{ label: string; count: number }>;
    total: number;
  };
}

export interface SystemHealth {
  database: {
    ok: boolean;
    message: string;
  };
  counts: {
    shops: number;
    users: number;
    pendingShops: number;
    activeSubscriptions: number;
  };
  version: string;
  generatedAt: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  weatherApiKey: string | null;
  smsApiKey: string | null;
}

export interface ShopDiagnostics {
  shop: {
    shopId: number;
    shopName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    statusCode: string;
    statusName: string;
    createdAt: string | null;
  };
  owner: {
    userId: number;
    name: string;
    email: string;
  } | null;
  applicant: {
    name: string | null;
    email: string | null;
  };
  registration: {
    status: string;
    rejectionReason: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
  };
  subscription: {
    shopSubscriptionId: number;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    renewsAt: string | null;
    planCode: string | null;
    planName: string | null;
    monthlyPrice: number | null;
  } | null;
  metrics: {
    users: number;
    parts: number;
    serviceJobs: number;
    sales: number;
    revenue: number;
    pendingJobs: number;
  };
  recentLogs: Array<{
    id: number;
    action: string;
    description: string | null;
    actorName: string | null;
    loggedAt: string | null;
  }>;
}

export async function getPlatformAnalytics(period: 'day' | 'week' | 'month') {
  return apiGet<PlatformAnalytics>(`/api/superadmin/analytics?period=${period}`);
}

export async function getShops(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiGet<{ data: SuperAdminShop[] }>(`/api/superadmin/shops${query}`);
}

export async function createShop(payload: {
  shopName: string;
  email?: string;
  phone?: string;
  address?: string;
  ownerName: string;
  ownerEmail: string;
}) {
  return apiMutation<{ data: { temporaryPassword: string; shopId: number } }>('/api/superadmin/shops', 'POST', payload);
}

export async function updateShop(shopId: number, payload: Partial<{ shopName: string; email: string; phone: string; address: string }>) {
  return apiMutation(`/api/superadmin/shops/${shopId}`, 'PATCH', payload);
}

export async function setShopStatus(shopId: number, status: 'activate' | 'suspend') {
  return apiMutation(`/api/superadmin/shops/${shopId}/${status}`, 'PATCH');
}

export async function getShopDiagnostics(shopId: number) {
  return apiGet<{ data: ShopDiagnostics }>(`/api/superadmin/shops/${shopId}/diagnostics`);
}

export async function approveShopRegistration(shopId: number) {
  return apiMutation<{
    message: string;
    data: { ownerId: number | null; temporaryPassword: string | null; trialDays: number; trialEndsAt: string | null };
  }>(`/api/superadmin/shops/${shopId}/approve-registration`, 'POST');
}

export async function rejectShopRegistration(shopId: number, payload?: { reason?: string }) {
  return apiMutation<{ message: string }>(`/api/superadmin/shops/${shopId}/reject-registration`, 'POST', payload);
}

export async function getSubscriptionPlans() {
  return apiGet<{ data: SubscriptionPlan[] }>('/api/superadmin/subscription-plans');
}

export async function createSubscriptionPlan(payload: {
  planCode: string;
  planName: string;
  monthlyPrice: number;
  description?: string;
  isActive?: boolean;
}) {
  return apiMutation('/api/superadmin/subscription-plans', 'POST', payload);
}

export async function updateSubscriptionPlan(planId: number, payload: Partial<{ planCode: string; planName: string; monthlyPrice: number; description: string; isActive: boolean }>) {
  return apiMutation(`/api/superadmin/subscription-plans/${planId}`, 'PATCH', payload);
}

export async function getShopSubscriptions() {
  return apiGet<{ data: ShopSubscription[] }>('/api/superadmin/shop-subscriptions');
}

export async function createShopSubscription(payload: {
  shopId: number;
  planId: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startsAt?: string;
  endsAt?: string;
  renewsAt?: string;
}) {
  return apiMutation('/api/superadmin/shop-subscriptions', 'POST', payload);
}

export async function updateShopSubscription(subscriptionId: number, payload: Partial<{ planId: number; status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'; startsAt: string; endsAt: string; renewsAt: string }>) {
  return apiMutation(`/api/superadmin/shop-subscriptions/${subscriptionId}`, 'PATCH', payload);
}

export async function getSubscriptionPayments() {
  return apiGet<{ data: SubscriptionPayment[] }>('/api/superadmin/subscription-payments');
}

export async function createSubscriptionPayment(payload: {
  shopSubscriptionId: number;
  amount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  dueAt?: string;
  paidAt?: string;
  referenceNumber?: string;
  notes?: string;
}) {
  return apiMutation('/api/superadmin/subscription-payments', 'POST', payload);
}

export async function getExpiringSubscriptions(days = 7) {
  return apiGet<{ data: Array<{ shopSubscriptionId: number; shopId: number; shopName: string; planName: string; endsAt: string | null; daysRemaining: number }> }>(`/api/superadmin/subscriptions/expiring?days=${days}`);
}

export async function getPlatformAdmins() {
  return apiGet<{ data: PlatformAdmin[] }>('/api/superadmin/platform-admins');
}

export async function createPlatformAdmin(payload: { name: string; email: string; password?: string }) {
  return apiMutation<{ data: { temporaryPassword: string | null } }>('/api/superadmin/platform-admins', 'POST', payload);
}

export async function setPlatformAdminStatus(userId: number, status: 'active' | 'inactive') {
  return apiMutation(`/api/superadmin/platform-admins/${userId}/status`, 'PATCH', { status });
}

export async function getPlatformAuditLogs(limit = 100) {
  return apiGet<{ data: PlatformAuditLog[] }>(`/api/superadmin/audit-logs?limit=${limit}`);
}

export async function getPlatformSettings() {
  return apiGet<{ data: PlatformSettings }>('/api/superadmin/settings');
}

export async function updatePlatformSettings(payload: Partial<PlatformSettings>) {
  return apiMutation<{ data: PlatformSettings }>('/api/superadmin/settings', 'PATCH', payload);
}

export async function getSystemHealth() {
  return apiGet<{ data: SystemHealth }>('/api/superadmin/system-health');
}

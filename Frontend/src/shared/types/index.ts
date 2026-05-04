export type Role = 'SuperAdmin' | 'Owner' | 'Staff' | 'Mechanic' | 'Customer' | 'Admin';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Part {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  barcode: string;
  createdAt: string;
}

export interface ServiceType {
  id: string;
  name: string;
  defaultLaborCost: number;
}

export interface ServiceRecord {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  partsUsed: { partId: string; quantity: number }[];
  notes: string;
  createdAt: string;
  completedAt?: string;
}

export interface Transaction {
  id: string;
  type: 'parts-only' | 'service+parts';
  items: { partId: string; name: string; quantity: number; price: number }[];
  serviceId?: string;
  serviceLaborCost?: number;
  paymentMethod: 'Cash' | 'GCash';
  total: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: Role;
  status: 'Active' | 'Inactive';
  shopId?: string | null;
  shopName?: string | null;
  shopStatus?: string | null;
  lastActive: string;
}

export interface StoredUser extends User {
  passwordHash: string;
}

export interface StockMovement {
  id: string;
  partId: string;
  partName: string;
  type: 'in' | 'out' | 'adjust';
  qty: number;
  reason: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export type View = 'login' | 'overview' | 'inventory' | 'services' | 'sales' | 'reports' | 'users';

export interface RoleRequest {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  requested_role: 'Staff' | 'Mechanic';
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export interface GoogleData {
  google_id: string;
  name: string;
  email: string;
}

export interface TenantBranding {
  shopId: number;
  shopName: string;
  subdomain: string | null;
  customDomain: string | null;
  domainStatus: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  socialMedia: {
    facebook: string | null;
    instagram: string | null;
  };
  businessHours: Record<string, unknown> | null;
}

export interface SuperAdminShop {
  shopId: number;
  shopName: string;
  email?: string | null;
  phone: string | null;
  address: string | null;
  statusCode: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE' | string;
  statusName: string;
  owner: {
    userId: number | null;
    name: string | null;
    email: string | null;
  };
  applicant: {
    name: string | null;
    email: string | null;
  };
  registration: {
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SYSTEM_PROVISIONED' | string;
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
    plan: {
      planId: number;
      planCode: string;
      planName: string;
      monthlyPrice: number;
    };
  } | null;
  createdAt: string | null;
}

export interface SubscriptionPlan {
  planId: number;
  planCode: string;
  planName: string;
  monthlyPrice: number;
  description: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ShopSubscription {
  shopSubscriptionId: number;
  shopId: number;
  shopName: string;
  planId: number;
  planCode: string;
  planName: string;
  monthlyPrice: number;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  renewsAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubscriptionPayment {
  subscriptionPaymentId: number;
  shopSubscriptionId: number;
  shopId: number;
  shopName: string;
  planName: string;
  paymentStatus: string;
  amount: number;
  paymentMethod: string | null;
  dueAt: string | null;
  paidAt: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface PlatformAdmin {
  userId: number;
  name: string;
  email: string;
  status: string;
  statusCode: string;
  lastActive: string | null;
}

export interface PlatformAuditLog {
  logId: number;
  shopId: number | null;
  shopName: string | null;
  userId: number | null;
  actorName: string | null;
  action: string;
  tableName: string | null;
  recordId: number | null;
  description: string | null;
  loggedAt: string | null;
}

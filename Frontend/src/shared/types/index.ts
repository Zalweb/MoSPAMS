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
  email: string;
  role: 'Admin' | 'Staff';
  status: 'Active' | 'Inactive';
  lastActive: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export type View = 'login' | 'overview' | 'inventory' | 'services' | 'sales' | 'reports' | 'users';

export interface Shop {
  shop_id: string;
  shop_name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  status: string;
}

export interface ShopBranding {
  shopName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  activeServices: number;
  totalParts: number;
  totalCustomers: number;
  totalJobsCompleted: number;
  revenueByDay: Array<{ date: string; amount: number }>;
  jobsByDay: Array<{ date: string; count: number }>;
  serviceStatus: {
    pending: number;
    ongoing: number;
    completed: number;
  };
  paymentMethods: {
    cash: number;
    gcash: number;
  };
  topServiceTypes: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  // New backend-calculated metrics
  thisWeekRevenue?: number;
  lastWeekRevenue?: number;
  weeklyRevenueChange?: number;
  todayRevenue?: number;
  yesterdayRevenue?: number;
  dailyRevenueChange?: number;
  completionRate?: number;
  activePipeline?: number;
  pendingServices?: number;
  ongoingServices?: number;
  inventoryHealth?: number;
  inventoryValue?: number;
  lowStockCount?: number;
  avgRevenuePerCustomer?: number;
  revenueSparkline7d?: number[];
  partsUsageSparkline7d?: number[];
  lowStock?: Array<{
    part_id: number;
    part_name: string;
    stock: number;
    min_stock: number;
    price: number;
    urgency: 'critical' | 'high' | 'medium';
  }>;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  status: 'completed' | 'pending' | 'cancelled';
}

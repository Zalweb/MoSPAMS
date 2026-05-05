import { useEffect, useState } from 'react';
import { apiGet } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { DashboardMetrics, Transaction } from '@/shared/types/shop';

export interface RecentService {
  id: string;
  customerName: string;
  motorcycleModel: string;
  serviceType: string;
  laborCost: number;
  status: string;
  createdAt: string;
  partsUsed?: Array<{ id: string; name: string; quantity: number; price: number }>;
}

interface DashboardData {
  metrics: DashboardMetrics | null;
  recentTransactions: Transaction[];
  recentServices: RecentService[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentServices, setRecentServices] = useState<RecentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (user.role === 'Owner' || user.role === 'Staff') {
        try {
          const statsResponse = await apiGet<{
            summary: {
              total_jobs_completed: number;
              total_customers: number;
              total_revenue: number;
              total_parts: number;
              active_services: number;
              this_week_revenue: number;
              last_week_revenue: number;
              weekly_revenue_change: number;
              today_revenue: number;
              yesterday_revenue: number;
              daily_revenue_change: number;
              completion_rate: number;
              active_pipeline: number;
              pending_services: number;
              ongoing_services: number;
              inventory_health: number;
              inventory_value: number;
              low_stock_count: number;
              avg_revenue_per_customer: number;
            };
            charts: {
              revenue_by_day: Array<{ date: string; amount: number }>;
              jobs_by_day: Array<{ date: string; count: number }>;
              service_status: { pending: number; ongoing: number; completed: number };
              payment_methods: { cash: number; gcash: number };
              top_service_types: Array<{ name: string; count: number; revenue: number }>;
              revenue_sparkline_7d: number[];
              parts_usage_sparkline_7d: number[];
            };
            low_stock: Array<{
              part_id: number;
              part_name: string;
              category: string;
              stock: number;
              min_stock: number;
              price: number;
              urgency: 'critical' | 'high' | 'medium';
            }>;
          }>('/api/dashboard/stats');

          const totalExpenses = statsResponse.summary.total_revenue * 0.3;

          setMetrics({
            totalRevenue: statsResponse.summary.total_revenue,
            totalExpenses: totalExpenses,
            netIncome: statsResponse.summary.total_revenue - totalExpenses,
            activeServices: statsResponse.summary.active_services,
            totalParts: statsResponse.summary.total_parts,
            totalCustomers: statsResponse.summary.total_customers,
            totalJobsCompleted: statsResponse.summary.total_jobs_completed,
            revenueByDay: statsResponse.charts.revenue_by_day,
            jobsByDay: statsResponse.charts.jobs_by_day,
            serviceStatus: statsResponse.charts.service_status,
            paymentMethods: statsResponse.charts.payment_methods,
            topServiceTypes: statsResponse.charts.top_service_types,
            // New backend-calculated metrics
            thisWeekRevenue: statsResponse.summary.this_week_revenue,
            lastWeekRevenue: statsResponse.summary.last_week_revenue,
            weeklyRevenueChange: statsResponse.summary.weekly_revenue_change,
            todayRevenue: statsResponse.summary.today_revenue,
            yesterdayRevenue: statsResponse.summary.yesterday_revenue,
            dailyRevenueChange: statsResponse.summary.daily_revenue_change,
            completionRate: statsResponse.summary.completion_rate,
            activePipeline: statsResponse.summary.active_pipeline,
            pendingServices: statsResponse.summary.pending_services,
            ongoingServices: statsResponse.summary.ongoing_services,
            inventoryHealth: statsResponse.summary.inventory_health,
            inventoryValue: statsResponse.summary.inventory_value,
            lowStockCount: statsResponse.summary.low_stock_count,
            avgRevenuePerCustomer: statsResponse.summary.avg_revenue_per_customer,
            revenueSparkline7d: statsResponse.charts.revenue_sparkline_7d,
            partsUsageSparkline7d: statsResponse.charts.parts_usage_sparkline_7d,
            lowStock: statsResponse.low_stock,
          });

          const transactionsResponse = await apiGet<{
            data: Array<{
              id: string;
              type: string;
              total: number;
              paymentMethod: string;
              createdAt: string;
              serviceId: string | null;
            }>;
          }>('/api/transactions?limit=10');

          const transactions: Transaction[] = transactionsResponse.data.map(t => ({
            id: t.id,
            date: t.createdAt,
            description: t.serviceId ? `Service Transaction #${t.serviceId}` : 'Parts Sale',
            type: 'income' as const,
            category: t.type === 'service+parts' ? 'Service Revenue' : 'Parts Revenue',
            amount: t.total,
            status: 'completed' as const,
          }));

          setRecentTransactions(transactions);

          const recentServicesResponse = await apiGet<{
            data: Array<{
              id: string;
              customerName: string;
              motorcycleModel: string;
              serviceType: string;
              laborCost: number;
              status: string;
              createdAt: string;
              partsUsed?: Array<{ id: string; name: string; quantity: number; price: number }>;
            }>;
          }>('/api/services?limit=5');

          setRecentServices(recentServicesResponse.data);
        } catch (apiError) {
          console.error('API error, using fallback data:', apiError);
          setMetrics({
            totalRevenue: 0,
            totalExpenses: 0,
            netIncome: 0,
            activeServices: 0,
            totalParts: 0,
            totalCustomers: 0,
            totalJobsCompleted: 0,
            revenueByDay: [],
            jobsByDay: [],
            serviceStatus: { pending: 0, ongoing: 0, completed: 0 },
            paymentMethods: { cash: 0, gcash: 0 },
            topServiceTypes: [],
          });
          setRecentTransactions([]);
          setRecentServices([]);
        }
      } else if (user.role === 'Customer') {
        const servicesResponse = await apiGet<{
          data: Array<{
            id: string;
            serviceType: string;
            laborCost: number;
            status: string;
            createdAt: string;
          }>;
        }>('/api/customer/services');

        const paymentsResponse = await apiGet<{
          data: Array<{
            id: string;
            total: number;
            paymentMethod: string;
            createdAt: string;
          }>;
        }>('/api/customer/payments');

        const totalSpent = paymentsResponse.data.reduce((sum, p) => sum + p.total, 0);
        const pendingServices = servicesResponse.data.filter(s => s.status === 'Pending').length;
        const completedServices = servicesResponse.data.filter(s => s.status === 'Completed').length;

        setMetrics({
          totalRevenue: totalSpent,
          totalExpenses: 0,
          netIncome: 0,
          activeServices: pendingServices,
          totalParts: 0,
          totalCustomers: 0,
          totalJobsCompleted: completedServices,
          revenueByDay: [],
          jobsByDay: [],
          serviceStatus: {
            pending: pendingServices,
            ongoing: servicesResponse.data.filter(s => s.status === 'Ongoing').length,
            completed: completedServices,
          },
          paymentMethods: { cash: 0, gcash: 0 },
          topServiceTypes: [],
        });

        const transactions: Transaction[] = paymentsResponse.data.slice(0, 10).map(p => ({
          id: p.id,
          date: p.createdAt,
          description: 'Service Payment',
          type: 'expense' as const,
          category: 'Service',
          amount: p.total,
          status: 'completed' as const,
        }));

        setRecentTransactions(transactions);
      } else {
        setMetrics({
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          activeServices: 0,
          totalParts: 0,
          totalCustomers: 0,
          totalJobsCompleted: 0,
          revenueByDay: [],
          jobsByDay: [],
          serviceStatus: { pending: 0, ongoing: 0, completed: 0 },
          paymentMethods: { cash: 0, gcash: 0 },
          topServiceTypes: [],
        });
        setRecentTransactions([]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, [user?.role]);

  return {
    metrics,
    recentTransactions,
    recentServices,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}

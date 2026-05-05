import { DollarSign, TrendingDown, TrendingUp, Package, Wrench, Users, AlertTriangle, Clock, CheckCircle2, ArrowUpRight, ShoppingCart } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';
import { KPICard } from '../components/KPICard';
import { RevenueChart } from '../components/RevenueChart';
import { TransactionTable } from '../components/TransactionTable';
import { AIAssistant } from '../components/AIAssistant';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { useDashboardData } from '@/shared/hooks/useDashboardData';
import { useAuth } from '@/features/auth/context/AuthContext';
import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function DashboardPage() {
  const { user } = useAuth();
  const { metrics, recentTransactions, recentServices, loading, error } = useDashboardData();

  const thisWeekRevenue = metrics?.thisWeekRevenue ?? 0;
  const weeklyRevenueChange = metrics?.weeklyRevenueChange ?? 0;
  const completionRate = metrics?.completionRate ?? 0;
  const activePipeline = metrics?.activePipeline ?? 0;
  const pendingServices = metrics?.pendingServices ?? 0;
  const ongoingServices = metrics?.ongoingServices ?? 0;
  const completedServices = metrics?.totalJobsCompleted ?? 0;
  const inventoryHealth = metrics?.inventoryHealth ?? 100;
  const lowStockCount = metrics?.lowStockCount ?? 0;
  const revenueSparkline = metrics?.revenueSparkline7d ?? [];
  const partsUsageSparkline = metrics?.partsUsageSparkline7d ?? [];
  const avgJobTime = '2.5 days';
  const totalJobs = pendingServices + ongoingServices + completedServices;

  const lowStock = metrics?.lowStock?.map(item => ({
    id: item.part_id.toString(),
    name: item.part_name,
    category: '',
    stock: item.stock,
    minStock: item.min_stock,
    price: item.price,
    barcode: '',
    createdAt: '',
    urgency: item.urgency,
  })) ?? [];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <TrendingDown className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Dashboard</h2>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  // Enhanced KPI configuration with backend-calculated data
  const getKPIs = () => {
    if (user?.role === 'Owner' || user?.role === 'Staff') {
      return [
        {
          title: "Weekly Revenue",
          value: `₱${thisWeekRevenue.toLocaleString()}`,
          change: weeklyRevenueChange,
          comparison: `vs last week: ₱${(metrics?.lastWeekRevenue ?? 0).toLocaleString()}`,
          trend: `₱${(metrics?.todayRevenue ?? 0).toLocaleString()} today`,
          icon: ShoppingCart,
          sparklineData: revenueSparkline,
        },
        {
          title: 'Service Completion Rate',
          value: `${completionRate.toFixed(0)}%`,
          change: completionRate - 75, // Compare to 75% target
          comparison: `${completedServices} of ${totalJobs} jobs`,
          trend: `Avg time: ${avgJobTime}`,
          icon: CheckCircle2,
        },
        {
          title: 'Active Pipeline',
          value: activePipeline,
          change: pendingServices > 0 ? ((ongoingServices / pendingServices) * 100) - 50 : 0,
          comparison: `${pendingServices} pending, ${ongoingServices} ongoing`,
          trend: `${completedServices} completed`,
          icon: Clock,
        },
        {
          title: 'Inventory Health',
          value: `${inventoryHealth.toFixed(0)}%`,
          change: lowStockCount > 0 ? -((lowStockCount / (metrics?.totalParts ?? 1)) * 100) : 0,
          comparison: `${lowStockCount} items need restocking`,
          trend: `${metrics?.totalParts ?? 0} total parts`,
          icon: AlertTriangle,
          sparklineData: partsUsageSparkline,
        },
      ];
    } else if (user?.role === 'Customer') {
      return [
        {
          title: 'Total Spent',
          value: `₱${metrics?.totalRevenue.toLocaleString() || '0'}`,
          icon: DollarSign,
        },
        {
          title: 'Active Services',
          value: metrics?.activeServices || 0,
          icon: Wrench,
        },
        {
          title: 'Completed Services',
          value: metrics?.totalJobsCompleted || 0,
          icon: TrendingUp,
        },
      ];
    } else {
      return [
        {
          title: 'Assigned Jobs',
          value: 0,
          icon: Wrench,
        },
        {
          title: 'Completed Today',
          value: 0,
          icon: TrendingUp,
        },
      ];
    }
  };

  const kpis = getKPIs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader />

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            change={'change' in kpi ? kpi.change : undefined}
            icon={kpi.icon}
            loading={loading}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Charts and AI Assistant Row */}
      {(user?.role === 'Owner' || user?.role === 'Staff') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart 
              data={metrics?.revenueByDay || []} 
              loading={loading}
            />
          </div>
          <div className="lg:col-span-1">
            <AIAssistant metrics={metrics} />
          </div>
        </div>
      )}

      {/* Revenue Breakdown & Top Services */}
      {(user?.role === 'Owner' || user?.role === 'Staff') && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Service Types */}
          <motion.div
            {...fadeUp(0.25)}
            className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300"
          >
            <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Wrench className="w-5 h-5 text-blue-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Top Service Types</h3>
                  <p className="text-xs text-zinc-500">By revenue this month</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {metrics.topServiceTypes.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500">No service data available</p>
                </div>
              ) : (
                metrics.topServiceTypes.slice(0, 5).map((service, idx) => {
                  const maxRevenue = Math.max(...metrics.topServiceTypes.map(s => s.revenue));
                  const percentage = maxRevenue > 0 ? (service.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={service.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-600 w-5">#{idx + 1}</span>
                          <span className="text-sm font-medium text-white">{service.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">₱{service.revenue.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">{service.count} jobs</p>
                        </div>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>

          {/* Payment Methods Breakdown */}
          <motion.div
            {...fadeUp(0.3)}
            className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300"
          >
            <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Payment Methods</h3>
                  <p className="text-xs text-zinc-500">Transaction breakdown</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Cash */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Cash</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{metrics.paymentMethods.cash}</p>
                      <p className="text-xs text-zinc-500">
                        {((metrics.paymentMethods.cash / (metrics.paymentMethods.cash + metrics.paymentMethods.gcash)) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(metrics.paymentMethods.cash / (metrics.paymentMethods.cash + metrics.paymentMethods.gcash)) * 100}%` }}
                      transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                    />
                  </div>
                </div>

                {/* GCash */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">GCash</span>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{metrics.paymentMethods.gcash}</p>
                      <p className="text-xs text-zinc-500">
                        {((metrics.paymentMethods.gcash / (metrics.paymentMethods.cash + metrics.paymentMethods.gcash)) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(metrics.paymentMethods.gcash / (metrics.paymentMethods.cash + metrics.paymentMethods.gcash)) * 100}%` }}
                      transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-400">Total Transactions</span>
                    <span className="text-2xl font-bold text-white">
                      {metrics.paymentMethods.cash + metrics.paymentMethods.gcash}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        </div>
      )}

      {/* Low Stock Alerts & Recent Services */}
      {(user?.role === 'Owner' || user?.role === 'Staff') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alert */}
          <motion.div
            {...fadeUp(0.35)}
            className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300"
          >
            <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Low Stock Alerts</h3>
                  <p className="text-xs text-zinc-500">Items need restocking</p>
                </div>
              </div>
              {lowStock.length > 0 && (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                  {lowStock.length} items
                </span>
              )}
            </div>
            <div className="divide-y divide-zinc-800/30 max-h-80 overflow-y-auto">
              {lowStock.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Package className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm text-zinc-500">All stock levels are healthy</p>
                </div>
              ) : (
                lowStock.map((part) => {
                  const urgency = (part as any).urgency || (
                    part.stock === 0 ? 'critical' : 
                    part.stock <= part.minStock / 2 ? 'high' : 
                    'medium'
                  );
                  return (
                    <div
                      key={part.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors group/item"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">{part.name}</p>
                          {urgency === 'critical' && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">₱{part.price.toLocaleString()}/unit</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className={`text-sm font-bold tabular-nums ${
                            part.stock === 0 ? 'text-red-400' : part.stock <= part.minStock / 2 ? 'text-orange-400' : 'text-amber-400'
                          }`}>
                            {part.stock} left
                          </p>
                          <p className="text-xs text-zinc-600">min {part.minStock}</p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover/item:text-zinc-400 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>

          {/* Recent Services */}
          <motion.div
            {...fadeUp(0.4)}
            className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300"
          >
            <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-zinc-400" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Recent Services</h3>
                  <p className="text-xs text-zinc-500">Latest service jobs</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-zinc-500">
                {totalJobs} total
              </span>
            </div>
            <div className="divide-y divide-zinc-800/30 max-h-80 overflow-y-auto">
              {recentServices.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500">No recent services</p>
                </div>
              ) : (
                recentServices.map((service) => {
                  const timeAgo = new Date(service.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors group/item"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">{service.customerName}</p>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            service.status === 'Completed'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : service.status === 'Ongoing'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {service.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-1">
                          {service.motorcycleModel} • {service.serviceType}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-zinc-600">
                          <span>₱{service.laborCost.toLocaleString()}</span>
                          <span>•</span>
                          <span>{timeAgo}</span>
                          {service.partsUsed && service.partsUsed.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{service.partsUsed.length} parts used</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover/item:text-zinc-400 transition-colors ml-3 shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        </div>
      )}

      {/* Service Pipeline */}
      {(user?.role === 'Owner' || user?.role === 'Staff') && (
        <motion.div
          {...fadeUp(0.45)}
          className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Service Pipeline</h3>
              <p className="text-xs text-zinc-500">Job status breakdown</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{totalJobs}</p>
              <p className="text-xs text-zinc-500">Total jobs</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { 
                label: 'Pending', 
                count: pendingServices, 
                icon: Clock, 
                color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                percentage: totalJobs > 0 ? ((pendingServices / totalJobs) * 100).toFixed(0) : 0
              },
              { 
                label: 'Ongoing', 
                count: ongoingServices, 
                icon: Wrench, 
                color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                percentage: totalJobs > 0 ? ((ongoingServices / totalJobs) * 100).toFixed(0) : 0
              },
              { 
                label: 'Completed', 
                count: completedServices, 
                icon: CheckCircle2, 
                color: 'bg-green-500/10 text-green-400 border border-green-500/20',
                percentage: totalJobs > 0 ? ((completedServices / totalJobs) * 100).toFixed(0) : 0
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                className={`flex flex-col gap-3 p-4 rounded-xl ${item.color} hover:scale-105 transition-transform cursor-default`}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between">
                  <item.icon className="w-5 h-5" strokeWidth={2} />
                  <span className="text-xs font-bold text-zinc-400">{item.percentage}%</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white leading-none mb-1">{item.count}</p>
                  <p className="text-xs font-medium text-zinc-400">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
      )}

      {/* Transaction Table */}
      <TransactionTable 
        transactions={recentTransactions} 
        loading={loading}
      />

      {/* Additional Stats for Owner/Staff */}
      {(user?.role === 'Owner' || user?.role === 'Staff') && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div {...fadeUp(0.5)} className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Inventory Value</p>
                  <p className="text-2xl font-bold text-white">
                    ₱{(metrics.inventoryValue ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Total Parts</span>
                <span className="font-semibold text-white">{metrics.totalParts}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">In Stock</span>
                <span className="font-semibold text-green-400">{metrics.totalParts - (metrics.lowStockCount ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Low Stock</span>
                <span className="font-semibold text-amber-400">{metrics.lowStockCount ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400" 
                style={{ width: `${metrics.inventoryHealth ?? 100}%` }} 
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>

          <motion.div {...fadeUp(0.55)} className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Customer Base</p>
                  <p className="text-2xl font-bold text-white">{metrics.totalCustomers}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Active Services</span>
                <span className="font-semibold text-blue-400">{metrics.activeServices}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Avg Revenue/Customer</span>
                <span className="font-semibold text-white">
                  ₱{(metrics.avgRevenuePerCustomer ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Repeat Rate</span>
                <span className="font-semibold text-green-400">68%</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400" style={{ width: '68%' }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>

          <motion.div {...fadeUp(0.6)} className="relative group bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Performance</p>
                  <p className="text-2xl font-bold text-white">{completionRate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Jobs Completed</span>
                <span className="font-semibold text-green-400">{metrics.totalJobsCompleted}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Avg Job Time</span>
                <span className="font-semibold text-white">{avgJobTime}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Revenue Growth</span>
                <span className={`font-semibold ${weeklyRevenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {weeklyRevenueChange >= 0 ? '+' : ''}{weeklyRevenueChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${completionRate}%` }} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

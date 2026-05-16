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

// Consistent card shell — flex-col + h-full so grid rows equalize heights
const CARD = "relative group flex flex-col h-full bg-card dark:bg-card/80 dark:backdrop-blur-xl shadow-soft dark:shadow-none border border-border/50 rounded-2xl overflow-hidden dark:hover:border-border dark:border-zinc-800/50 hover:border-zinc-300/50 transition-all duration-300";

// Consistent card header
function CardHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary-rgb))]/10 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/20 shrink-0">
          <Icon className="w-5 h-5 text-[rgb(var(--color-primary-rgb))]" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

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
  const avgJobTime = metrics?.avgJobTime != null ? `${metrics.avgJobTime} days` : '—';
  const repeatRate = metrics?.repeatRate ?? 0;
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Dashboard</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

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
        },
        {
          title: 'Service Completion Rate',
          value: `${completionRate.toFixed(0)}%`,
          change: completionRate - 75,
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
        },
      ];
    } else if (user?.role === 'Customer') {
      return [
        { title: 'Total Spent', value: `₱${metrics?.totalRevenue.toLocaleString() || '0'}`, icon: DollarSign },
        { title: 'Active Services', value: metrics?.activeServices || 0, icon: Wrench },
        { title: 'Completed Services', value: metrics?.totalJobsCompleted || 0, icon: TrendingUp },
      ];
    } else {
      return [
        { title: 'Assigned Jobs', value: 0, icon: Wrench },
        { title: 'Completed Today', value: 0, icon: TrendingUp },
      ];
    }
  };

  const kpis = getKPIs();
  const isOwnerOrStaff = user?.role === 'Owner' || user?.role === 'Staff';

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {kpis.map((kpi, index) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            change={'change' in kpi ? kpi.change : undefined}
            comparison={'comparison' in kpi ? kpi.comparison : undefined}
            trend={'trend' in kpi ? kpi.trend : undefined}
            icon={kpi.icon}
            loading={loading}
            delay={index * 0.1}
            sparklineData={'sparklineData' in kpi ? kpi.sparklineData : undefined}
          />
        ))}
      </div>

      {/* Revenue Chart + AI Assistant */}
      {isOwnerOrStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={metrics?.revenueByDay || []} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <AIAssistant metrics={metrics} />
          </div>
        </div>
      )}

      {/* Top Service Types + Payment Methods — equal height row */}
      {isOwnerOrStaff && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Top Service Types */}
          <motion.div {...fadeUp(0.25)} className="flex flex-col h-full">
            <div className={CARD}>
              <CardHeader icon={Wrench} title="Top Service Types" subtitle="By revenue this month" />
              <div className="flex-1 p-5 space-y-4">
                {metrics.topServiceTypes.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">No service data available</p>
                  </div>
                ) : (
                  metrics.topServiceTypes.slice(0, 5).map((service, idx) => {
                    const maxRevenue = Math.max(...metrics.topServiceTypes.map(s => s.revenue));
                    const percentage = maxRevenue > 0 ? (service.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={service.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                            <span className="text-sm font-medium text-card-foreground">{service.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-card-foreground">₱{service.revenue.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">{service.count} jobs</p>
                          </div>
                        </div>
                        <div className="h-2 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-[rgb(var(--color-primary-rgb))] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>

          {/* Payment Methods */}
          <motion.div {...fadeUp(0.3)} className="flex flex-col h-full">
            <div className={CARD}>
              <CardHeader icon={DollarSign} title="Payment Methods" subtitle="Transaction breakdown" />
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div className="space-y-6">
                  {(() => {
                    const total = metrics.paymentMethods.cash + metrics.paymentMethods.gcash;
                    const cashPct = total > 0 ? (metrics.paymentMethods.cash / total) * 100 : 0;
                    const gcashPct = total > 0 ? (metrics.paymentMethods.gcash / total) * 100 : 0;
                    return (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-card-foreground">Cash</span>
                            <div className="text-right">
                              <p className="text-lg font-bold text-card-foreground">{metrics.paymentMethods.cash}</p>
                              <p className="text-xs text-muted-foreground">{cashPct.toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="h-2.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cashPct}%` }}
                              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                              className="h-full bg-[rgb(var(--color-primary-rgb))] rounded-full"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-card-foreground">GCash</span>
                            <div className="text-right">
                              <p className="text-lg font-bold text-card-foreground">{metrics.paymentMethods.gcash}</p>
                              <p className="text-xs text-muted-foreground">{gcashPct.toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="h-2.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${gcashPct}%` }}
                              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                              className="h-full bg-[rgb(var(--color-primary-rgb))]/60 rounded-full"
                            />
                          </div>
                        </div>
                        {/* Spacer rows so this card matches the 5-row service card height */}
                        {[...Array(Math.max(0, 5 - 2))].map((_, i) => (
                          <div key={i} className="h-10" />
                        ))}
                      </>
                    );
                  })()}
                </div>
                <div className="pt-4 border-t border-border/50 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Transactions</span>
                    <span className="text-2xl font-bold text-card-foreground">
                      {metrics.paymentMethods.cash + metrics.paymentMethods.gcash}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Low Stock Alerts + Recent Services — equal height, scrollable content */}
      {isOwnerOrStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Low Stock Alert */}
          <motion.div {...fadeUp(0.35)} className="flex flex-col h-full">
            <div className={CARD} style={{ minHeight: 360 }}>
              <CardHeader
                icon={AlertTriangle}
                title="Low Stock Alerts"
                subtitle="Items need restocking"
                badge={
                  lowStock.length > 0 ? (
                    <span className="text-xs font-semibold text-[rgb(var(--color-primary-rgb))] bg-[rgb(var(--color-primary-rgb))]/10 px-3 py-1.5 rounded-full border border-[rgb(var(--color-primary-rgb))]/20">
                      {lowStock.length} items
                    </span>
                  ) : undefined
                }
              />
              <div className="flex-1 overflow-y-auto divide-y divide-border/50 dark:divide-zinc-800/30">
                {lowStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 mb-3 rounded-xl bg-[rgb(var(--color-primary-rgb))]/10 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/20">
                      <Package className="w-6 h-6 text-[rgb(var(--color-primary-rgb))]" />
                    </div>
                    <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                  </div>
                ) : (
                  lowStock.map((part) => {
                    const urgency = (part as { urgency?: string }).urgency || (
                      part.stock === 0 ? 'critical' : part.stock <= part.minStock / 2 ? 'high' : 'medium'
                    );
                    return (
                      <div
                        key={part.id}
                        className="flex items-center justify-between px-5 py-4 hover:bg-secondary/50 dark:hover:bg-zinc-800/30 transition-colors group/item"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-card-foreground truncate">{part.name}</p>
                            {urgency === 'critical' && (
                              <span className="shrink-0 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                CRITICAL
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">₱{part.price.toLocaleString()}/unit</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-bold tabular-nums ${
                              part.stock === 0 ? 'text-red-400' : part.stock <= part.minStock / 2 ? 'text-orange-400' : 'text-amber-400'
                            }`}>
                              {part.stock} left
                            </p>
                            <p className="text-xs text-muted-foreground">min {part.minStock}</p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover/item:text-muted-foreground transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>

          {/* Recent Services */}
          <motion.div {...fadeUp(0.4)} className="flex flex-col h-full">
            <div className={CARD} style={{ minHeight: 360 }}>
              <CardHeader
                icon={Wrench}
                title="Recent Services"
                subtitle="Latest service jobs"
                badge={
                  <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
                    {totalJobs} total
                  </span>
                }
              />
              <div className="flex-1 overflow-y-auto divide-y divide-border/50 dark:divide-zinc-800/30">
                {recentServices.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">No recent services</p>
                  </div>
                ) : (
                  recentServices.map((service) => {
                    const timeAgo = new Date(service.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between px-5 py-4 hover:bg-secondary/50 dark:hover:bg-zinc-800/30 transition-colors group/item"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-card-foreground truncate">{service.customerName}</p>
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
                          <p className="text-xs text-muted-foreground mb-1">
                            {service.motorcycleModel} • {service.serviceType}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover/item:text-muted-foreground transition-colors ml-3 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Service Pipeline */}
      {isOwnerOrStaff && (
        <motion.div
          {...fadeUp(0.45)}
          className="relative group bg-card dark:bg-card/80 dark:backdrop-blur-xl shadow-soft dark:shadow-none border border-border/50 rounded-2xl overflow-hidden dark:hover:border-border dark:border-zinc-800/50 hover:border-zinc-300/50 transition-all duration-300"
        >
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgb(var(--color-primary-rgb))]/10 flex items-center justify-center border border-[rgb(var(--color-primary-rgb))]/20">
                <Wrench className="w-5 h-5 text-[rgb(var(--color-primary-rgb))]" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">Service Pipeline</h3>
                <p className="text-xs text-muted-foreground">Job status breakdown</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-card-foreground">{totalJobs}</p>
              <p className="text-xs text-muted-foreground">Total jobs</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Pending',
                  count: pendingServices,
                  icon: Clock,
                  color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                  percentage: totalJobs > 0 ? ((pendingServices / totalJobs) * 100).toFixed(0) : 0,
                },
                {
                  label: 'Ongoing',
                  count: ongoingServices,
                  icon: Wrench,
                  color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                  percentage: totalJobs > 0 ? ((ongoingServices / totalJobs) * 100).toFixed(0) : 0,
                },
                {
                  label: 'Completed',
                  count: completedServices,
                  icon: CheckCircle2,
                  color: 'bg-green-500/10 text-green-400 border border-green-500/20',
                  percentage: totalJobs > 0 ? ((completedServices / totalJobs) * 100).toFixed(0) : 0,
                },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  className={`flex flex-col gap-3 p-4 rounded-xl ${item.color}`}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-center justify-between">
                    <item.icon className="w-5 h-5" strokeWidth={2} />
                    <span className="text-xs font-bold text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-card-foreground leading-none mb-1">{item.count}</p>
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </motion.div>
      )}

      {/* Transaction Table */}
      <TransactionTable transactions={recentTransactions} loading={loading} />

      {/* Additional Stats — 3 equal cards matching the card header+content pattern */}
      {isOwnerOrStaff && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* Inventory Value */}
          <motion.div {...fadeUp(0.5)} className="flex flex-col h-full">
            <div className={CARD}>
              <CardHeader icon={Package} title="Inventory Value" subtitle={`${metrics.totalParts} total parts`} />
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <p className="text-3xl font-bold text-card-foreground mb-4">
                    ₱{(metrics.inventoryValue ?? 0).toLocaleString()}
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">In Stock</span>
                      <span className="font-semibold text-green-400">{metrics.totalParts - (metrics.lowStockCount ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Low Stock</span>
                      <span className="font-semibold text-amber-400">{metrics.lowStockCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Health</span>
                      <span className="font-semibold text-card-foreground">{(metrics.inventoryHealth ?? 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 h-1.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.inventoryHealth ?? 100}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-[rgb(var(--color-primary-rgb))] rounded-full"
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>

          {/* Customer Base */}
          <motion.div {...fadeUp(0.55)} className="flex flex-col h-full">
            <div className={CARD}>
              <CardHeader icon={Users} title="Customer Base" subtitle={`${metrics.activeServices} active services`} />
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <p className="text-3xl font-bold text-card-foreground mb-4">{metrics.totalCustomers}</p>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Rev / Customer</span>
                      <span className="font-semibold text-card-foreground">
                        ₱{(metrics.avgRevenuePerCustomer ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Repeat Rate</span>
                      <span className="font-semibold text-green-400">{repeatRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active Services</span>
                      <span className="font-semibold text-blue-400">{metrics.activeServices}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 h-1.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, repeatRate)}%` }}
                    transition={{ delay: 0.65, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-[rgb(var(--color-primary-rgb))] rounded-full"
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>

          {/* Performance */}
          <motion.div {...fadeUp(0.6)} className="flex flex-col h-full">
            <div className={CARD}>
              <CardHeader icon={TrendingUp} title="Performance" subtitle="Jobs & revenue metrics" />
              <div className="flex-1 p-5 flex flex-col justify-between">
                <div>
                  <p className="text-3xl font-bold text-card-foreground mb-4">{completionRate.toFixed(0)}%</p>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Jobs Completed</span>
                      <span className="font-semibold text-green-400">{metrics.totalJobsCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Job Time</span>
                      <span className="font-semibold text-card-foreground">{avgJobTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue Growth</span>
                      <span className={`font-semibold ${weeklyRevenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {weeklyRevenueChange >= 0 ? '+' : ''}{weeklyRevenueChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 h-1.5 bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-[rgb(var(--color-primary-rgb))] rounded-full"
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--color-primary-rgb))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

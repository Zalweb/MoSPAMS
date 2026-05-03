import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Package,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import RevenueLineChart from '@/features/dashboard/components/RevenueLineChart';
import ServiceStatusDonut from '@/features/dashboard/components/ServiceStatusDonut';
import PaymentPieChart from '@/features/dashboard/components/PaymentPieChart';
import TopServicesBar from '@/features/dashboard/components/TopServicesBar';
import { useData } from '@/shared/contexts/DataContext';
import { useAdminStats } from '@/shared/hooks/useAdminStats';

const CURRENCY_PREFIX = '₱';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    delay,
    duration: 0.5,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
});

export default function Overview() {
  const { parts, services, transactions } = useData();
  const { data: statsData, loading: statsLoading, error: statsError } = useAdminStats();

  const lowStock = parts.filter((part) => part.stock <= part.minStock);
  const pendingServices = services.filter((service) => service.status === 'Pending').length;
  const ongoingServices = services.filter((service) => service.status === 'Ongoing').length;
  const completedServices = services.filter((service) => service.status === 'Completed').length;

  const today = new Date().toISOString().split('T')[0];
  const todaySales = transactions.filter((transaction) => transaction.createdAt.startsWith(today));
  const todayRevenue = todaySales.reduce((sum, transaction) => sum + transaction.total, 0);

  const stats = [
    {
      label: 'Total Parts',
      value: parts.length.toString(),
      icon: Package,
      accent: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      trend: `${lowStock.length} low stock`,
    },
    {
      label: "Today's Revenue",
      value: `${CURRENCY_PREFIX}${todayRevenue.toLocaleString()}`,
      icon: ShoppingCart,
      accent: 'bg-green-500/10 text-green-400 border border-green-500/20',
      trend: `${todaySales.length} transactions`,
    },
    {
      label: 'Pending Jobs',
      value: pendingServices.toString(),
      icon: Clock,
      accent: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      trend: `${ongoingServices} ongoing`,
    },
    {
      label: 'Completed',
      value: completedServices.toString(),
      icon: CheckCircle2,
      accent: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      trend: 'this month',
    },
  ];

  const revenueData = statsData?.charts.revenue_by_day ?? [];
  const statusData = statsData?.charts.service_status ?? null;
  const paymentData = statsData?.charts.payment_methods ?? null;
  const topServices = statsData?.charts.top_service_types ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
        <p className="text-sm text-zinc-500 mt-1">Overview of your shop's performance</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            {...fadeUp(index * 0.06 + 0.05)}
            className="group relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-300 cursor-default overflow-hidden"
            whileHover={{ y: -2 }}
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.accent} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-white tracking-tight leading-none">{stat.value}</p>
              <p className="text-sm font-medium text-zinc-400 mt-1">{stat.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{stat.trend}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <motion.div
          {...fadeUp(0.3)}
          className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold text-white">Low Stock Alerts</h3>
            </div>
            {lowStock.length > 0 && (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                {lowStock.length} items
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-800/50">
            {lowStock.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-zinc-500">All stock levels are healthy</p>
              </div>
            ) : (
              lowStock.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{part.name}</p>
                    <p className="text-xs text-zinc-500">{part.category}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-bold ${part.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {part.stock} left
                    </p>
                    <p className="text-xs text-zinc-600">min {part.minStock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Services */}
        <motion.div
          {...fadeUp(0.35)}
          className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-zinc-400" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-white">Recent Services</h3>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {services.slice(0, 5).map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{service.customerName}</p>
                  <p className="text-xs text-zinc-500">
                    {service.motorcycleModel} - {service.serviceType}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ml-3 ${
                  service.status === 'Completed'
                    ? 'bg-green-500/10 text-green-400'
                    : service.status === 'Ongoing'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Service Pipeline */}
      <motion.div
        {...fadeUp(0.4)}
        className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
      >
        <h3 className="text-sm font-semibold text-white mb-5">Service Pipeline</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', count: pendingServices, icon: Clock, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
            { label: 'Ongoing', count: ongoingServices, icon: Wrench, color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
            { label: 'Completed', count: completedServices, icon: CheckCircle2, color: 'bg-green-500/10 text-green-400 border border-green-500/20' },
          ].map((item) => (
            <motion.div
              key={item.label}
              className={`flex items-center gap-4 p-4 rounded-xl ${item.color}`}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <item.icon className="w-6 h-6" strokeWidth={1.5} />
              <div>
                <p className="text-2xl font-bold text-white leading-none">{item.count}</p>
                <p className="text-xs font-medium text-zinc-400 mt-1">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Analytics Section */}
      <motion.div {...fadeUp(0.45)}>
        <h3 className="text-sm font-semibold text-white mb-5">Analytics</h3>
        <div className="space-y-6">
          <RevenueLineChart data={revenueData} loading={statsLoading} error={statsError} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ServiceStatusDonut data={statusData} loading={statsLoading} error={statsError} />
            <PaymentPieChart data={paymentData} loading={statsLoading} error={statsError} />
          </div>
          <TopServicesBar data={topServices} loading={statsLoading} error={statsError} />
        </div>
      </motion.div>
    </div>
  );
}
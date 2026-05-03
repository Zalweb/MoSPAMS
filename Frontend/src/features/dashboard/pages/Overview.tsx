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

const CURRENCY_PREFIX = '\u20b1';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: {
    delay,
    duration: 0.45,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
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
      accent: 'bg-[#EFF6FF] text-[#3B82F6]',
      trend: `${lowStock.length} low stock`,
    },
    {
      label: "Today's Revenue",
      value: `${CURRENCY_PREFIX}${todayRevenue.toLocaleString()}`,
      icon: ShoppingCart,
      accent: 'bg-[#ECFDF5] text-[#10B981]',
      trend: `${todaySales.length} transactions`,
    },
    {
      label: 'Pending Jobs',
      value: pendingServices.toString(),
      icon: Clock,
      accent: 'bg-[#FFFBEB] text-[#F59E0B]',
      trend: `${ongoingServices} ongoing`,
    },
    {
      label: 'Completed',
      value: completedServices.toString(),
      icon: CheckCircle2,
      accent: 'bg-[#F5F3FF] text-[#8B5CF6]',
      trend: 'this month',
    },
  ];

  const revenueData = statsData?.charts.revenue_by_day ?? [];
  const statusData = statsData?.charts.service_status ?? null;
  const paymentData = statsData?.charts.payment_methods ?? null;
  const topServices = statsData?.charts.top_service_types ?? [];

  return (
    <div>
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Dashboard</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Overview of your shop's performance</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            {...fadeUp(index * 0.06 + 0.05)}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#F5F5F4] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#E7E5E4] transition-all duration-300 group cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-[10px] ${stat.accent} flex items-center justify-center`}>
                <stat.icon className="w-[14px] h-[14px]" strokeWidth={2} />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E7E5E4] group-hover:text-[#D6D3D1] transition-colors" />
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">{stat.value}</p>
            <p className="text-[12px] font-medium text-[#A8A29E] mt-1">{stat.label}</p>
            <p className="text-[11px] text-[#D6D3D1] mt-0.5">{stat.trend}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          {...fadeUp(0.3)}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" strokeWidth={2} />
              <h3 className="text-[13px] font-semibold text-[#1C1917]">Low Stock</h3>
            </div>
            {lowStock.length > 0 && (
              <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#FFFBEB] px-2 py-[3px] rounded-full">
                {lowStock.length} items
              </span>
            )}
          </div>
          <div className="divide-y divide-[#FAFAF9]">
            {lowStock.length === 0 ? (
              <p className="text-[12px] text-[#D6D3D1] py-10 text-center">All stock levels are healthy</p>
            ) : (
              lowStock.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-medium text-[#44403C]">{part.name}</p>
                    <p className="text-[11px] text-[#D6D3D1]">{part.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13px] font-bold ${part.stock === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {part.stock} left
                    </p>
                    <p className="text-[10px] text-[#D6D3D1]">min {part.minStock}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          {...fadeUp(0.35)}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={2} />
            <h3 className="text-[13px] font-semibold text-[#1C1917]">Recent Services</h3>
          </div>
          <div className="divide-y divide-[#FAFAF9]">
            {services.slice(0, 5).map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAF9]/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#44403C] truncate">{service.customerName}</p>
                  <p className="text-[11px] text-[#D6D3D1]">
                    {service.motorcycleModel} - {service.serviceType}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-[3px] rounded-full ml-3 ${
                  service.status === 'Completed'
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : service.status === 'Ongoing'
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'bg-[#FFFBEB] text-[#D97706]'
                }`}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          {...fadeUp(0.4)}
          className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 lg:col-span-2"
        >
          <h3 className="text-[13px] font-semibold text-[#1C1917] mb-5">Service Pipeline</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending', count: pendingServices, icon: Clock, color: 'bg-[#FFFBEB] text-[#D97706]' },
              { label: 'Ongoing', count: ongoingServices, icon: Wrench, color: 'bg-[#EFF6FF] text-[#2563EB]' },
              { label: 'Completed', count: completedServices, icon: CheckCircle2, color: 'bg-[#ECFDF5] text-[#059669]' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center gap-3.5 p-4 rounded-2xl ${item.color} bg-opacity-30`}>
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                <div>
                  <p className="text-[22px] font-bold text-[#1C1917] leading-none">{item.count}</p>
                  <p className="text-[11px] font-medium opacity-60 mt-0.5">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div {...fadeUp(0.45)} className="mt-8">
        <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Analytics</h3>
        <div className="grid grid-cols-1 gap-4">
          <RevenueLineChart data={revenueData} loading={statsLoading} error={statsError} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ServiceStatusDonut data={statusData} loading={statsLoading} error={statsError} />
            <PaymentPieChart data={paymentData} loading={statsLoading} error={statsError} />
          </div>
          <TopServicesBar data={topServices} loading={statsLoading} error={statsError} />
        </div>
      </motion.div>
    </div>
  );
}

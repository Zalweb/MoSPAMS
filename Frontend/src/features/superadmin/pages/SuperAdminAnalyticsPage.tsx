import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CreditCard,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getPlatformAnalytics, type PlatformAnalytics } from '@/features/superadmin/lib/api';

const CURRENCY_PREFIX = '\u20b1';

export default function SuperAdminAnalyticsPage() {
  const [period] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPlatformAnalytics(period)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.4 } },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Platform overview, revenue tracking, and shop health metrics.</p>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Total Active Shops"
              value={loading ? '...' : (data?.shopHealth.active ?? 0).toString()}
              subtitle="Active subscriptions running"
              trend="+12% this month"
              trendUp={true}
              icon={Building2}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="MRR (Monthly Recurring)"
              value={loading ? '...' : `${CURRENCY_PREFIX}${(data?.summary.subscriptionRevenue ?? 0).toLocaleString()}`}
              subtitle="Subscription revenue"
              trend="+8.4% vs last month"
              trendUp={true}
              icon={CreditCard}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Total Shops"
              value={loading ? '...' : (data?.summary.totalShops ?? 0).toString()}
              subtitle="All registered shops"
              trend="+4.2% growth"
              trendUp={true}
              icon={Store}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Pending Approvals"
              value={loading ? '...' : (data?.shopHealth.pending ?? 0).toString()}
              subtitle="Awaiting activation"
              trend="Requires attention"
              trendUp={false}
              icon={AlertCircle}
              warning
            />
          </motion.div>
        </div>

        {/* MAIN REVENUE CHART */}
        <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-900/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
           
           <div className="flex items-center justify-between mb-6">
             <div>
               <h2 className="text-[16px] font-bold text-white">Platform Revenue Trends</h2>
               <p className="text-[13px] text-zinc-400 mt-1">Monthly Recurring Revenue growth</p>
             </div>
           </div>

           <div className="h-[300px] w-full flex items-center justify-center">
              <div className="text-center text-zinc-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No revenue data available</p>
                <p className="text-xs mt-1">Data will appear once shops start generating revenue</p>
              </div>
           </div>
        </motion.div>

        {/* TWO COLUMN SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,2fr] gap-6">
          {/* Left: Subscription Dist */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6 flex flex-col">
            <h2 className="text-[16px] font-bold text-white mb-2">Subscription Distribution</h2>
            <p className="text-[13px] text-zinc-400 mb-6">Current active plans across all shops</p>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
              <div className="text-center text-zinc-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No subscription data</p>
                <p className="text-xs mt-1">Distribution will show once shops subscribe</p>
              </div>
            </div>
          </motion.div>

          {/* Right: Recent Shops */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[16px] font-bold text-white">Recently Registered Shops</h2>
                <p className="text-[13px] text-zinc-400 mt-1">Latest onboarded tenants on the platform</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">Shop Name</th>
                    <th className="pb-3 px-4 font-medium">Owner</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium">Plan</th>
                    <th className="pb-3 pl-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Store className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                      <p className="text-zinc-400 text-sm">No shops registered yet</p>
                      <p className="text-zinc-500 text-xs mt-1">New shops will appear here</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM ROW: Shop Health & Platform Activity & Top Shops */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shop Health Metrics */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6">
             <h2 className="text-[16px] font-bold text-white mb-1">Shop Health</h2>
             <p className="text-[12px] text-zinc-400 mb-6">Status overview from API</p>

             <div className="space-y-5">
               <HealthBar label="Active Subscriptions" count={data?.shopHealth.active ?? 0} total={data?.summary.totalShops ?? 1} color="bg-emerald-500" />
               <HealthBar label="Pending Approval" count={data?.shopHealth.pending ?? 0} total={data?.summary.totalShops ?? 1} color="bg-amber-500" />
               <HealthBar label="Suspended" count={data?.shopHealth.suspended ?? 0} total={data?.summary.totalShops ?? 1} color="bg-red-500" />
               <HealthBar label="Inactive" count={data?.shopHealth.inactive ?? 0} total={data?.summary.totalShops ?? 1} color="bg-zinc-600" />
             </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6 lg:col-span-1">
             <h2 className="text-[16px] font-bold text-white mb-1">Activity Log</h2>
             <p className="text-[12px] text-zinc-400 mb-6">Recent system-wide actions</p>

             <div className="py-12 text-center">
               <Activity className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
               <p className="text-zinc-400 text-sm">No activity logs yet</p>
               <p className="text-zinc-500 text-xs mt-1">Platform actions will be logged here</p>
             </div>
          </motion.div>

          {/* Top Shops */}
          <motion.div variants={itemVariants} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 sm:p-6 lg:col-span-1">
             <h2 className="text-[16px] font-bold text-white mb-1">Top Performers</h2>
             <p className="text-[12px] text-zinc-400 mb-6">Leading shops by revenue</p>

             <div className="py-12 text-center">
               <TrendingUp className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
               <p className="text-zinc-400 text-sm">No shop performance data</p>
               <p className="text-zinc-500 text-xs mt-1">Top shops will be ranked here</p>
             </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  warning,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  trendUp: boolean;
  icon: any;
  warning?: boolean;
}) {
  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-5 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 opacity-20 transition-opacity group-hover:opacity-40 ${warning ? 'bg-amber-500' : 'bg-zinc-500'}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-[12px] font-medium text-zinc-400">{title}</h3>
          <p className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          warning 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
            : 'bg-zinc-800 border-zinc-700 text-white'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-[11px] relative z-10">
        <span className="text-zinc-500 truncate mr-2">{subtitle}</span>
        <span className={`flex items-center shrink-0 font-medium ${
          warning ? 'text-amber-500' : trendUp ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {trend}
        </span>
      </div>
    </div>
  );
}

function HealthBar({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] font-medium text-zinc-300">{label}</span>
        <span className="text-[12px] font-bold text-white">{count} <span className="text-zinc-500 font-normal">({percentage}%)</span></span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Settings2,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { getPlatformAnalytics, type PlatformAnalytics } from '@/features/superadmin/lib/api';

const CURRENCY_PREFIX = '\u20b1';

// MOCK DATA for unimplemented endpoints
const MOCK_REVENUE_TREND = [
  { month: 'Jan', revenue: 12000 },
  { month: 'Feb', revenue: 15000 },
  { month: 'Mar', revenue: 14000 },
  { month: 'Apr', revenue: 22000 },
  { month: 'May', revenue: 28000 },
  { month: 'Jun', revenue: 35000 },
  { month: 'Jul', revenue: 38000 },
  { month: 'Aug', revenue: 42000 },
  { month: 'Sep', revenue: 48000 },
  { month: 'Oct', revenue: 55000 },
  { month: 'Nov', revenue: 62000 },
  { month: 'Dec', revenue: 75000 },
];

const MOCK_SUBSCRIPTION_DIST = [
  { name: 'Basic', value: 45, color: '#14b8a6' },
  { name: 'Premium', value: 35, color: '#0ea5e9' },
  { name: 'Enterprise', value: 20, color: '#8b5cf6' },
];

const MOCK_RECENT_SHOPS = [
  { id: 1, name: 'Metro Moto Parts', owner: 'Juan Dela Cruz', status: 'Active', type: 'Premium', date: '2026-05-01' },
  { id: 2, name: 'Speedway Customs', owner: 'Maria Santos', status: 'Trial', type: 'Basic', date: '2026-04-28' },
  { id: 3, name: 'Apex Garage', owner: 'Carlos Mendoza', status: 'Pending', type: 'Enterprise', date: '2026-04-25' },
  { id: 4, name: 'GearShift Trading', owner: 'Liza Reyes', status: 'Active', type: 'Basic', date: '2026-04-20' },
  { id: 5, name: 'BrakePoint Auto', owner: 'Mark Bautista', status: 'Suspended', type: 'Premium', date: '2026-04-15' },
];

const MOCK_ACTIVITY_LOG = [
  { id: 1, action: 'Shop Approved', target: 'Metro Moto Parts', time: '10 mins ago', type: 'success' },
  { id: 2, action: 'Subscription Upgrade', target: 'Speedway Customs (Premium)', time: '2 hours ago', type: 'info' },
  { id: 3, action: 'Payment Overdue', target: 'BrakePoint Auto', time: '5 hours ago', type: 'warning' },
  { id: 4, action: 'Admin Login', target: 'SuperAdmin (IP: 192.168.1.1)', time: '1 day ago', type: 'neutral' },
  { id: 5, action: 'Shop Suspended', target: 'BrakePoint Auto', time: '2 days ago', type: 'danger' },
];

const MOCK_TOP_SHOPS = [
  { rank: 1, name: 'Velocity Motors', users: 145, revenue: 125000 },
  { rank: 2, name: 'Elite Riders', users: 98, revenue: 85000 },
  { rank: 3, name: 'MotoWorld Hub', users: 76, revenue: 62000 },
];

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
      {/* Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-[13px] sm:text-[14px] text-slate-400 mt-1">Platform overview, revenue tracking, and shop health metrics.</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <QuickActionButton icon={Store} label="Create Shop" primary />
          <QuickActionButton icon={AlertCircle} label="Overdue Payments" />
          <QuickActionButton icon={CheckCircle2} label="Pending Approvals" />
          <QuickActionButton icon={Wrench} label="Maintenance Mode" />
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
              value={`${CURRENCY_PREFIX}${(data?.summary.subscriptionRevenue ?? 45000).toLocaleString()}`}
              subtitle="Subscription revenue"
              trend="+8.4% vs last month"
              trendUp={true}
              icon={CreditCard}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <KpiCard
              title="Total Platform Users"
              value="12,450"
              subtitle="Aggregate users across shops"
              trend="+4.2% active today"
              trendUp={true}
              icon={Users}
              mockBadge
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
        <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
           
           <div className="flex items-center justify-between mb-6">
             <div>
               <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
                 Platform Revenue Trends
                 <AwaitingIntegrationBadge />
               </h2>
               <p className="text-[13px] text-slate-400 mt-1">Monthly Recurring Revenue over the last 12 months</p>
             </div>
             
             <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
               {['6M', '12M', 'YTD', 'ALL'].map((tab) => (
                 <button
                   key={tab}
                   className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                     tab === '12M' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
                   }`}
                 >
                   {tab}
                 </button>
               ))}
             </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_REVENUE_TREND} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${CURRENCY_PREFIX}${val/1000}k`} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1f2937', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#14b8a6' }}
                    formatter={(value: number) => [`${CURRENCY_PREFIX}${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </motion.div>

        {/* TWO COLUMN SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,2fr] gap-6">
          {/* Left: Subscription Dist */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6 flex flex-col">
            <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-2">
              Subscription Distribution
              <AwaitingIntegrationBadge />
            </h2>
            <p className="text-[13px] text-slate-400 mb-6">Current active plans across all shops</p>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={MOCK_SUBSCRIPTION_DIST}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {MOCK_SUBSCRIPTION_DIST.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#1f2937', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <span className="text-2xl font-bold text-white">100</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Shops</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {MOCK_SUBSCRIPTION_DIST.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Recent Shops */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
                  Recently Registered Shops
                  <AwaitingIntegrationBadge />
                </h2>
                <p className="text-[13px] text-slate-400 mt-1">Latest onboarded tenants on the platform</p>
              </div>
              <button className="text-[12px] font-medium text-teal-500 hover:text-teal-400 flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">Shop Name</th>
                    <th className="pb-3 px-4 font-medium">Owner</th>
                    <th className="pb-3 px-4 font-medium">Status</th>
                    <th className="pb-3 px-4 font-medium">Plan</th>
                    <th className="pb-3 pl-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {MOCK_RECENT_SHOPS.map((shop) => (
                    <tr key={shop.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 pr-4 font-medium text-slate-200 group-hover:text-white transition-colors">{shop.name}</td>
                      <td className="py-4 px-4 text-slate-400">{shop.owner}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={shop.status} />
                      </td>
                      <td className="py-4 px-4 text-slate-400">{shop.type}</td>
                      <td className="py-4 pl-4 text-slate-500 text-right">{shop.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM ROW: Shop Health & Platform Activity & Top Shops */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shop Health Metrics */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6">
             <h2 className="text-[16px] font-bold text-white mb-1">Shop Health</h2>
             <p className="text-[12px] text-slate-400 mb-6">Status overview from existing API</p>

             <div className="space-y-5">
               <HealthBar label="Active Subscriptions" count={data?.shopHealth.active ?? 0} total={data?.summary.totalShops ?? 1} color="bg-emerald-500" />
               <HealthBar label="Trial Accounts" count={15} total={data?.summary.totalShops ?? 1} color="bg-teal-400" mock />
               <HealthBar label="Pending Approval" count={data?.shopHealth.pending ?? 0} total={data?.summary.totalShops ?? 1} color="bg-amber-500" />
               <HealthBar label="Suspended" count={data?.shopHealth.suspended ?? 0} total={data?.summary.totalShops ?? 1} color="bg-red-500" />
             </div>

             <div className="mt-8 pt-6 border-t border-white/5">
                <h3 className="text-[13px] font-semibold text-white flex items-center gap-2 mb-4">
                  Churn Rate <AwaitingIntegrationBadge />
                </h3>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold text-white">2.4%</span>
                  <span className="text-[12px] text-emerald-400 flex items-center pb-1"><TrendingDown className="w-3 h-3 mr-1"/> -0.5% vs last mo</span>
                </div>
             </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6 lg:col-span-1">
             <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-1">
               Activity Log
               <AwaitingIntegrationBadge />
             </h2>
             <p className="text-[12px] text-slate-400 mb-6">Recent system-wide actions</p>

             <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {MOCK_ACTIVITY_LOG.map((log) => (
                 <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-[#111111] text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {log.type === 'info' && <Activity className="w-3 h-3 text-sky-500" />}
                      {log.type === 'warning' && <AlertCircle className="w-3 h-3 text-amber-500" />}
                      {log.type === 'danger' && <XCircle className="w-3 h-3 text-red-500" />}
                      {log.type === 'neutral' && <Settings2 className="w-3 h-3 text-slate-400" />}
                    </div>
                    
                    {/* Content */}
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-white/5 bg-white/[0.02] ml-4 md:ml-0 mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200 text-[12px]">{log.action}</span>
                        <span className="text-[10px] text-slate-500">{log.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{log.target}</p>
                    </div>
                 </div>
               ))}
             </div>
          </motion.div>

          {/* Top Shops */}
          <motion.div variants={itemVariants} className="bg-[#111111] rounded-2xl border border-white/5 p-5 sm:p-6 lg:col-span-1">
             <h2 className="text-[16px] font-bold text-white flex items-center gap-2 mb-1">
               Top Performers
               <AwaitingIntegrationBadge />
             </h2>
             <p className="text-[12px] text-slate-400 mb-6">Leading shops by revenue</p>

             <div className="space-y-4">
               {MOCK_TOP_SHOPS.map((shop) => (
                 <div key={shop.rank} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.02] transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 font-bold text-[12px] shrink-0">
                      #{shop.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{shop.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{shop.users} active users</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[13px] font-bold text-teal-400">{CURRENCY_PREFIX}{(shop.revenue / 1000).toFixed(1)}k</span>
                    </div>
                 </div>
               ))}
             </div>
             
             <button className="w-full mt-6 py-2 rounded-lg border border-white/10 text-[12px] font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
               View Full Leaderboard
             </button>
          </motion.div>
        </div>
      </motion.div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUBCOMPONENTS
// ----------------------------------------------------------------------

function QuickActionButton({ icon: Icon, label, primary }: { icon: any, label: string, primary?: boolean }) {
  return (
    <button className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap border shrink-0 ${
      primary 
        ? 'bg-teal-500 text-black border-teal-400 hover:bg-teal-400 hover:shadow-[0_0_15px_rgba(20,184,166,0.4)]' 
        : 'bg-[#111111] text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20'
    }`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
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
  mockBadge
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  trendUp: boolean;
  icon: any;
  warning?: boolean;
  mockBadge?: boolean;
}) {
  return (
    <div className="bg-[#111111] rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 opacity-20 transition-opacity group-hover:opacity-40 ${warning ? 'bg-amber-500' : 'bg-teal-500'}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-[12px] font-medium text-slate-400 flex items-center gap-2">
            {title}
            {mockBadge && <AwaitingIntegrationBadge />}
          </h3>
          <p className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          warning 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-500'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-[11px] relative z-10">
        <span className="text-slate-500 truncate mr-2">{subtitle}</span>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Trial: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  
  const style = styles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${style}`}>
      {status}
    </span>
  );
}

function HealthBar({ label, count, total, color, mock }: { label: string, count: number, total: number, color: string, mock?: boolean }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] font-medium text-slate-300 flex items-center gap-1.5">
          {label}
          {mock && <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" title="Mock Data"></span>}
        </span>
        <span className="text-[12px] font-bold text-white">{count} <span className="text-slate-500 font-normal">({percentage}%)</span></span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AwaitingIntegrationBadge() {
  return (
    <span 
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 cursor-help ml-1"
      title="Awaiting Backend Integration - Mock Data Shown"
    >
      <AlertCircle className="w-2.5 h-2.5" />
    </span>
  );
}

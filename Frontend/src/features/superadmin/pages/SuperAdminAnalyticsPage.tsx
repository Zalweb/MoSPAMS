import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  CreditCard,
  Store,
  TrendingUp,
  TrendingDown,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { getPlatformAnalytics, type PlatformAnalytics } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

const CURRENCY = '₱';

const PLAN_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.35 } },
};

export default function SuperAdminAnalyticsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPlatformAnalytics(period)
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) toast.error('Failed to load analytics'); console.error(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalRevenue   = data?.summary.totalRevenue ?? 0;
  const subRevenue     = data?.summary.subscriptionRevenue ?? 0;
  const totalShops     = data?.summary.totalShops ?? 0;
  const activeShops    = data?.shopHealth.active ?? 0;
  const pendingShops   = data?.shopHealth.pending ?? 0;
  const activePercent  = totalShops > 0 ? Math.round((activeShops / totalShops) * 100) : 0;

  // Format revenue chart data
  const chartData = (data?.revenueChart ?? []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: d.amount,
  }));
  const hasRevenue = chartData.some(d => d.amount > 0);

  // Growth chart data
  const growthData = (data?.growth?.series ?? []).map(s => ({
    label: s.label,
    count: s.count,
  }));

  // Subscription distribution totals
  const subTotal = (data?.subscriptionDistribution ?? []).reduce((s, p) => s + p.count, 0);

  const periodLabel = period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight">Platform Analytics</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Overview of revenue, shop health, and growth across all tenants.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 self-start sm:self-auto">
          {(['day', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                period === p
                  ? 'bg-white text-black dark:bg-zinc-200 dark:text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* ── KPI STAT CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={`${CURRENCY}${totalRevenue.toLocaleString()}`}
            sub={`Subscription: ${CURRENCY}${subRevenue.toLocaleString()}`}
            trend={`${periodLabel}`}
            icon={CreditCard}
            accent="violet"
            loading={loading}
          />
          <StatCard
            title="Active Shops"
            value={activeShops}
            sub={`${activePercent}% of all shops`}
            trend={`${totalShops} total registered`}
            icon={Building2}
            accent="emerald"
            loading={loading}
          />
          <StatCard
            title="Total Shops"
            value={totalShops}
            sub={`${data?.growth?.total ?? 0} new shops`}
            trend={`${periodLabel.toLowerCase()}`}
            icon={Store}
            accent="blue"
            loading={loading}
          />
          <StatCard
            title="Pending Approvals"
            value={pendingShops}
            sub="Awaiting activation"
            trend={`${data?.shopHealth.suspended ?? 0} suspended`}
            icon={AlertCircle}
            accent={pendingShops > 0 ? 'amber' : 'emerald'}
            loading={loading}
          />
        </div>

        {/* ── REVENUE TREND + GROWTH CHART ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">

          {/* Area chart */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-72 h-72 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Revenue Trend</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Daily subscription income — last 30 days</p>
              </div>
              {hasRevenue && (
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    {CURRENCY}{totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Total this period</p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-[260px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-border border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : !hasRevenue ? (
              <EmptyChart
                icon={<CreditCard className="w-10 h-10 text-muted-foreground/40" />}
                text="No revenue data yet"
                sub="Revenue will appear once shops generate income"
              />
            ) : (
              <div className="h-[260px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="superRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${CURRENCY}${(v / 1000).toFixed(0)}k`}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                      formatter={(v: number) => [`${CURRENCY}${v.toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#superRevGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Shop Growth bar chart */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="mb-5">
              <h2 className="text-[15px] font-bold text-foreground">Shop Growth</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">New registrations — {periodLabel.toLowerCase()}</p>
            </div>

            {loading ? (
              <div className="h-[260px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-border border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : growthData.length === 0 || growthData.every(d => d.count === 0) ? (
              <EmptyChart
                icon={<Store className="w-10 h-10 text-muted-foreground/40" />}
                text="No growth data yet"
                sub="Shop registrations will appear here"
              />
            ) : (
              <div className="h-[260px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        padding: '10px 14px',
                      }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                      formatter={(v: number) => [v, 'New shops']}
                    />
                    <Bar dataKey="count" fill="url(#growthGrad)" radius={[4, 4, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── SUBSCRIPTION DIST + RECENT SHOPS ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr,2fr] gap-6">

          {/* Subscription Distribution — "Session by Plan" style */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 flex flex-col shadow-sm">
            <h2 className="text-[15px] font-bold text-foreground mb-1">Plan Distribution</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Active subscriptions by plan</p>

            {loading ? (
              <div className="space-y-4 flex-1">
                {[1,2,3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
                    <div className="h-2 w-full bg-muted/30 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (data?.subscriptionDistribution?.length ?? 0) === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyChart
                  icon={<Building2 className="w-10 h-10 text-muted-foreground/40" />}
                  text="No subscriptions yet"
                  sub="Distribution shows once shops subscribe"
                />
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                {data?.subscriptionDistribution?.map((plan, idx) => {
                  const pct = subTotal > 0 ? Math.round((plan.count / subTotal) * 100) : 0;
                  const color = PLAN_COLORS[idx % PLAN_COLORS.length];
                  return (
                    <div key={plan.planCode}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[13px] font-medium text-foreground">{plan.planName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-foreground">{plan.count}</span>
                          <span className="text-[11px] font-semibold text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Total active subscriptions</span>
                  <span className="text-[14px] font-bold text-foreground">{subTotal}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Recently Registered Shops — "Transaction History" style */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Recently Registered Shops</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Latest tenants onboarded to the platform</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-xl bg-muted/50 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-36 bg-muted/50 rounded animate-pulse" />
                      <div className="h-2.5 w-24 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (data?.recentShops?.length ?? 0) === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <EmptyChart
                  icon={<Store className="w-10 h-10 text-muted-foreground/40" />}
                  text="No shops registered yet"
                  sub="New shops will appear here"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="pb-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-4">Shop</th>
                      <th className="pb-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 hidden sm:table-cell">Subdomain</th>
                      <th className="pb-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4">Status</th>
                      <th className="pb-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-4">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentShops?.map((shop) => {
                      const initials = shop.shopName
                        .split(' ')
                        .slice(0, 2)
                        .map(w => w[0])
                        .join('')
                        .toUpperCase();
                      const isActive = shop.status?.toLowerCase() === 'active';
                      return (
                        <tr key={shop.shopId} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-bold text-violet-400">{initials}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground truncate">{shop.shopName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[12px] text-muted-foreground hidden sm:table-cell">
                            {shop.subdomain}.mospams.shop
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              {shop.status}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-right text-[12px] text-muted-foreground">
                            {shop.createdAt
                              ? new Date(shop.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── SHOP HEALTH + ACTIVITY LOG ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Shop Health */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <h2 className="text-[15px] font-bold text-foreground mb-1">Shop Health Overview</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Status breakdown across all {totalShops} shops</p>
            <div className="space-y-4">
              <HealthBar label="Active" count={data?.shopHealth.active ?? 0} total={totalShops} color="bg-emerald-500" loading={loading} />
              <HealthBar label="Pending Approval" count={data?.shopHealth.pending ?? 0} total={totalShops} color="bg-amber-500" loading={loading} />
              <HealthBar label="Suspended" count={data?.shopHealth.suspended ?? 0} total={totalShops} color="bg-rose-500" loading={loading} />
              <HealthBar label="Inactive" count={data?.shopHealth.inactive ?? 0} total={totalShops} color="bg-zinc-500" loading={loading} />
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={item} className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Recent Activity</h2>
                <p className="text-[12px] text-muted-foreground">Platform-wide actions</p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-muted/50 mt-1.5 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-48 bg-muted/50 rounded animate-pulse" />
                      <div className="h-2.5 w-32 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (data?.recentActivity?.length ?? 0) === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-[13px] text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0 max-h-[280px] overflow-y-auto pr-1">
                {data?.recentActivity?.map((entry) => (
                  <div key={entry.logId} className="flex gap-3 py-3 border-b border-border/30 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground/80 truncate">{entry.action}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {entry.userName}
                        {entry.shopName ? ` · ${entry.shopName}` : ''}
                        {entry.timestamp
                          ? ` · ${new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

      </motion.div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

type Accent = 'violet' | 'emerald' | 'blue' | 'amber' | 'rose' | 'cyan';

const ACCENT_MAP: Record<Accent, { border: string; icon: string; glow: string }> = {
  violet: { border: 'border-l-violet-500', icon: 'bg-violet-500/10 border-violet-500/20 text-violet-400', glow: 'bg-violet-500/10' },
  emerald: { border: 'border-l-emerald-500', icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', glow: 'bg-emerald-500/10' },
  blue: { border: 'border-l-blue-500', icon: 'bg-blue-500/10 border-blue-500/20 text-blue-400', glow: 'bg-blue-500/10' },
  amber: { border: 'border-l-amber-500', icon: 'bg-amber-500/10 border-amber-500/20 text-amber-400', glow: 'bg-amber-500/10' },
  rose: { border: 'border-l-rose-500', icon: 'bg-rose-500/10 border-rose-500/20 text-rose-400', glow: 'bg-rose-500/10' },
  cyan: { border: 'border-l-cyan-500', icon: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', glow: 'bg-cyan-500/10' },
};

function StatCard({
  title, value, sub, trend, icon: Icon, accent, loading,
}: {
  title: string;
  value: string | number;
  sub: string;
  trend?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  loading?: boolean;
}) {
  const a = ACCENT_MAP[accent];
  return (
    <motion.div variants={item}>
      <div className={`bg-card rounded-2xl border border-border border-l-[3px] ${a.border} p-5 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`}>
        <div className={`absolute top-0 right-0 w-32 h-32 ${a.glow} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50`} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${a.icon}`}>
              <Icon className="w-5 h-5" />
            </div>
            {!loading && typeof value === 'number' && value > 0 && (
              <TrendingUp className="w-4 h-4 text-emerald-400 opacity-60" />
            )}
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-28 bg-muted/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground tracking-tight mb-1">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="text-[12px] text-muted-foreground">{sub}</p>
                {trend && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{trend}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HealthBar({
  label, count, total, color, loading,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  loading?: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        {loading ? (
          <div className="h-3 w-16 bg-muted/40 rounded animate-pulse" />
        ) : (
          <span className="text-[12px] font-bold text-foreground">
            {count} <span className="text-muted-foreground font-normal text-[11px]">({pct}%)</span>
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}

function EmptyChart({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center py-8 text-center gap-2">
      {icon}
      <p className="text-[13px] text-muted-foreground font-medium">{text}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

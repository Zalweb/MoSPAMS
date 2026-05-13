import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, CheckCircle2, Zap, DollarSign, Star,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

interface DashboardData {
  mechanic_name: string;
  stats: {
    today_jobs: number;
    in_progress: number;
    completed_this_month: number;
    today_labor_revenue: number;
    avg_rating: number | null;
    rating_breakdown: Record<string, number>;
  };
}

interface ChartPoint {
  label: string;
  labor: number;
  jobs: number;
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year',  label: 'Year' },
  { key: 'all',   label: 'All' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1 bg-muted/50 dark:bg-zinc-800/60 p-1 rounded-xl w-fit">
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            value === p.key
              ? 'bg-card dark:bg-zinc-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function MechanicDashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [period, setPeriod]       = useState<Period>('week');
  const [loadingStats, setLoadingStats]   = useState(true);
  const [loadingChart, setLoadingChart]   = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiGet<DashboardData>('/api/mechanic/dashboard');
        setData(res);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoadingStats(false);
      }
    })();
  }, []);

  const fetchChart = useCallback(async (p: Period) => {
    setLoadingChart(true);
    try {
      const res = await apiGet<{ data: ChartPoint[] }>(`/api/mechanic/chart-data?period=${p}`);
      setChartPoints(res.data);
    } catch {
      toast.error('Failed to load chart data');
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => { void fetchChart(period); }, [period, fetchChart]);

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const stats = data.stats;
  const totalRatings = Object.values(stats.rating_breakdown).reduce((s, c) => s + c, 0);

  const statCards = [
    {
      label: "Today's Jobs",
      value: stats.today_jobs,
      icon: Wrench,
      gradient: 'from-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
    },
    {
      label: 'In Progress',
      value: stats.in_progress,
      icon: Zap,
      gradient: 'from-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
    },
    {
      label: 'Done This Month',
      value: stats.completed_this_month,
      icon: CheckCircle2,
      gradient: 'from-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400',
    },
    {
      label: "Today's Revenue",
      value: `₱${stats.today_labor_revenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div {...fadeUp(0)}>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome back, {data.mechanic_name.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Here's your work overview for today.</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} to-transparent border ${card.border} rounded-2xl p-5`}
          >
            <div className="mb-3">
              <card.icon className={`w-5 h-5 ${card.text}`} strokeWidth={2} />
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Rating Breakdown */}
      <motion.div {...fadeUp(0.1)} className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-foreground">Customer Ratings</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalRatings} rating{totalRatings !== 1 ? 's' : ''} total
              {stats.avg_rating !== null && ` · ${stats.avg_rating.toFixed(1)} avg`}
            </p>
          </div>
          {stats.avg_rating !== null && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className="w-4 h-4"
                  fill={s <= Math.round(stats.avg_rating!) ? '#FBBF24' : 'none'}
                  color={s <= Math.round(stats.avg_rating!) ? '#FBBF24' : '#6b7280'}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = stats.rating_breakdown[star] ?? 0;
            const pct   = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-10 shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2 bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Period selector shared by both charts */}
      <motion.div {...fadeUp(0.15)} className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Analytics</p>
        <PeriodTabs value={period} onChange={setPeriod} />
      </motion.div>

      {/* Labor Revenue Chart */}
      <motion.div {...fadeUp(0.18)} className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
        <p className="font-bold text-foreground mb-1">Labor Revenue</p>
        <p className="text-xs text-muted-foreground mb-5">Total labor income from completed jobs</p>
        {loadingChart ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="laborGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v.toLocaleString()}`} width={60} />
              <Tooltip
                contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [`₱${v.toLocaleString()}`, 'Labor']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Area type="monotone" dataKey="labor" stroke="#10b981" strokeWidth={2} fill="url(#laborGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Jobs Completed Chart */}
      <motion.div {...fadeUp(0.21)} className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
        <p className="font-bold text-foreground mb-1">Jobs Completed</p>
        <p className="text-xs text-muted-foreground mb-5">Number of jobs finished per period</p>
        {loadingChart ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
              <Tooltip
                contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [v, 'Jobs']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="jobs" fill="url(#jobsGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

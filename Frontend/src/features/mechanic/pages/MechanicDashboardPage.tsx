import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wrench, CheckCircle2, DollarSign, Star } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';
import { useSvgBrandColors } from '@/shared/hooks/useSvgBrandColors';

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
    <div className="flex gap-1 bg-muted/50 dark:bg-zinc-800/60 p-1 rounded-xl w-fit mt-4">
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

function RatingBreakdown({ breakdown, avg }: { breakdown: Record<string, number>; avg: number | null }) {
  const total = Object.values(breakdown).reduce((s, c) => s + c, 0);
  return (
    <div className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-foreground">Customer Ratings</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} rating{total !== 1 ? 's' : ''} total
            {avg !== null && ` · ${avg.toFixed(1)} avg`}
          </p>
        </div>
        {avg !== null && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className="w-4 h-4"
                fill={s <= Math.round(avg) ? '#FBBF24' : 'none'}
                color={s <= Math.round(avg) ? '#FBBF24' : '#6b7280'}
                strokeWidth={1.5}
              />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2.5">
        {[5, 4, 3, 2, 1].map(star => {
          const count = breakdown[star] ?? 0;
          const pct   = total > 0 ? (count / total) * 100 : 0;
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
    </div>
  );
}

export default function MechanicDashboardPage() {
  const [data, setData]             = useState<DashboardData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [laborPeriod, setLaborPeriod] = useState<Period>('week');
  const [jobsPeriod, setJobsPeriod]   = useState<Period>('week');
  const [laborPoints, setLaborPoints] = useState<ChartPoint[]>([]);
  const [jobsPoints, setJobsPoints]   = useState<ChartPoint[]>([]);
  const [loadingLabor, setLoadingLabor] = useState(true);
  const [loadingJobs, setLoadingJobs]   = useState(true);
  const svgColors = useSvgBrandColors();

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

  const fetchLabor = useCallback(async (p: Period) => {
    setLoadingLabor(true);
    try {
      const res = await apiGet<{ data: ChartPoint[] }>(`/api/mechanic/chart-data?period=${p}`);
      setLaborPoints(res.data);
    } catch {
      toast.error('Failed to load revenue chart');
    } finally {
      setLoadingLabor(false);
    }
  }, []);

  const fetchJobs = useCallback(async (p: Period) => {
    setLoadingJobs(true);
    try {
      const res = await apiGet<{ data: ChartPoint[] }>(`/api/mechanic/chart-data?period=${p}`);
      setJobsPoints(res.data);
    } catch {
      toast.error('Failed to load jobs chart');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { void fetchLabor(laborPeriod); }, [laborPeriod, fetchLabor]);
  useEffect(() => { void fetchJobs(jobsPeriod); },  [jobsPeriod, fetchJobs]);

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[rgb(var(--color-primary-rgb))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const stats = data.stats;

  const statCards = [
    { label: "Today's Jobs",    value: stats.today_jobs,                                                      icon: Wrench       },
    { label: 'Done This Month', value: stats.completed_this_month,                                            icon: CheckCircle2 },
    { label: "Today's Revenue", value: `₱${stats.today_labor_revenue.toLocaleString()}`,                      icon: DollarSign   },
    { label: 'Customer Rating', value: stats.avg_rating !== null ? `${stats.avg_rating.toFixed(1)} ★` : 'N/A', icon: Star        },
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
        {statCards.map((card, i) => (
          i === 0 ? (
            <div key={card.label} className="rounded-2xl p-5 brand-card" style={{ background: 'var(--brand-gradient)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 border border-white/20 mb-3">
                <card.icon className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
              <p className="text-xs font-medium text-white/75 mt-1">{card.label}</p>
            </div>
          ) : (
            <div key={card.label} className="bg-card border border-border/50 rounded-2xl p-5 brand-card shadow-soft">
              <div className="brand-icon-box w-10 h-10 rounded-xl flex items-center justify-center mb-3">
                <card.icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-1">{card.label}</p>
            </div>
          )
        ))}
      </motion.div>

      {/* Rating Breakdown */}
      <motion.div {...fadeUp(0.1)}>
        <RatingBreakdown breakdown={stats.rating_breakdown} avg={stats.avg_rating} />
      </motion.div>

      {/* Charts */}
      <motion.div {...fadeUp(0.15)}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Analytics</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Labor Revenue Chart */}
          <div className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
            <p className="font-bold text-foreground">Labor Revenue</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total labor income from completed jobs</p>
            <PeriodTabs value={laborPeriod} onChange={setLaborPeriod} />
            <div className="mt-4">
              {loadingLabor ? (
                <div className="h-44 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[rgb(var(--color-primary-rgb))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={176}>
                  <AreaChart data={laborPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="laborGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={svgColors.primary}   stopOpacity={0.35} />
                        <stop offset="95%" stopColor={svgColors.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v.toLocaleString()}`} width={58} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`₱${v.toLocaleString()}`, 'Labor']}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Area type="monotone" dataKey="labor" stroke={svgColors.primary} strokeWidth={2} fill="url(#laborGrad)" dot={false} activeDot={{ r: 4, fill: svgColors.primary }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Jobs Completed Chart */}
          <div className="bg-card dark:bg-zinc-900/40 border border-border/50 rounded-2xl p-6">
            <p className="font-bold text-foreground">Jobs Completed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Number of jobs finished per period</p>
            <PeriodTabs value={jobsPeriod} onChange={setJobsPeriod} />
            <div className="mt-4">
              {loadingJobs ? (
                <div className="h-44 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[rgb(var(--color-secondary-rgb))] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={176}>
                  <BarChart data={jobsPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={svgColors.primary}   stopOpacity={0.95} />
                        <stop offset="100%" stopColor={svgColors.secondary} stopOpacity={0.75} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [v, 'Jobs']}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Bar dataKey="jobs" fill="url(#jobsGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

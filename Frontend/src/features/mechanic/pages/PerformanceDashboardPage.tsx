import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Star } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

interface PerformanceData {
 current_period: {
 jobs_completed_this_month: number;
 avg_time_per_job_hours: number;
 customer_rating: number | null;
 };
 rating_breakdown: Record<string, number>;
 trend_last_three_months: Array<{
 month: string;
 jobs_completed: number;
 }>;
}

export default function PerformanceDashboardPage() {
 const [data, setData] = useState<PerformanceData | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 void (async () => {
 try {
 const response = await apiGet<PerformanceData>('/api/mechanic/performance');
 setData(response);
 } catch {
 toast.error('Failed to load performance data');
 } finally {
 setLoading(false);
 }
 })();
 }, []);

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center">
 <div className="w-8 h-8 border-2 border-[rgb(var(--color-primary-rgb))] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
 <p className="text-muted-foreground text-sm">Loading performance data...</p>
 </div>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-12">
 <p className="text-muted-foreground">Unable to load performance data</p>
 </div>
 );
 }

 const breakdown = data.rating_breakdown ?? {};
 const totalRatings = Object.values(breakdown).reduce((s, c) => s + c, 0);
 const maxJobs = Math.max(...data.trend_last_three_months.map(m => m.jobs_completed), 1);

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-foreground">Performance Dashboard</h2>
 <p className="text-sm text-muted-foreground mt-1">Your work metrics and trends</p>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[
 {
 label: 'Jobs Completed (This Month)',
 value: <p className="text-3xl font-bold text-foreground mt-2">{data.current_period.jobs_completed_this_month}</p>,
 icon: <TrendingUp className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-rgb))' }} />,
 },
 {
 label: 'Avg Time per Job',
 value: <><p className="text-3xl font-bold text-foreground mt-2">{data.current_period.avg_time_per_job_hours.toFixed(1)}</p><p className="text-xs text-muted-foreground mt-1">hours</p></>,
 icon: <Clock className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-rgb))' }} />,
 },
 {
 label: 'Customer Rating',
 value: <div className="flex items-center gap-2 mt-2"><p className="text-3xl font-bold text-foreground">{data.current_period.customer_rating?.toFixed(1) ?? 'N/A'}</p>{data.current_period.customer_rating && <span className="text-amber-400 text-2xl">★</span>}</div>,
 icon: <Star className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-rgb))' }} />,
 },
 ].map(card => (
 <div
 key={card.label}
 className="border rounded-xl p-6 brand-card"
 style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
 >
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
 {card.value}
 </div>
 <div className="p-3 rounded-lg shrink-0" style={{ background: 'var(--brand-surface)' }}>
 {card.icon}
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Rating Breakdown */}
 <div className=" bg-white/[0.03] dark:bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
 <div className="flex items-center justify-between mb-5">
 <div>
 <h3 className="text-lg font-semibold text-foreground">Customer Ratings</h3>
 <p className="text-sm text-muted-foreground mt-0.5">
 {totalRatings} rating{totalRatings !== 1 ? 's' : ''} all-time
 {data.current_period.customer_rating !== null && ` · ${data.current_period.customer_rating.toFixed(1)} avg this month`}
 </p>
 </div>
 {totalRatings > 0 && (
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map(s => {
 const avg = totalRatings > 0
 ? Object.entries(breakdown).reduce((sum, [k, v]) => sum + Number(k) * v, 0) / totalRatings
 : 0;
 return (
 <Star
 key={s}
 className="w-4 h-4"
 fill={s <= Math.round(avg) ? '#FBBF24' : 'none'}
 color={s <= Math.round(avg) ? '#FBBF24' : '#6b7280'}
 strokeWidth={1.5}
 />
 );
 })}
 </div>
 )}
 </div>
 <div className="space-y-2.5">
 {[5, 4, 3, 2, 1].map(star => {
 const count = breakdown[star] ?? 0;
 const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
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

 {/* Trend Chart */}
 <div className=" bg-white/[0.03] dark:bg-white/[0.02] border border-white/[0.08] rounded-xl p-6">
 <h3 className="text-lg font-semibold text-foreground mb-6">Jobs Trend (Last 3 Months)</h3>
 <div className="flex items-end gap-6 h-52 px-4">
 {data.trend_last_three_months.map((month, idx) => (
 <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2">
 <span className="text-sm font-bold text-foreground">{month.jobs_completed}</span>
 <div
 className="w-full rounded-t-lg transition-all duration-500"
 style={{
 height: `${(month.jobs_completed / maxJobs) * 160}px`,
 minHeight: '4px',
 background: 'linear-gradient(to top, var(--brand-primary), var(--brand-primary-light))',
 }}
 title={`${month.jobs_completed} jobs`}
 />
 <span className="text-xs text-muted-foreground">{month.month}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="border border-border rounded-lg p-4 bg-secondary/30 dark:bg-secondary/10">
 <p className="text-sm text-muted-foreground">
 Performance metrics update daily. Customer ratings appear after they rate your completed work.
 </p>
 </div>
 </div>
 );
}

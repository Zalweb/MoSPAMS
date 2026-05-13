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
  trend_last_three_months: Array<{
    month: string;
    jobs_completed: number;
  }>;
}

export default function PerformanceDashboardPage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        setLoading(true);
        const response = await apiGet<PerformanceData>('/api/mechanic/performance');
        setData(response);
      } catch (error) {
        console.error('Failed to load performance data', error);
        toast.error('Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };
    void fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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

  const maxJobs = Math.max(...data.trend_last_three_months.map(m => m.jobs_completed), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Performance Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Your work metrics and trends</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Jobs Completed (This Month)</p>
              <p className="text-3xl font-bold text-foreground mt-2">{data.current_period.jobs_completed_this_month}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Time per Job</p>
              <p className="text-3xl font-bold text-foreground mt-2">{data.current_period.avg_time_per_job_hours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">hours</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer Rating</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-3xl font-bold text-foreground">
                  {data.current_period.customer_rating?.toFixed(1) ?? 'N/A'}
                </p>
                {data.current_period.customer_rating && (
                  <span className="text-yellow-400 text-2xl">★</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg shrink-0">
              <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Jobs Trend (Last 3 Months)</h3>
        <div className="flex items-end gap-6 h-52 px-4">
          {data.trend_last_three_months.map((month, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2">
              <span className="text-sm font-bold text-foreground">{month.jobs_completed}</span>
              <div
                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all duration-500"
                style={{ height: `${(month.jobs_completed / maxJobs) * 160}px`, minHeight: '4px' }}
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

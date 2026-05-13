import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Wrench, CheckCircle2, BarChart3, Package, Star,
  ArrowRight, Clock, Zap
} from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { toast } from 'sonner';

interface DashboardData {
  mechanic_name: string;
  stats: {
    active_jobs: number;
    in_progress: number;
    completed_this_month: number;
    pending_parts: number;
    avg_rating: number | null;
  };
  recent_jobs: {
    id: string;
    customerName: string;
    motorcycleModel: string;
    serviceType: string;
    statusCode: string;
    statusName: string;
    updatedAt: string;
  }[];
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  booked_confirmed: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  in_progress:      { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  work_done:        { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  completed:        { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function MechanicDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet<DashboardData>('/api/mechanic/dashboard');
        setData(res);
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Active Jobs',
      value: data.stats.active_jobs,
      icon: Wrench,
      color: 'from-violet-500/10 to-transparent border-violet-500/20 text-violet-400',
    },
    {
      label: 'In Progress',
      value: data.stats.in_progress,
      icon: Zap,
      color: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
    },
    {
      label: 'Done This Month',
      value: data.stats.completed_this_month,
      icon: CheckCircle2,
      color: 'from-green-500/10 to-transparent border-green-500/20 text-green-400',
    },
    {
      label: 'Pending Parts',
      value: data.stats.pending_parts,
      icon: Package,
      color: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
    },
  ];

  const quickActions = [
    {
      label: 'Assigned Jobs',
      description: 'View and manage your current jobs',
      icon: Wrench,
      to: '/dashboard/mechanic/jobs',
      accent: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    },
    {
      label: 'Job History',
      description: 'Review your completed work',
      icon: CheckCircle2,
      to: '/dashboard/mechanic/history',
      accent: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    {
      label: 'Performance',
      description: 'Track your metrics and ratings',
      icon: BarChart3,
      to: '/dashboard/mechanic/performance',
      accent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div {...fadeUp(0)}>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome back, {data.mechanic_name.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your work today.</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} border rounded-2xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-5 h-5" strokeWidth={2} />
              {stat.label === 'Average Rating' && data.stats.avg_rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Rating Banner (if available) */}
      {data.stats.avg_rating !== null && (
        <motion.div
          {...fadeUp(0.1)}
          className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20"
        >
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-5 h-5"
                fill={s <= Math.round(data.stats.avg_rating!) ? '#FBBF24' : 'none'}
                color={s <= Math.round(data.stats.avg_rating!) ? '#FBBF24' : 'currentColor'}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {data.stats.avg_rating.toFixed(1)} — Your average customer rating
            </p>
            <p className="text-xs text-muted-foreground">Based on all completed jobs</p>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.15)}>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="group text-left p-5 rounded-2xl border border-border/50 bg-card dark:bg-zinc-900/40 hover:border-[rgb(var(--color-primary-rgb))]/30 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl border ${action.accent} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <action.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent Jobs */}
      {data.recent_jobs.length > 0 && (
        <motion.div {...fadeUp(0.2)}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</p>
            <button
              onClick={() => navigate('/dashboard/mechanic/jobs')}
              className="text-xs font-semibold text-[rgb(var(--color-primary-rgb))] hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {data.recent_jobs.map((job) => {
              const style = STATUS_STYLE[job.statusCode] ?? STATUS_STYLE.completed;
              return (
                <button
                  key={job.id}
                  onClick={() => navigate(`/dashboard/mechanic/jobs/${job.id}`)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card dark:bg-zinc-900/40 hover:border-[rgb(var(--color-primary-rgb))]/30 transition-all duration-300 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                    <Clock className={`w-4 h-4 ${style.text}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{job.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{job.motorcycleModel} — {job.serviceType}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}>
                      {job.statusName}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(job.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
